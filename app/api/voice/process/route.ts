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
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        console.log(`[Voice] Processing file: ${file.name}`);

        // 1. Create Document record (Pending state)
        // We create it first to get the ID
        const fileId = uuidv4();
        const document = await prisma.document.create({
            data: {
                userId: session.user.id,
                title: file.name || "Voice Memo",
                type: "note",
                source: "voice_memo",
                externalId: fileId,
                content: "", // Will be updated by Python
                summary: "", // Will be updated by Python
                tags: ["Voice Memo"]
            }
        });

        // 2. Send to Python Backend
        // We pass dbId so Python can update the record directly
        const result = await PythonBackendService.processVoiceMemo(file, {
            userId: session.user.id,
            fileId: fileId,
            dbId: document.id,
            tags: ["Voice Memo"]
        });

        return NextResponse.json({ success: true, document: document, result: result });

    } catch (error: any) {
        console.error("[Voice] Error:", error);
        // If failed, maybe delete the document? Or keep it as error?
        // For now, keep it.
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
