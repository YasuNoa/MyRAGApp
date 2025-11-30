import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { KnowledgeService } from "@/src/services/knowledge";

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

        console.log(`[Upload] Received file: ${file.name} (${file.type}), Tags: ${tags}`);

        // 1. Create Document record in DB first to get the ID
        const document = await KnowledgeService.registerDocument(
            session.user.id,
            file.name,
            "manual",
            `temp-${Date.now()}`, // Temporary externalId, will be updated or unused
            tags // Pass tags
        );

        // 2. Prepare metadata for Python backend
        const metadata = JSON.stringify({
            userId: session.user.id,
            fileId: document.id, // Use DB ID as fileId for consistency? Or pass as dbId?
            dbId: document.id,   // Pass DB ID explicitly
            mimeType: file.type,
            tags: tags
        });

        // 3. Forward to Python Backend
        const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://backend:8000";

        const backendFormData = new FormData();
        backendFormData.append("file", file);
        backendFormData.append("metadata", metadata);

        const response = await fetch(`${pythonUrl}/import-file`, {
            method: "POST",
            body: backendFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Upload] Python Backend Error: ${response.status} ${errorText}`);
            // If backend fails, maybe delete the document?
            // await prisma.document.delete({ where: { id: document.id } });
            throw new Error(`Python Backend failed: ${errorText}`);
        }

        const result = await response.json();
        console.log(`[Upload] Python processing complete. Result:`, result);

        // Update externalId if needed, or just keep it.
        // The backend might have saved content to this document.

        return NextResponse.json({ success: true, id: document.id });

    } catch (error: any) {
        console.error("[Upload] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
