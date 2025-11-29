import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/src/lib/prisma";
import { getEmbedding } from "@/src/lib/gemini";
import { upsertDocument } from "@/src/lib/pinecone";

export type KnowledgeSource = "manual" | "line" | "drive";

export const KnowledgeService = {
    /**
     * テキストベースの知識（手動入力、LINEなど）を追加する
     * - ベクトル化
     * - Pineconeへ保存
     * - DBへメタデータ保存
     */
    async addTextKnowledge(userId: string, text: string, source: KnowledgeSource) {
        // 1. ベクトル化
        const vector = await getEmbedding(text);

        // 2. Pineconeに保存
        const id = uuidv4();
        await upsertDocument(id, text, vector);

        // 3. DBに保存
        // タイトルは本文の先頭20文字
        const title = text.slice(0, 20) + (text.length > 20 ? "..." : "");

        const document = await prisma.document.create({
            data: {
                userId,
                title,
                source,
                externalId: id,
            },
        });

        return { id, document };
    },

    /**
     * ドキュメント（ファイル）のメタデータを登録する
     * ※ ベクトル化とPinecone保存は呼び出し元で行う（チャンク処理などが複雑なため）
     */
    async registerDocument(userId: string, title: string, source: KnowledgeSource, externalId: string) {
        return await prisma.document.create({
            data: {
                userId,
                title,
                source,
                externalId,
            },
        });
    }
};
