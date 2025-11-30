import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";


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

        // 3. Delete vectors from Pinecone via Python Backend
        if (document.externalId) {
            try {
                const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://backend:8000";
                const response = await fetch(`${pythonUrl}/delete-file`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fileId: document.externalId,
                        userId: session.user.id
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`[Delete] Python Backend Error: ${response.status} ${errorText}`);
                    // We log but continue to delete from DB to keep UI consistent
                } else {
                    console.log(`[Delete] Successfully requested vector deletion for ${document.externalId}`);
                }
            } catch (e) {
                console.error("Failed to call Python backend for deletion:", e);
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
