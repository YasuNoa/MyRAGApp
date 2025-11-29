import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";
import { Pinecone } from "@pinecone-database/pinecone";
import { deleteDocumentsBySourceId } from "@/src/lib/pinecone";

export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session || !session.user?.id) {
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

        if (document.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 3. Delete vectors from Pinecone
        // We use the externalId (which is the sourceFileId) to delete all related vectors.
        if (document.externalId) {
            try {
                await deleteDocumentsBySourceId(document.externalId);
            } catch (e) {
                console.error("Failed to delete vectors from Pinecone:", e);
                // We continue to delete from DB even if Pinecone delete fails, 
                // or should we stop? 
                // Better to continue so the user doesn't see the file in the list anymore.
                // But we log the error.
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
