import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/src/lib/auth-check";
import { prisma } from "@/src/lib/prisma";
import { PythonBackendService } from "@/src/services/python-backend";


export async function DELETE(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
        }

        // 1. Get document info to find externalId (fileId)
        const document = await prisma.document.findUnique({
            where: { id },
        });

        if (!document) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        if (document.userId !== user.uid) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 3. Delete vectors from Pinecone via Python Backend
        // Use dbId as Pinecone ID
        if (document.id) {
            try {
                await PythonBackendService.deleteFile(user.uid, document.id);
                console.log(`[Delete] Successfully requested vector deletion for ${document.id}`);
            } catch (e) {
                console.error("[Delete] Failed to delete execution vectors:", e);
                // Continue to delete from DB
            }
        }

        // 4. Delete from DB
        await prisma.document.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting document:", error);
        return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }
}
