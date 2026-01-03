import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/src/lib/firebase-admin";
import { prisma } from "@/src/lib/prisma";

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];

    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;

        // Find user by Account (Firebase UID)
        const account = await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider: "firebase",
                    providerAccountId: uid
                }
            },
            include: { user: { include: { subscription: true } } }
        });

        if (!account || !account.user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const user = account.user;

        const userWithPlan = {
            ...user,
            plan: user.subscription?.plan ?? "FREE",
            usage: {
                dailyVoiceCount: user.subscription?.dailyVoiceCount ?? 0,
                monthlyVoiceMinutes: user.subscription?.monthlyVoiceMinutes ?? 0,
                purchasedVoiceBalance: user.subscription?.purchasedVoiceBalance ?? 0
            }
        };

        return NextResponse.json({ user: userWithPlan });

    } catch (e: any) {
        console.error("Auth Me Error:", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
