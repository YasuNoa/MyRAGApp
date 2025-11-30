import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";
import { PythonBackendService } from "@/src/services/python-backend";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { transcript, summary, tags, title } = body;

        if (!transcript) {
            return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
        }

        // 1. Create Document record
        const fileId = uuidv4();
        const document = await prisma.document.create({
            data: {
                userId: session.user.id,
                title: title || `Voice Memo ${new Date().toLocaleString()}`,
                type: "note",
                source: "voice_memo",
                externalId: fileId,
                content: transcript,
                summary: summary || "",
                tags: tags || []
            }
        });

        // 2. Send to Python Backend to Embed and Save to Pinecone
        // We use importText which now supports summary
        await PythonBackendService.importText(transcript, {
            userId: session.user.id,
            dbId: document.id,
            tags: tags || [],
            summary: summary
        });

        return NextResponse.json({ success: true, id: document.id });

    } catch (error: any) {
        console.error("[Voice Save] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
