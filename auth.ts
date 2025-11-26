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
    providers: [
        Line({
            clientId: process.env.AUTH_LINE_ID,
            clientSecret: process.env.AUTH_LINE_SECRET,
            authorization: { params: { scope: "openid profile email" } },
            allowDangerousEmailAccountLinking: true,
        }),
        Credentials({
            credentials: {
                username: { label: "Phone Number", type: "text" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                if (!credentials?.username || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { phoneNumber: credentials.username as string },
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

