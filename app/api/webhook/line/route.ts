import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getEmbedding, generateAnswer, classifyIntent } from "@/src/lib/gemini";
import { upsertDocument, queryDocuments } from "@/src/lib/pinecone";
import { replyMessage } from "@/src/lib/line";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
    try {
        // LINE署名検証
        const signature = req.headers.get("x-line-signature");
        if (!signature) {
            return NextResponse.json({ error: "Signature missing" }, { status: 400 });
        }

        // リクエストボディ取得
        const body = await req.text();
        const events = JSON.parse(body).events;

        // イベント処理
        for (const event of events) {
            if (event.type === "message" && event.message.type === "text") {
                const userMessage = event.message.text;
                const replyToken = event.replyToken;
                const lineUserId = event.source.userId;

                console.log(`[LINE] 受信: ${userMessage} (from ${lineUserId})`);

                try {
                    // 1. LINE IDからアプリのユーザーIDを特定
                    const account = await prisma.account.findFirst({
                        where: {
                            provider: "line",
                            providerAccountId: lineUserId,
                        },
                    });

                    const userId = account?.userId;

                    // 2. ユーザーのメッセージをDBに保存（ユーザーが特定できた場合のみ）
                    if (userId) {
                        await prisma.message.create({
                            data: {
                                content: userMessage,
                                role: "user",
                                userId: userId,
                            },
                        });
                    }

                    // 3. 意図分類 (STORE or SEARCH)
                    const intent = await classifyIntent(userMessage);
                    console.log(`[LINE] 意図: ${intent}`);

                    let replyText = "";

                    if (intent === "STORE") {
                        // === 覚えるモード ===
                        const vector = await getEmbedding(userMessage);
                        const id = uuidv4();
                        await upsertDocument(id, userMessage, vector);
                        replyText = "覚えました！🧠";
                    } else {
                        // === 検索・会話モード ===
                        const vector = await getEmbedding(userMessage);
                        const context = await queryDocuments(vector);
                        replyText = await generateAnswer(userMessage, context);
                    }

                    // 4. LINEに返信
                    await replyMessage(replyToken, replyText);
                    console.log(`[LINE] 返信: ${replyText}`);

                    // 5. AIの回答をDBに保存（ユーザーが特定できた場合のみ）
                    if (userId) {
                        await prisma.message.create({
                            data: {
                                content: replyText,
                                role: "assistant",
                                userId: userId,
                            },
                        });
                    }
                } catch (e: any) {
                    console.error("[LINE] Error:", e.response?.data || e);
                    await replyMessage(replyToken, "すみません、エラーが発生しました。");
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
    }
}
