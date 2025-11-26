import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";
import { getEmbedding, generateAnswer } from "@/src/lib/gemini";
import { queryDocuments } from "@/src/lib/pinecone";

export async function POST(req: NextRequest) {
    try {
        // 認証チェック
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;

        // リクエストボディ取得
        const { query } = await req.json();
        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        console.log(`[検索中] 質問: ${query}`);

        // 1. ユーザーのメッセージをDBに保存
        await prisma.message.create({
            data: {
                content: query,
                role: "user",
                userId: userId,
            },
        });

        // 2. ベクトル化 & 検索
        const vector = await getEmbedding(query);
        const context = await queryDocuments(vector);

        // 3. 回答生成
        const answer = await generateAnswer(query, context);

        // 4. AIの回答をDBに保存
        await prisma.message.create({
            data: {
                content: answer,
                role: "assistant",
                userId: userId,
            },
        });

        console.log(`[回答] ${answer}`);
        return NextResponse.json({ answer, context });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to get answer" }, { status: 500 });
    }
}
