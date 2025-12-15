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

        if (!email) {
            return NextResponse.json({ error: "Email required for sync" }, { status: 400 });
        }

        console.log(`[Auth Sync] Syncing user: ${email} (Firebase UID: ${uid})`);

        // 1. Check if Account exists (Already linked)
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
            // Already linked, update User profile if needed
            const user = await prisma.user.update({
                where: { id: existingAccount.userId },
                data: {
                    name: name,
                    image: picture,
                    // email: email, // Don't update email blindly if it changes? For now, trust Firebase.
                }
            });
            return NextResponse.json({ success: true, user, status: "linked" });
        }

        // 2. Check if User exists by Email (Legacy User or created via other provider)
        const existingUserByEmail = await prisma.user.findUnique({ where: { email: email } });

        if (existingUserByEmail) {
            console.log(`[Auth Sync] Linking existing user ${existingUserByEmail.id} to new Firebase Account`);

            // Link existing user to new Firebase Account
            await prisma.account.create({
                data: {
                    userId: existingUserByEmail.id,
                    provider: "firebase",
                    providerAccountId: uid,
                }
            });

            // Update user profile
            const user = await prisma.user.update({
                where: { id: existingUserByEmail.id },
                data: { name: name, image: picture }
            });

            return NextResponse.json({ success: true, user, status: "merged" });
        }

        // 3. New User (Create User + Account)
        console.log(`[Auth Sync] Creating new user for ${email}`);

        const newUser = await prisma.user.create({
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
                        plan: "FREE"
                    }
                }
            }
        });

        return NextResponse.json({ success: true, user: newUser, status: "created" });

    } catch (e: any) {
        console.error("Sync Error:", e);
        if (e.code === 'P2002') {
            return NextResponse.json({ error: "Conflict during sync" }, { status: 409 });
        }
        return NextResponse.json({ error: "Sync Failed", details: e.message }, { status: 500 });
    }
}
