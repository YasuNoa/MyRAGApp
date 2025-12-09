import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
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
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { plan, interval } = await req.json(); // interval: "month" | "year" | "one_time"

        // Determine Change Type (Upgrade vs Downgrade)
        const currentSub = await prisma.userSubscription.findUnique({
            where: { userId: session.user.id },
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

        const checkoutSession = await stripe.checkout.sessions.create({
            mode: mode,
            customer_email: session.user.email || undefined,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.AUTH_URL}/dashboard?checkout_success=true&type=${changeType}`,
            cancel_url: `${process.env.AUTH_URL}/pricing`,
            metadata: {
                userId: session.user.id,
                plan: plan,
                type: mode === "payment" ? "ticket" : "subscription",
            },
            allow_promotion_codes: true, // Enable Coupon Codes
        });


        return NextResponse.json({ url: checkoutSession.url });

    } catch (error: any) {
        console.error("Stripe Checkout Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
