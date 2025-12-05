import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { cookies } from "next/headers";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const audioFile = formData.get("audio") as File;

        if (!audioFile) {
            return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
        }

        const cookieStore = await cookies();
        let guestSessionId = cookieStore.get("guestSessionId")?.value;
        let guestSession;

        console.log("DEBUG: Prisma Models:", Object.keys(prisma));
        // @ts-ignore
        console.log("DEBUG: guestSession model exists?", !!prisma.guestSession);

        if (guestSessionId) {
            guestSession = await prisma.guestSession.findUnique({
                where: { id: guestSessionId },
            });
        }

        // Create new session if needed (though usually chat comes first, but handle standalone)
        if (!guestSession || new Date() > guestSession.expiresAt) {
            guestSession = await prisma.guestSession.create({
                data: {
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
                    ipAddress: req.headers.get("x-forwarded-for") || "unknown",
                },
            });
            guestSessionId = guestSession.id;
            cookieStore.set("guestSessionId", String(guestSessionId), {
                httpOnly: true,
                maxAge: 60 * 60,
                path: "/"
            });
        }

        // Check limits
        if (guestSession.voiceCount >= 1) {
            return NextResponse.json({ error: "Limit reached" }, { status: 403 });
        }

        // Increment count
        await prisma.guestSession.update({
            where: { id: guestSessionId },
            data: { voiceCount: { increment: 1 } },
        });

        // Process Audio
        const arrayBuffer = await audioFile.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString("base64");

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([
            "この音声を要約してください。重要なポイントを箇条書きで3つ程度にまとめてください。",
            {
                inlineData: {
                    mimeType: audioFile.type || "audio/webm",
                    data: base64Audio
                }
            }
        ]);

        const summary = result.response.text();

        // Save summary
        await prisma.guestSession.update({
            where: { id: guestSessionId },
            data: { voiceMemo: summary },
        });

        return NextResponse.json({ summary, remaining: 1 - (guestSession.voiceCount + 1) });

    } catch (error) {
        console.error("Trial Voice Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
