import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDriveFileContent, extractText } from "@/src/lib/google-drive";
import { getEmbedding } from "@/src/lib/gemini";
import { upsertDocument } from "@/src/lib/pinecone";
import { chunkText } from "@/src/lib/chunker";
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

        // 2. Extract text
        console.log(`[Import] Step 2: Extracting text...`);
        const text = await extractText(buffer, mimeType);
        console.log(`[Import] Step 2: Extracted text length: ${text.length}`);

        if (!text.trim()) {
            console.warn(`[Import] Warning: Extracted text is empty for file ${fileId}`);
            return NextResponse.json(
                { error: "No text content found in file" },
                { status: 400 }
            );
        }

        // 3. Chunking
        console.log(`[Import] Step 3: Chunking text...`);
        const chunks = chunkText(text);
        console.log(`[Import] Step 3: Created ${chunks.length} chunks`);

        // 4. Vectorize and Save each chunk
        console.log(`[Import] Step 4: Vectorizing and saving chunks...`);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const chunkId = `${fileId}_${i}`;

            console.log(`[Import] Processing chunk ${i + 1}/${chunks.length} (Length: ${chunk.length})`);

            // Vectorize
            const vector = await getEmbedding(chunk);

            // Save to Pinecone
            // Add sourceFileId to metadata so we know which file this chunk belongs to
            // We append the chunk index to the ID to make it unique
            // Note: upsertDocument signature needs to be updated to accept metadata or we pass it in a different way.
            // Currently upsertDocument takes (id, text, vector).
            // I need to update src/lib/pinecone.ts to accept arbitrary metadata.
            await upsertDocument(chunkId, chunk, vector, { sourceFileId: fileId });
        }

        console.log(`[Import] Step 4: Saved all ${chunks.length} chunks to Pinecone`);

        // 5. Save to Database
        console.log(`[Import] Step 5: Saving metadata to Database...`);
        await prisma.document.create({
            data: {
                userId: session.user.id,
                title: fileName || fileId,
                source: "google-drive",
                externalId: fileId,
            },
        });
        console.log(`[Import] Step 5: Saved metadata to Database`);

        console.log(`[Import] Completed import for file: ${fileId}`);

        return NextResponse.json({ success: true, id: fileId, chunks: chunks.length });
    } catch (error) {
        console.error(`[Import] FATAL ERROR for file ${fileId || 'unknown'}:`, error);
        // @ts-ignore
        if (error.response) {
            // @ts-ignore
            console.error(`[Import] Error Response Data:`, JSON.stringify(error.response.data));
        }
        return NextResponse.json(
            { error: "Failed to import file", details: String(error) },
            { status: 500 }
        );
    }
}
