import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDriveFileContent } from "@/src/lib/google-drive";

import { KnowledgeService } from "@/src/services/knowledge";
import { prisma } from "@/src/lib/prisma";

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // @ts-ignore
    const accessToken = session.accessToken as string;

    if (!accessToken) {
        return NextResponse.json(
            { error: "No access token found" },
            { status: 401 }
        );
    }

    let fileId = "";
    try {
        const body = await req.json();
        fileId = body.fileId;
        const mimeType = body.mimeType;
        const fileName = body.fileName;

        if (!fileId || !mimeType) {
            return NextResponse.json(
                { error: "File ID and Mime Type are required" },
                { status: 400 }
            );
        }

        console.log(`[Import] Starting import for file: ${fileId} (${mimeType})`);

        // 1. Download file content
        console.log(`[Import] Step 1: Downloading file...`);
        const buffer = await getDriveFileContent(accessToken, fileId);
        console.log(`[Import] Step 1: Downloaded ${buffer.length} bytes`);

        // 2. Send to Python Backend
        console.log(`[Import] Step 2: Sending to Python Backend...`);

        const formData = new FormData();
        const blob = new Blob([buffer], { type: mimeType });
        formData.append("file", blob, fileName || "file");

        const metadata = JSON.stringify({
            userId: session.user.id,
            fileId: fileId,
            mimeType: mimeType
        });
        formData.append("metadata", metadata);

        const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://backend:8000";
        const response = await fetch(`${pythonUrl}/import-file`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Import] Python Backend Error: ${response.status} ${errorText}`);
            throw new Error(`Python Backend failed: ${errorText}`);
        }

        const result = await response.json();
        console.log(`[Import] Step 2: Python processing complete. Result:`, result);

        // 3. Save to Database
        console.log(`[Import] Step 3: Saving metadata to Database...`);
        await KnowledgeService.registerDocument(
            session.user.id,
            fileName || fileId,
            "drive",
            fileId
        );
        console.log(`[Import] Step 3: Saved metadata to Database`);

        console.log(`[Import] Completed import for file: ${fileId}`);

        return NextResponse.json({ success: true, id: fileId, chunks: result.chunks_count });
    } catch (error: any) {
        console.error(`[Import] FATAL ERROR for file ${fileId || 'unknown'}:`, error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
