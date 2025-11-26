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
            const isOnDashboard = nextUrl.pathname.startsWith("/");
            const isOnLogin = nextUrl.pathname.startsWith("/login");
            const isOnRegister = nextUrl.pathname.startsWith("/register");

            if (isOnDashboard) {
                // ログイン画面と登録画面は誰でもアクセスOK
                if (isOnLogin || isOnRegister) return true;
                // その他のページはログイン必須
                // if (isLoggedIn) return true;
                // return false; // Redirect unauthenticated users to login page
            }
            return true;
        },
    },
    providers: [], // Providers are configured in auth.ts
} satisfies NextAuthConfig;
