import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDriveFileContent } from "@/src/lib/google-drive";
import { KnowledgeService } from "@/src/services/knowledge";
import { PythonBackendService } from "@/src/services/python-backend";
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


        // 2. Create Document record in DB FIRST
        console.log(`[Import] Step 2: Saving metadata to Database...`);
        const document = await KnowledgeService.registerDocument(
            session.user.id,
            fileName || fileId,
            "google-drive",
            fileId,
            tags, // Pass tags
            mimeType // Pass mimeType
        );
        console.log(`[Import] Step 2: Saved metadata to Database`);

        // 3. Send to Python Backend
        console.log(`[Import] Step 3: Sending to Python Backend...`);
        const blob = new Blob([buffer], { type: mimeType });

        try {
            // Unified Import: The service handles dispatching based on MIME type
            const result = await PythonBackendService.importFile(blob, {
                userId: session.user.id,
                fileId: fileId,
                mimeType: mimeType,
                fileName: fileName,
                tags: tags,
                dbId: document.id // Pass dbId so Python can update content
            });

            console.log(`[Import] Step 3: Python processing complete. Result:`, result);
            console.log(`[Import] Completed import for file: ${fileId}`);

            return NextResponse.json({ success: true, id: fileId, chunks: result.chunks_count });

        } catch (e: any) {
            console.error("[Import] Python Backend rejected:", e);
            // Cleanup
            await prisma.document.delete({ where: { id: document.id } });
            throw e;
        }

    } catch (error: any) {
        console.error(`[Import] FATAL ERROR for file ${fileId || 'unknown'}:`, error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: error.message?.includes("limit") ? 403 : 500 }
        );
    }
}
