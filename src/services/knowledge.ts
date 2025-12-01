import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/src/lib/prisma";


export type KnowledgeSource = "manual" | "line" | "google-drive" | "voice_memo";

export const KnowledgeService = {
    /**
     * テキストベースの知識（手動入力、LINEなど）を追加する
     * - ベクトル化
     * - Pineconeへ保存
     * - DBへメタデータ保存
     */
    async addTextKnowledge(userId: string, text: string, source: KnowledgeSource, tags: string[] = []) {
        // 1. Create Document record in DB first
        const title = text.slice(0, 20) + (text.length > 20 ? "..." : "");
        const document = await prisma.document.create({
            data: {
                userId,
                title,
                source,
                tags, // Save tags
                externalId: `temp-${Date.now()}`, // Temporary
                content: text // Save content immediately
            },
        });

        // 2. Call Python Backend to process text
        const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://backend:8000";
        const response = await fetch(`${pythonUrl}/import-text`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: text,
                userId: userId,
                source: source,
                dbId: document.id, // Pass DB ID
                tags: tags // Pass tags
            }),
        });

        if (!response.ok) {
            throw new Error(`Python backend failed: ${await response.text()}`);
        }

        const result = await response.json();
        const fileId = result.fileId;

        // 3. Update Document with fileId (if needed)
        await prisma.document.update({
            where: { id: document.id },
            data: { externalId: fileId }
        });

        return { id: document.id, document };
    },

    /**
     * ドキュメント（ファイル）のメタデータを登録する
     * ※ ベクトル化とPinecone保存は呼び出し元で行う（チャンク処理などが複雑なため）
     */
    async registerDocument(userId: string, title: string, source: KnowledgeSource, externalId: string, tags: string[] = [], mimeType?: string, fileCreatedAt?: Date) {
        return await prisma.document.create({
            data: {
                userId,
                title,
                source,
                externalId,
                tags,
                mimeType,
                fileCreatedAt,
            },
        });
    }
};
