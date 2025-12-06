import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import Line from "next-auth/providers/line";
import Google from "next-auth/providers/google";

import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./src/lib/prisma";

async function refreshAccessToken(token: any) {
    console.log("DEBUG: refreshAccessToken called");
    try {
        const url = "https://oauth2.googleapis.com/token";
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.AUTH_GOOGLE_ID!,
                client_secret: process.env.AUTH_GOOGLE_SECRET!,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken,
            }),
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            console.error("DEBUG: Failed to refresh token", refreshedTokens);
            throw refreshedTokens;
        }

        console.log("DEBUG: Token refreshed successfully");
        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            expiresAt: Date.now() + refreshedTokens.expires_in * 1000,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
        };
    } catch (error) {
        console.error("RefreshAccessTokenError", error);
        return {
            ...token,
            error: "RefreshAccessTokenError",
        };
    }
}


async function ensureUserPlan(userId: string) {
    try {
        const sub = await prisma.userSubscription.findUnique({ where: { userId } });
        if (!sub) {
            console.log(`Creating default FREE plan for user ${userId}`);
            await prisma.userSubscription.create({
                data: {
                    userId,
                    plan: "FREE",
                }
            });
        }
    } catch (e) {
        console.error("Error creating user plan:", e);
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    trustHost: true,
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user, account }) {
            // Initial sign in
            if (account && user) {
                console.log("DEBUG: Initial sign in. Got refresh token?", !!account.refresh_token);
                console.log("DEBUG: Provider:", account.provider);

                // Ensure user has a plan
                if (user.id) {
                    await ensureUserPlan(user.id);
                }

                const expiresIn = (account.expires_in as number) || (60 * 60 * 24 * 30); // Default 30 days for credentials

                return {
                    ...token,
                    accessToken: account.access_token,
                    expiresAt: Date.now() + (expiresIn * 1000),
                    refreshToken: account.refresh_token,
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    picture: user.image,
                    provider: account.provider, // Store provider to switch refresh logic later
                };
            }

            // Fetch latest user data from database to ensure name/email updates are reflected
            if (token.id) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string }
                    });
                    if (dbUser) {
                        token.name = dbUser.name;
                        token.email = dbUser.email;
                        token.picture = dbUser.image;
                        // Extract aiName from metadata
                        const metadata = dbUser.metadata as Record<string, any> || {};
                        token.aiName = metadata.aiName || "じぶんAI";
                    }
                } catch (error) {
                    console.error("Error fetching user in JWT callback:", error);
                }
            }

            // Return previous token if the access token has not expired yet
            if (Date.now() < (token.expiresAt as number)) {
                return token;
            }

            // If no refresh token (e.g. Credentials provider), cannot refresh.
            if (!token.refreshToken) {
                return token;
            }

            // Access token has expired, try to update it
            console.log("Token expired, refreshing...");
            return await refreshAccessToken(token);
        },
        async session({ session, token }) {
            if (token.id && session.user) {
                session.user.id = token.id as string;
                session.user.name = token.name as string;
                session.user.email = token.email as string;
                session.user.image = token.picture as string;
                session.accessToken = token.accessToken as string;
                // @ts-ignore
                session.user.aiName = token.aiName as string;
                // @ts-ignore
                session.error = token.error as string;
            }
            return session;
        },
    },
    providers: [
        Line({
            clientId: process.env.AUTH_LINE_ID,
            clientSecret: process.env.AUTH_LINE_SECRET,
            authorization: { params: { scope: "openid profile email" } },
            allowDangerousEmailAccountLinking: true,
        }),
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            authorization: {
                params: {
                    scope: "openid email profile https://www.googleapis.com/auth/drive.file",
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            },
            checks: ["none"], // Disable PKCE checks to fix localhost 500 error
            allowDangerousEmailAccountLinking: true,
        }),
        /*
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                if (!credentials?.email || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                });

                if (!user || !user.password) {
                    return null;
                }

                const isValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (isValid) {
                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                    };
                }

                return null;
            },
        }),
        */
    ],
});

