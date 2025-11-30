import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { KnowledgeService } from "@/src/services/knowledge";
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
        const tagsString = formData.get("tags") as string || "[]";
        let tags: string[] = [];
        try {
            tags = JSON.parse(tagsString);
            if (!Array.isArray(tags)) tags = [];
        } catch (e) {
            console.warn("Failed to parse tags:", tagsString);
            tags = [];
        }

        const source = formData.get("source") as string || "manual"; // Default to manual if not provided

        console.log(`[Upload] Received file: ${file.name} (${file.type}), Tags: ${tags}, Source: ${source}`);

        // Generate a UUID for the fileId (externalId)
        const fileId = uuidv4();

        // 1. Send to Python Backend FIRST
        await PythonBackendService.importFile(file, {
            userId: session.user.id,
            fileId: fileId,
            mimeType: file.type,
            fileName: file.name,
            tags: tags
        });

        // 2. Create Document record in DB AFTER success
        const document = await KnowledgeService.registerDocument(
            session.user.id,
            file.name,
            source,
            fileId,
            tags
        );

        return NextResponse.json({ success: true, id: document.id });

    } catch (error: any) {
        console.error("[Upload] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
