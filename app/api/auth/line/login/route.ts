import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
    const client_id = process.env.AUTH_LINE_ID;
    const redirect_uri = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL || "http://localhost:3000/api/auth/line/callback";
    const scope = "profile openid email";

    if (!client_id) {
        return NextResponse.json({ error: "LINE Client ID not configured" }, { status: 500 });
    }

    // Generate random state for CSRF protection
    const state = crypto.randomUUID();

    const url = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}&scope=${scope}`;

    const response = NextResponse.redirect(url);

    // Set state in HttpOnly cookie
    response.cookies.set("line_oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10, // 10 minutes
        path: "/",
    });

    return response;
}
