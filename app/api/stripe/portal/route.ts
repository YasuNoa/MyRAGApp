import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/src/lib/auth-check";
import { prisma } from "@/src/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    // apiVersion: "2024-11-20.acacia", // Use default
});

export async function POST(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult || !authResult.uid) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userSub = await prisma.userSubscription.findUnique({
            where: { userId: authResult.uid },
            select: { stripeCustomerId: true }
        });

        if (!userSub || !userSub.stripeCustomerId) {
            return NextResponse.json({ error: "No billing account found" }, { status: 404 });
        }

        // Create Portal Session
        const session = await stripe.billingPortal.sessions.create({
            customer: userSub.stripeCustomerId,
            return_url: `${process.env.AUTH_URL || "http://localhost:3000"}/profile`,
        });

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error("Stripe Portal Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
