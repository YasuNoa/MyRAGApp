import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { code: string } }) {
    const code = params.code;

    // Redirect to home/LP with a query param for UI feedback
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("invited", "true");

    const response = NextResponse.redirect(url);

    // Set cookie (valid for 30 days) to track referral source
    // This tracking cookie is used by Stripe Checkout to apply the trial.
    response.cookies.set("referral_source", code, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
        httpOnly: true, // Not accessible via JS (Secure) - but Checkout needs it? 
        // Checkout is server-side (API route), so it can read httpOnly cookies.
        sameSite: "lax",
    });

    return response;
}
