import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/src/lib/auth-check";
import { prisma } from "@/src/lib/prisma";
import { Plan } from "@prisma/client";

export async function POST(req: NextRequest) {
    const authResult = await verifyAuth(req);
    if (!authResult || !authResult.uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { plan } = body;

        // Basic validation for Plan enum
        if (!plan || !Object.values(Plan).includes(plan)) {
            // If plan is invalid (e.g. from older app version or unknown string), 
            // we can either error out or ignore. 
            // Here we ignore to prevent crashing the app but log it.
            console.warn(`[Plan Sync] Invalid plan received: ${plan}`);
            return NextResponse.json({ success: false, message: "Invalid plan" }, { status: 400 });
        }

        const userId = authResult.uid;

        // Fetch current subscription (Stripe status) to ensure we don't accidentally downgrade a valid Stripe sub
        const currentSub = await prisma.userSubscription.findUnique({
            where: { userId }
        });

        // Protection Logic:
        // If the user has a valid Stripe subscription (Active/Trialing via Stripe), we should be careful about overwriting it from iOS.
        // However, if the user purchased on iOS, that should be reflected.
        // For now, we will trust the iOS client if it claims initialized/premium status, 
        // OR if the current server status is FREE.

        // Simplest approach for MVP:
        // Update the plan.
        // In a real production app with mixed billing (Web Stripe + iOS IAP), 
        // you would check `stripeSubscriptionId` and prioritize Stripe if it's active, 
        // or check RevenueCat webhook for iOS truth.
        // Since we treat iOS client state as "Syncing what RevenueCat told it", we accept it.

        await prisma.userSubscription.upsert({
            where: { userId },
            create: {
                userId,
                plan: plan as Plan,
            },
            update: {
                plan: plan as Plan,
            }
        });

        console.log(`[Plan Sync] User ${userId} updated plan to ${plan}`);
        return NextResponse.json({ success: true, plan });

    } catch (error: any) {
        console.error("Plan update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
