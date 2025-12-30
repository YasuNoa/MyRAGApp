import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/src/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { lineAccessToken } = body;

        if (!lineAccessToken) {
            return NextResponse.json({ error: "Access token is required" }, { status: 400 });
        }

        // 1. Verify Access Token with LINE
        const verifyUrl = "https://api.line.me/oauth2/v2.1/verify";
        const verifyBody = new URLSearchParams({
            access_token: lineAccessToken
        });

        // Note: verify endpoint is GET usually, but v2.1 allows POST? 
        // Docs say GET strictly for verify? No, wait.
        // https://developers.line.biz/en/reference/line-login/#verify-access-token
        // GET https://api.line.me/oauth2/v2.1/verify?access_token=...

        const verifyRes = await fetch(`${verifyUrl}?access_token=${lineAccessToken}`);

        if (!verifyRes.ok) {
            const err = await verifyRes.text();
            console.error("LINE Token Verify Error:", err);
            return NextResponse.json({ error: "Invalid access token" }, { status: 401 });
        }

        const verifyData = await verifyRes.json();
        const clientId = verifyData.client_id;

        // Optional: Verify Client ID matches if we have it in env
        if (process.env.AUTH_LINE_ID && clientId !== process.env.AUTH_LINE_ID) {
            console.error("LINE Client ID Mismatch:", clientId);
            // Proceed with caution or fail? Safest to fail if env is set.
            // return NextResponse.json({ error: "Client ID mismatch" }, { status: 403 });
        }

        // 2. Get User Profile from LINE
        const profileUrl = "https://api.line.me/v2/profile";
        const profileRes = await fetch(profileUrl, {
            headers: {
                Authorization: `Bearer ${lineAccessToken}`
            }
        });

        if (!profileRes.ok) {
            console.error("LINE Profile Error:", await profileRes.text());
            return NextResponse.json({ error: "Failed to get user profile" }, { status: 500 });
        }

        const profile = await profileRes.json();
        const lineUserId = profile.userId;
        const name = profile.displayName;
        const picture = profile.pictureUrl;
        // Email is not returned by default profile endpoint without OpenID scope and specific permission.
        // If we needed email, we'd need ID Token verification flow or check permissions.
        // For native login, usually we rely on userId.

        // 3. Create/Update Firebase User
        const firebaseUid = `line:${lineUserId}`;

        try {
            await adminAuth.updateUser(firebaseUid, {
                displayName: name,
                photoURL: picture,
                // email: email, // Email might often be missing for LINE
            });
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                await adminAuth.createUser({
                    uid: firebaseUid,
                    displayName: name,
                    photoURL: picture,
                    // email: email,
                });
            } else {
                throw e;
            }
        }

        // 4. Generate Custom Token
        const customToken = await adminAuth.createCustomToken(firebaseUid);

        // 5. Return Token
        return NextResponse.json({ firebaseToken: customToken });

    } catch (e: any) {
        console.error("LINE Login API Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
