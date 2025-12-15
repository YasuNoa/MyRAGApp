import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/src/lib/auth-check";
import { prisma } from "@/src/lib/prisma";

export async function POST(req: NextRequest) {
    const authResult = await verifyAuth(req);
    if (!authResult || !authResult.uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const content = body.content;

        if (!content || typeof content !== "string" || content.trim() === "") {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        await prisma.feedback.create({
            data: {
                userId: authResult.uid,
                content: content,
            },
        });

        return NextResponse.json({ success: true, message: "フィードバックを送信しました" });

    } catch (error: any) {
        console.error("Feedback error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
