import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";
import { PythonBackendService } from "@/src/services/python-backend";

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, tags, title } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
        }

        // 1. Update Postgres
        const document = await prisma.document.update({
            where: { id: id },
            data: {
                tags: tags,
                title: title // Optional update
            }
        });

        // 2. Update Pinecone (via Python Backend)
        // We need externalId to update Pinecone
        if (document.externalId) {
            await PythonBackendService.updateTags(
                session.user.id,
                document.externalId,
                tags
            );
        }

        return NextResponse.json({ success: true, document });

    } catch (error: any) {
        console.error("[Update] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
