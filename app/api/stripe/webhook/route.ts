import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import Stripe from "stripe";
import { headers } from "next/headers";
import { Plan } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    // apiVersion: "2024-11-20.acacia", // Use default
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
    const body = await req.text();
    const sig = (await headers()).get("stripe-signature");

    if (!WEBHOOK_SECRET || !sig) {
        console.error("Missing Webhook Secret or Signature");
        return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
    } catch (err: any) {
        console.error(`Webhook signature verification failed.`, err.message);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    console.log(`Webhook received: ${event.type}`);

    try {
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;

            const userId = session.metadata?.userId;
            const plan = session.metadata?.plan;
            const type = session.metadata?.type; // "subscription" or "ticket"

            if (!userId) {
                console.error("Missing userId in session metadata");
                return NextResponse.json({ received: true });
            }

            // --- 1. Ticket Purchase (One-time) ---
            if (type === "ticket" && plan === "TICKET") {
                console.log(`Processing Ticket Purchase for user ${userId}`);

                // Add 90 minutes to purchasedVoiceBalance
                await prisma.userSubscription.upsert({
                    where: { userId },
                    create: {
                        userId,
                        plan: "FREE",
                        purchasedVoiceBalance: 90
                    },
                    update: {
                        purchasedVoiceBalance: { increment: 90 }
                    }
                });
                console.log(`Added 90 mins to user ${userId}`);
            }
            // --- 2. Subscription Purchase (Standard/Premium) ---
            else if (type === "subscription" && session.subscription) {
                console.log(`Processing Subscription for user ${userId} to plan ${plan}`);

                // Fetch full subscription details to get period end AND status
                const sub = await stripe.subscriptions.retrieve(session.subscription as string) as any;

                let finalPlan = plan as Plan;

                // --- Status Mapping Logic ---
                if (sub.status === "trialing" && plan === "STANDARD") {
                    console.log(`Subscription ${sub.id} is in TRIAL mode. Mapping to STANDARD_TRIAL.`);
                    finalPlan = "STANDARD_TRIAL" as Plan;
                }

                await prisma.userSubscription.upsert({
                    where: { userId },
                    create: {
                        userId,
                        plan: finalPlan as Plan,
                        stripeCustomerId: session.customer as string,
                        stripeSubscriptionId: sub.id,
                        currentPeriodEnd: new Date(sub.current_period_end * 1000),
                    },
                    update: {
                        plan: finalPlan as Plan,
                        stripeCustomerId: session.customer as string,
                        stripeSubscriptionId: sub.id,
                        currentPeriodEnd: new Date(sub.current_period_end * 1000),
                    }
                });
                console.log(`Updated plan for user ${userId} to ${finalPlan}`);

                // --- 3. Referral Tracking ---
                const referralSourceId = session.metadata?.referralSource;
                if (referralSourceId && referralSourceId !== "unknown" && referralSourceId !== userId) {
                    try {
                        // Check if referral already exists to prevent duplicates
                        const existingReferral = await prisma.referral.findFirst({
                            where: { refereeId: userId }
                        });

                        if (!existingReferral) {
                            await prisma.referral.create({
                                data: {
                                    referrerId: referralSourceId,
                                    refereeId: userId,
                                    status: "PENDING", // Wait for first voice processing
                                }
                            });
                            console.log(`Referral created: ${referralSourceId} -> ${userId}`);
                        } else {
                            console.log(`Referral already exists for user ${userId}`);
                        }
                    } catch (err) {
                        console.error("Error linking referral:", err);
                    }
                }

                // TODO: Handle invoice.payment_succeeded for subscription renewals updates
                // But usually checkout.session.completed covers the initial setup.
                // You should implement invoice.payment_succeeded to keep currentPeriodEnd updated in the future.
            }
        }

        // Handle Renovals (Invoice Payment Succeeded)
        else if (event.type === "invoice.payment_succeeded") {
            const invoice = event.data.object as any; // Cast to any to avoid type errors
            if (invoice.subscription) {
                const subId = invoice.subscription as string;
                const dbSub = await prisma.userSubscription.findFirst({ where: { stripeSubscriptionId: subId } });

                if (dbSub && invoice.lines.data[0].period.end) {
                    await prisma.userSubscription.update({
                        where: { id: dbSub.id },
                        data: {
                            currentPeriodEnd: new Date(invoice.lines.data[0].period.end * 1000)
                        }
                    });
                    console.log(`Updated renewal date for sub ${subId}`);
                }
            }
        }

        // Handle Cancellations / Expirations
        else if (event.type === "customer.subscription.deleted") {
            const sub = event.data.object as any;
            const subId = sub.id;

            // Revert user to FREE plan
            const dbSub = await prisma.userSubscription.findFirst({ where: { stripeSubscriptionId: subId } });
            if (dbSub) {
                await prisma.userSubscription.update({
                    where: { id: dbSub.id },
                    data: {
                        plan: "FREE",
                        // Keep customerId maybe? Or irrelevant.
                        currentPeriodEnd: null,
                        stripeSubscriptionId: null
                    }
                });
                console.log(`Subscription ${subId} deleted. Reverted user to FREE.`);
            }
        }

        // Handle Updates (e.g. Plan Change, or Cancellation scheduled, or Trial -> Active)
        else if (event.type === "customer.subscription.updated") {
            const sub = event.data.object as any;
            const priceId = sub.items.data[0].price.id;

            // Map Price IDs to Plan Enum
            const PRICE_ID_TO_PLAN: { [key: string]: "STANDARD" | "PREMIUM" } = {
                [process.env.STRIPE_PRICE_ID_STANDARD_MONTHLY!]: "STANDARD",
                [process.env.STRIPE_PRICE_ID_STANDARD_YEARLY!]: "STANDARD",
                [process.env.STRIPE_PRICE_ID_PREMIUM_MONTHLY!]: "PREMIUM",
                [process.env.STRIPE_PRICE_ID_PREMIUM_YEARLY!]: "PREMIUM",
            };

            let newPlan = PRICE_ID_TO_PLAN[priceId];

            if (newPlan) {
                const dbSub = await prisma.userSubscription.findFirst({ where: { stripeSubscriptionId: sub.id } });

                // --- Status Mapping Logic for Updates ---
                if (sub.status === "trialing" && newPlan === "STANDARD") {
                    // Default: Map to Trial
                    let mappedPlan = "STANDARD_TRIAL";

                    // PROTECTION: If user is ALREADY STANDARD (Paid), do NOT downgrade to Trial.
                    // This happens when we extend their period via API (Referral Reward).
                    if (dbSub && dbSub.plan === "STANDARD") {
                        console.log(`User ${dbSub.userId} is already STANDARD. Maintaining STANDARD plan despite 'trialing' status (Reward Extension).`);
                        mappedPlan = "STANDARD";
                    } else {
                        console.log(`Subscription ${sub.id} updated is trialing. Setting local plan to STANDARD_TRIAL.`);
                    }

                    newPlan = mappedPlan as any;
                }

                if (dbSub) {
                    await prisma.userSubscription.update({
                        where: { id: dbSub.id },
                        data: {
                            plan: newPlan as Plan,
                            currentPeriodEnd: new Date(sub.current_period_end * 1000),
                        }
                    });
                    console.log(`Subscription ${sub.id} updated. Plan set to ${newPlan}.`);
                } else {
                    console.log(`Subscription ${sub.id} updated but not found in DB.`);
                }
            } else {
                console.log(`Subscription ${sub.id} updated but Price ID ${priceId} is not a known plan.`);
            }
        }

        // Handle Payment Failures (Optional but good for monitoring)
        else if (event.type === "invoice.payment_failed") {
            const invoice = event.data.object as any;
            const subId = invoice.subscription as string;
            console.log(`Payment failed for subscription ${subId}. Stripe will retry.`);
            // You could send an email to the user here.
        }

    } catch (e) {
        console.error("Error processing webhook logic", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}

// Disable body parsing config (Next.js 13+ App Router does this by default if we use req.text(), 
// but good to keep in mind standard body parsers interfere with webhook verification)
export const config = {
    api: {
        bodyParser: false,
    },
};
