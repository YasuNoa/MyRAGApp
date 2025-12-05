import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { cookies } from "next/headers";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: NextRequest) {
    try {
        const { message } = await req.json();
        const cookieStore = await cookies();
        let guestSessionId = cookieStore.get("guestSessionId")?.value;

        let guestSession;

        if (guestSessionId) {
            guestSession = await prisma.guestSession.findUnique({
                where: { id: guestSessionId },
            });
        }

        // Create new session if not exists or expired
        if (!guestSession || new Date() > guestSession.expiresAt) {
            guestSession = await prisma.guestSession.create({
                data: {
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                    ipAddress: req.headers.get("x-forwarded-for") || "unknown",
                },
            });
            guestSessionId = guestSession.id;
            // Set cookie
            cookieStore.set("guestSessionId", String(guestSessionId), {
                httpOnly: true,
                maxAge: 60 * 60, // 1 hour
                path: "/"
            });
        }

        // Check limits
        if (guestSession.chatCount >= 2) {
            return NextResponse.json({ error: "Limit reached" }, { status: 403 });
        }

        // Increment count
        await prisma.guestSession.update({
            where: { id: guestSessionId },
            data: { chatCount: { increment: 1 } },
        });

        // Generate response (Simple chat for trial)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: "あなたは「じぶんAI」というパーソナルアシスタントです。ユーザーの質問に親切に答えてください。" }],
                },
                {
                    role: "model",
                    parts: [{ text: "はい、承知いたしました。私は「じぶんAI」です。どのようなことでもお気軽にご質問ください。" }],
                },
            ],
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        // Save history (simplified)
        const newMessages = [
            ...(guestSession.messages as any[] || []),
            { role: "user", content: message },
            { role: "assistant", content: responseText },
        ];

        await prisma.guestSession.update({
            where: { id: guestSessionId },
            data: { messages: newMessages },
        });

        return NextResponse.json({ response: responseText, remaining: 2 - (guestSession.chatCount + 1) });

    } catch (error) {
        console.error("Trial Chat Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
