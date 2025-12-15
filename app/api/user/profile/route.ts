import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/src/lib/auth-check";
import { prisma } from "@/src/lib/prisma";

// GET: Fetch User Profile, Accounts, and Subscription
export async function GET(req: NextRequest) {
    const authResult = await verifyAuth(req);
    if (!authResult || !authResult.uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: authResult.uid },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                metadata: true,
            }
        });

        const accounts = await prisma.account.findMany({
            where: { userId: authResult.uid },
            select: { provider: true }
        });

        const subscription = await prisma.userSubscription.findUnique({
            where: { userId: authResult.uid },
            select: { plan: true }
        });

        return NextResponse.json({
            user,
            providers: accounts.map(a => a.provider),
            subscription
        });

    } catch (error: any) {
        console.error("Profile fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST: Update User Profile
export async function POST(req: NextRequest) {
    const authResult = await verifyAuth(req);
    if (!authResult || !authResult.uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, aiName } = body;

        const updateData: any = {};

        if (name) updateData.name = name;

        if (aiName) {
            const currentUser = await prisma.user.findUnique({
                where: { id: authResult.uid },
                select: { metadata: true }
            });
            const currentMetadata = (currentUser?.metadata as Record<string, any>) || {};
            updateData.metadata = { ...currentMetadata, aiName };
        }

        /* 
         * Note: Email and Password updates are handled via Firebase Client SDK
         * We do not update them directly in the DB here to avoid inconsistency.
         */

        await prisma.user.update({
            where: { id: authResult.uid },
            data: updateData
        });

        return NextResponse.json({ success: true, message: "Profile updated" });

    } catch (error: any) {
        console.error("Profile update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
