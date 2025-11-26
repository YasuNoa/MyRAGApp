import { NextRequest, NextResponse } from "next/server";
import { getEmbedding } from "@/src/lib/gemini";
import { upsertDocument } from "@/src/lib/pinecone";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
    try {
        // リクエストボディ取得
        const { text } = await req.json();
        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        console.log(`[保存中] テキスト: ${text}`);

        // 1. テキストをベクトル化
        const vector = await getEmbedding(text);

        // 2. Pineconeに保存
        const id = uuidv4();
        await upsertDocument(id, text, vector);

        console.log(`[完了] ID: ${id} で保存しました。`);
        return NextResponse.json({ success: true, id });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to add document" }, { status: 500 });
    }
}
