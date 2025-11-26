import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import Line from "next-auth/providers/line";

import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./src/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token.id && session.user) {
                session.user.id = token.id as string;
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
    ],
});

