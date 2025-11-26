import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const isOnLoginPage = req.nextUrl.pathname.startsWith("/login");
    const isOnRegisterPage = req.nextUrl.pathname.startsWith("/register");
    const isOnApiRoute = req.nextUrl.pathname.startsWith("/api");

    if (isOnApiRoute || req.nextUrl.pathname.includes(".")) {
        return;
    }

    if (isOnLoginPage || isOnRegisterPage) {
        if (isLoggedIn) {
            return NextResponse.redirect(new URL("/", req.url));
        }
        return;
    }

    if (!isLoggedIn) {
        return NextResponse.redirect(new URL("/login", req.url));
    }
});

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
