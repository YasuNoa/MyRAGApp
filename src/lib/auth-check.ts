import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/src/lib/firebase-admin";
import { prisma } from "@/src/lib/prisma";

export async function verifyAuth(req: NextRequest) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.split("Bearer ")[1];

    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        const firebaseUid = decodedToken.uid;

        // 1. Resolve DB User ID via Account Table
        // We look for an account linked to this Firebase UID
        const account = await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider: "firebase",
                    providerAccountId: firebaseUid
                }
            },
            include: { user: true }
        });

        if (account && account.user) {
            return {
                uid: account.user.id, // RETURN THE DB USER ID (CUID)
                email: account.user.email,
                name: account.user.name,
                picture: account.user.image
            };
        }

        // 2. Fallback (If not found in Account table)
        // This might happen if sync hasn't run yet. 
        // We will return the Firebase UID, but the backend might not find data for it.
        // Or we could try to look up by email here as a fail-safe?
        // For now, let's just return the Firebase info but log a warning.
        // Ideally, clients should call /api/auth/sync before /api/ask.
        console.warn(`[verifyAuth] Account not linked for Firebase UID: ${firebaseUid}`);

        // Fallback: Check by email to see if we can resolve it on the fly? 
        // No, keep it simple. If not linked, treat as temporary or new.
        // The API using this might create a transient context.
        return {
            uid: firebaseUid, // No choice but to return this. Backend might treat it as a new/unknown ID.
            email: decodedToken.email,
            name: decodedToken.name,
            picture: decodedToken.picture
        };

    } catch (e) {
        console.error("Auth Verification Failed:", e);
        return null;
    }
}
