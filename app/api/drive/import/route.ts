import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDriveFileContent } from "@/src/lib/google-drive";
import { KnowledgeService } from "@/src/services/knowledge";
import { PythonBackendService } from "@/src/services/python-backend";

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
        const tags = body.tags || []; // Extract tags

        if (!fileId || !mimeType) {
            return NextResponse.json(
                { error: "File ID and Mime Type are required" },
                { status: 400 }
            );
        }

        console.log(`[Import] Starting import for file: ${fileId} (${mimeType}) with tags: ${tags}`);

        // 1. Download file content
        console.log(`[Import] Step 1: Downloading file...`);
        const buffer = await getDriveFileContent(accessToken, fileId);
        console.log(`[Import] Step 1: Downloaded ${buffer.length} bytes`);

        // 2. Send to Python Backend
        console.log(`[Import] Step 2: Sending to Python Backend...`);
        const blob = new Blob([buffer], { type: mimeType });

        const result = await PythonBackendService.importFile(blob, {
            userId: session.user.id,
            fileId: fileId,
            mimeType: mimeType,
            fileName: fileName,
            tags: tags // Pass tags
        });

        console.log(`[Import] Step 2: Python processing complete. Result:`, result);

        // 3. Save to Database
        console.log(`[Import] Step 3: Saving metadata to Database...`);
        await KnowledgeService.registerDocument(
            session.user.id,
            fileName || fileId,
            "google-drive",
            fileId,
            tags // Pass tags
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
