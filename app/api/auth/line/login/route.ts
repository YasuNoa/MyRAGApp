import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const client_id = process.env.AUTH_LINE_ID;
    const redirect_uri = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL || "http://localhost:3000/api/auth/line/callback";
    const state = "random_state_string"; // Should be randomized for security in prod
    const scope = "profile openid email";

    if (!client_id) {
        return NextResponse.json({ error: "LINE Client ID not configured" }, { status: 500 });
    }

    const url = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}&scope=${scope}`;

    return NextResponse.redirect(url);
}
