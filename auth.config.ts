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
            const isOnLogin = nextUrl.pathname.startsWith("/login");
            const isOnRegister = nextUrl.pathname.startsWith("/register");
            const isOnApi = nextUrl.pathname.startsWith("/api");

            // API routes are always allowed (handled by their own logic if needed)
            if (isOnApi) return true;

            if (isOnLogin || isOnRegister) {
                // Already logged in, allow access (will redirect in page logic if needed)
                return true;
            }

            // Default: require login for all other pages
            return isLoggedIn;
        },
    },
    providers: [], // Providers are configured in auth.ts
} satisfies NextAuthConfig;
