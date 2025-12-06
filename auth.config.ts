import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async signIn({ account, profile }) {
            if (account?.provider === "line") {
                if (!profile?.email) {
                    return "/login?error=EmailRequired";
                }
            }
            return true;
        },
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;

            const isDashboard = nextUrl.pathname.startsWith("/dashboard");
            const isAuthPage = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register");
            const isRoot = nextUrl.pathname === "/";
            const isPublicApi = nextUrl.pathname.startsWith("/api");
            const isPublicDoc = nextUrl.pathname.startsWith("/privacy") || nextUrl.pathname.startsWith("/terms") || nextUrl.pathname.includes("manifest");
            const isTrial = nextUrl.pathname.startsWith("/trial");

            // 1. Always allow API
            if (isPublicApi) return true;

            // 2. Logged-in Users on Auth Pages or Root -> Redirect to Dashboard
            if (isLoggedIn && (isAuthPage || isRoot)) {
                return Response.redirect(new URL("/dashboard", nextUrl));
            }

            // 3. Protected Routes (Dashboard) -> Require Login
            if (isDashboard) {
                return isLoggedIn;
            }

            // 4. Default Public Routes (Root, Login, Register, Terms, Trial) -> Allow
            if (isRoot || isAuthPage || isPublicDoc || isTrial) {
                return true;
            }

            // 5. Default block everything else
            return isLoggedIn;
        },
    },
    providers: [], // Providers are configured in auth.ts
} satisfies NextAuthConfig;
