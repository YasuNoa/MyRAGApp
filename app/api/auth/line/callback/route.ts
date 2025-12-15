import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/src/lib/firebase-admin";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
        return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    try {
        // 1. Exchange code for access token
        const tokenUrl = "https://api.line.me/oauth2/v2.1/token";
        const body = new URLSearchParams({
            grant_type: "authorization_code",
            code: code,
            redirect_uri: process.env.NEXT_PUBLIC_LINE_CALLBACK_URL || "http://localhost:3000/api/auth/line/callback",
            client_id: process.env.AUTH_LINE_ID!,
            client_secret: process.env.AUTH_LINE_SECRET!,
        });

        const tokenRes = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body,
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            console.error("LINE Token Error:", err);
            return NextResponse.json({ error: "Failed to get access token from LINE" }, { status: 500 });
        }

        const tokenData = await tokenRes.json();
        const idToken = tokenData.id_token;

        // 2. Verify ID Token to get User Profile (or use access token to fetch profile)
        // Ideally we verify the signature, but for simplicity we can use LINE API to verify/decode
        const verifyUrl = "https://api.line.me/oauth2/v2.1/verify";
        const verifyBody = new URLSearchParams({
            id_token: idToken,
            client_id: process.env.AUTH_LINE_ID!,
        });

        const verifyRes = await fetch(verifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: verifyBody,
        });

        if (!verifyRes.ok) {
            console.error("LINE Verify Error:", await verifyRes.text());
            return NextResponse.json({ error: "Failed to verify ID token" }, { status: 500 });
        }

        const profile = await verifyRes.json();
        const lineUserId = profile.sub;
        const name = profile.name;
        const picture = profile.picture;
        const email = profile.email;

        // 3. Create Firebase Custom Token
        // using LINE User ID as uid prefix to ensure uniqueness
        const firebaseUid = `line:${lineUserId}`;

        // Ensure user exists or update profile in Firebase
        try {
            await adminAuth.updateUser(firebaseUid, {
                displayName: name,
                photoURL: picture,
                email: email, // Email might be undefined if user didn't grant permission
                emailVerified: true, // Trusted provider
            });
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                await adminAuth.createUser({
                    uid: firebaseUid,
                    displayName: name,
                    photoURL: picture,
                    email: email,
                    emailVerified: true,
                });
            } else {
                console.error("Firebase User Update Error:", e);
                // Proceed anyway, custom token creation might still work
            }
        }

        const customToken = await adminAuth.createCustomToken(firebaseUid);

        // 4. Redirect to Frontend with Custom Token
        // Ideally we send checks, but for MVP we redirect to a special login handler page
        const frontendCallbackUrl = `/login/callback?token=${customToken}`;
        return NextResponse.redirect(new URL(frontendCallbackUrl, req.url));

    } catch (e: any) {
        console.error("LINE Login Error:", e);
        return NextResponse.json({ error: "Internal Server Error", details: e.message }, { status: 500 });
    }
}
