import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/src/lib/auth-check";
import { cookies } from "next/headers"; // Import cookies
import { prisma } from "@/src/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    // apiVersion: "2024-11-20.acacia", // Use default installed version
});

// Price IDs from Environment Variables
const PRICE_IDS = {
    STANDARD_MONTHLY: process.env.STRIPE_PRICE_ID_STANDARD_MONTHLY,
    STANDARD_YEARLY: process.env.STRIPE_PRICE_ID_STANDARD_YEARLY,
    PREMIUM_MONTHLY: process.env.STRIPE_PRICE_ID_PREMIUM_MONTHLY,
    PREMIUM_YEARLY: process.env.STRIPE_PRICE_ID_PREMIUM_YEARLY,
    TICKET_90: process.env.STRIPE_PRICE_ID_TICKET_90,
};

export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { plan, interval } = await req.json(); // interval: "month" | "year" | "one_time"

        // Determine Change Type (Upgrade vs Downgrade)
        const currentSub = await prisma.userSubscription.findUnique({
            where: { userId: user.uid },
            select: { plan: true }
        });

        const PLAN_LEVELS: { [key: string]: number } = { "FREE": 0, "STANDARD": 1, "PREMIUM": 2 };
        const currentLevel = PLAN_LEVELS[currentSub?.plan || "FREE"];
        const newLevel = PLAN_LEVELS[plan] || 0;

        let changeType = "upgrade"; // Default (Celebration)

        if (plan === "TICKET") {
            changeType = "upgrade";
        } else if (newLevel < currentLevel) {
            changeType = "downgrade";
        }

        let priceId = "";
        if (plan === "STANDARD") {
            priceId = interval === "year" ? PRICE_IDS.STANDARD_YEARLY! : PRICE_IDS.STANDARD_MONTHLY!;
        } else if (plan === "PREMIUM") {
            priceId = interval === "year" ? PRICE_IDS.PREMIUM_YEARLY! : PRICE_IDS.PREMIUM_MONTHLY!;
        } else if (plan === "TICKET" && interval === "one_time") {
            priceId = PRICE_IDS.TICKET_90!;
        }

        if (!priceId) {
            return NextResponse.json({ error: "Invalid plan or interval configuration" }, { status: 400 });
        }

        const mode = plan === "TICKET" ? "payment" : "subscription";

        // Check for Referral Cookie
        const cookieStore = await cookies();
        const referralSource = cookieStore.get("referral_source");
        const isReferral = !!referralSource;

        let subscriptionData = undefined;
        if (mode === "subscription" && plan === "STANDARD" && isReferral) {
            // Launch Campaign: 30 days
            // Standard: 7 days
            const TRIAL_DAYS = 30; // Set to 30 for Launch Campaign
            console.log(`Applying ${TRIAL_DAYS}-day trial for referred user ${user.uid} (Ref: ${referralSource?.value})`);
            subscriptionData = {
                trial_period_days: TRIAL_DAYS,
                metadata: {
                    referralSource: referralSource?.value || "unknown"
                }
            };
        }

        const checkoutSession = await stripe.checkout.sessions.create({
            mode: mode,
            customer_email: user.email || undefined,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.AUTH_URL}/dashboard?checkout_success=true&type=${changeType}`,
            cancel_url: `${process.env.AUTH_URL}/pricing`,
            metadata: {
                userId: user.uid,
                plan: plan,
                type: mode === "payment" ? "ticket" : "subscription",
                isReferral: isReferral ? "true" : "false"
            },
            subscription_data: subscriptionData, // Add trial data here
            allow_promotion_codes: true, // Enable Coupon Codes
        });


        return NextResponse.json({ url: checkoutSession.url });

    } catch (error: any) {
        console.error("Stripe Checkout Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
