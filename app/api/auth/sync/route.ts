import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/src/lib/firebase-admin";
import { prisma } from "@/src/lib/prisma";

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];

    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;
        const email = decodedToken.email;
        const name = decodedToken.name || "User";
        const picture = decodedToken.picture;

        // Try to parse body for internalId (Optional)
        // Valid for cases where client already knows its User ID (e.g. re-sync)
        let internalId: string | undefined = undefined;
        try {
            const body = await req.json();
            if (body && body.internalId) {
                internalId = body.internalId;
            }
        } catch (e) {
            // Body might be empty or not JSON, ignore
        }

        if (!email) {
            return NextResponse.json({ error: "Email required for sync" }, { status: 400 });
        }

        console.log(`[Auth Sync] Syncing user: ${email} (Firebase UID: ${uid}). Internal ID provided: ${internalId}`);

        let user = null;
        let status = "";

        // 1. Check by Internal ID (Highest Priority)
        // If the client claims to know their User ID (internalId), verify it exists.
        if (internalId) {
            user = await prisma.user.findUnique({ where: { id: internalId } });
            if (user) {
                console.log(`[Auth Sync] User found by Internal ID: ${user.id}`);
                status = "found_by_internal_id";
            }
        }

        // 2. Check if Account exists (Already linked) - If not found by Internal ID
        if (!user) {
            const existingAccount = await prisma.account.findUnique({
                where: {
                    provider_providerAccountId: {
                        provider: "firebase",
                        providerAccountId: uid
                    }
                },
                include: { user: true }
            });

            if (existingAccount) {
                user = existingAccount.user; // Get the User linked to this Account
                console.log(`[Auth Sync] User found by Provider ID: ${user.id}`);
                status = "linked";
            }
        }

        // 3. Check if User exists by Email - If still not found
        // Use this to link "Legacy Users" or users created via other providers (e.g. Line)
        if (!user) {
            const existingUserByEmail = await prisma.user.findUnique({ where: { email: email } });
            if (existingUserByEmail) {
                console.log(`[Auth Sync] Linking existing user ${existingUserByEmail.id} to new Firebase Account`);
                user = existingUserByEmail;
                status = "merged";

                // Link Account
                // Create a new Account record linking this Firebase UID to the existing User
                await prisma.account.create({
                    data: {
                        userId: user.id,
                        provider: "firebase",
                        providerAccountId: uid,
                    }
                });
            }
        }

        // 4. Update Profile (if user found) or Create New User
        if (user) {
            // Update User Profile with latest info from Firebase
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    name: name,
                    image: picture,
                    // Note: We generally don't update email here to avoid security risks 
                    // unless we are sure about email verification status.
                },
                include: { subscription: true }
            });
        } else {
            // Create New User & Account
            console.log(`[Auth Sync] Creating new user for ${email}`);
            status = "created";

            user = await prisma.user.create({
                data: {
                    name: name,
                    email: email,
                    image: picture,
                    accounts: {
                        create: {
                            provider: "firebase",
                            providerAccountId: uid,
                        }
                    },
                    subscription: {
                        create: {
                            plan: "FREE" // Default plan
                        }
                    }
                },
                include: { subscription: true }
            });
        }

        // Flatten plan and usage into the user object for client convenience
        const userWithPlan = {
            ...user,
            plan: user.subscription?.plan ?? "FREE",
            usage: {
                dailyVoiceCount: user.subscription?.dailyVoiceCount ?? 0,
                monthlyVoiceMinutes: user.subscription?.monthlyVoiceMinutes ?? 0,
                purchasedVoiceBalance: user.subscription?.purchasedVoiceBalance ?? 0
            }
        };

        return NextResponse.json({ success: true, user: userWithPlan, status });

    } catch (e: any) {
        console.error("Sync Error:", e);
        if (e.code === 'P2002') {
            return NextResponse.json({ error: "Conflict during sync" }, { status: 409 });
        }
        return NextResponse.json({ error: "Sync Failed", details: e.message }, { status: 500 });
    }
}
