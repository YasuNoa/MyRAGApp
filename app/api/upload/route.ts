import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { KnowledgeService, KnowledgeSource } from "@/src/services/knowledge";
import { PythonBackendService } from "@/src/services/python-backend";
import { prisma } from "@/src/lib/prisma";
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

        const fileCreatedAtStr = formData.get("fileCreatedAt") as string;
        let fileCreatedAt: Date | undefined = undefined;
        if (fileCreatedAtStr) {
            const timestamp = parseInt(fileCreatedAtStr);
            if (!isNaN(timestamp)) {
                fileCreatedAt = new Date(timestamp);
            }
        }

        // --- LIMIT CHECKS ---
        // Delegated to Python Backend.
        // If Python returns 403, we must delete the created Document.

        // We need 'plan' to pass to Python for audio trimming logic (even if limit check is there)
        const subscription = await prisma.userSubscription.findUnique({
            where: { userId: session.user.id },
        });
        const plan = subscription?.plan || "FREE";

        // 1. Create Document record in DB FIRST
        const document = await KnowledgeService.registerDocument(
            session.user.id,
            file.name,
            source as KnowledgeSource,
            fileId,
            tags,
            file.type,
            fileCreatedAt
        );

        // 2. Send to Python Backend with dbId
        try {
            await PythonBackendService.importFile(file, {
                userId: session.user.id,
                fileId: fileId,
                mimeType: file.type,
                fileName: file.name,
                tags: tags,
                dbId: document.id, // Pass dbId so Python can update content
                userPlan: plan // Pass user plan for audio trimming
            });
        } catch (e: any) {
            console.error("[Upload] Python Backend rejected:", e);
            // Cleanup: Delete the document we just created
            await prisma.document.delete({ where: { id: document.id } });
            // Re-throw to return error to user
            throw e;
        }

        return NextResponse.json({ success: true, id: document.id });

    } catch (error: any) {
        console.error("[Upload] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: error.message?.includes("limit") ? 403 : 500 }
        );
    }
}
