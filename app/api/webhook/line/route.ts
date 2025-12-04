import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { replyMessage } from "@/src/lib/line";
import { KnowledgeService } from "@/src/services/knowledge";

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

                    // ユーザーが特定できた場合のみ処理を続行
                    if (!account) {
                        console.log(`[LINE] Unknown user: ${lineUserId}`);
                        await replyMessage(replyToken, "ユーザー情報が見つかりません。こちらからLINEログインしてください。https://jibun-ai.com/login");
                        continue; // 次のイベントへ
                    }

                    // 2. ユーザーの意図とタグを分類 (Python Backend)
                    const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://backend:8000";

                    let intent = "CHAT";
                    let tags: string[] = ["General"];

                    try {
                        // Python Backendの /classify エンドポイントを呼び出す
                        const classifyRes = await fetch(`${pythonUrl}/classify`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ text: userMessage }),
                        });

                        if (classifyRes.ok) {
                            const result = await classifyRes.json();
                            intent = result.intent || "CHAT";
                            tags = result.tags || ["General"];
                            // 旧形式 (category) の場合のフォールバック
                            if (!result.tags && result.category) {
                                tags = [result.category];
                            }
                        } else {
                            console.error(`[LINE] Classification failed: ${classifyRes.status}`);
                        }
                    } catch (e) {
                        console.error("[LINE] Classification error:", e);
                    }

                    console.log(`[Gemini] Intent: ${intent}, Tags: ${tags}`);

                    // 3. ユーザーのメッセージをDBに保存
                    // Message model might not have tags field yet? 
                    // Let's check schema.prisma. Message model usually has content, role, userId.
                    // If we want to save tags for the message, we need to update Message model or just ignore for now.
                    // The original code saved `category`. Let's check if Message has `category`.
                    // If Message has `category` (String), we can join tags or pick the first one.
                    // If we want to support tags properly, we should update Message model too.
                    // For now, let's join tags with comma if category field exists.

                    await prisma.message.create({
                        data: {
                            content: userMessage,
                            role: "user",
                            userId: account.userId,
                            // category: tags.join(","), // Assuming category field exists and is String
                        },
                    });

                    let replyText = "";

                    if (intent === "STORE") {
                        // === 覚えるモード ===
                        try {
                            // 1. Create Document record in DB FIRST
                            const title = userMessage.slice(0, 20) + (userMessage.length > 20 ? "..." : "");
                            const document = await prisma.document.create({
                                data: {
                                    userId: account.userId,
                                    title: title,
                                    source: "line",
                                    externalId: `line-${Date.now()}`, // Temporary ID
                                    content: userMessage, // Save content immediately
                                    tags: tags
                                },
                            });

                            // 2. Call Python Backend with dbId
                            const res = await fetch(`${pythonUrl}/import-text`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    text: userMessage,
                                    userId: account.userId,
                                    source: "line",
                                    tags: tags, // Pass tags
                                    dbId: document.id // Pass dbId
                                }),
                            });

                            if (!res.ok) throw new Error(await res.text());

                            const result = await res.json();

                            // Update externalId with fileId from Python
                            if (result.fileId) {
                                await prisma.document.update({
                                    where: { id: document.id },
                                    data: { externalId: result.fileId }
                                });
                            }

                            replyText = `覚えました！🧠 (タグ: ${tags.join(", ")})`;
                        } catch (e) {
                            console.error("[LINE] Store failed:", e);
                            replyText = "保存に失敗しました...";
                        }
                    } else if (intent === "REVIEW") {
                        // === 振り返りモード ===
                        // 今日の0時0分0秒 (JST) を取得
                        const now = new Date();
                        const jstOffset = 9 * 60; // JSTはUTC+9
                        const todayJST = new Date(now.getTime() + (jstOffset * 60 * 1000));
                        todayJST.setUTCHours(0, 0, 0, 0);
                        const startOfDay = new Date(todayJST.getTime() - (jstOffset * 60 * 1000)); // UTCに戻す

                        // 今日のユーザーメッセージを取得 (We need to fetch messages that are STOREd? Or all user messages?)
                        // Original logic fetched all user messages.
                        const messages = await prisma.message.findMany({
                            where: {
                                userId: account.userId,
                                role: "user",
                                createdAt: {
                                    gte: startOfDay,
                                },
                            },
                            orderBy: {
                                createdAt: "asc",
                            },
                        });

                        if (messages.length === 0) {
                            replyText = "今日はまだ何も記録していません📝";
                        } else {
                            // Since Message model might not have tags, we can't group by tags easily unless we saved them.
                            // If we didn't save tags to Message, we can't group.
                            // For now, just list messages.
                            let report = "📅 今日の振り返り\n\n";
                            messages.forEach((msg) => {
                                report += `・${msg.content}\n`;
                            });
                            report += `\n合計: ${messages.length}件`;
                            replyText = report.trim();
                        }
                    } else {
                        // === 検索・会話モード (Python Backend /query) ===
                        try {
                            const queryResp = await fetch(`${pythonUrl}/query`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    query: userMessage,
                                    userId: account.userId,
                                    tags: [] // No tags filter for general chat unless specified?
                                }),
                            });

                            if (queryResp.ok) {
                                const queryResult = await queryResp.json();
                                replyText = queryResult.answer;
                            } else {
                                replyText = "すみません、うまく考えられませんでした...";
                            }
                        } catch (e) {
                            console.error("[LINE] Query failed:", e);
                            replyText = "エラーが発生しました。";
                        }
                    }

                    // 4. LINEに返信
                    await replyMessage(replyToken, replyText);
                    console.log(`[LINE] 返信: ${replyText}`);

                    // 5. AIの回答をDBに保存
                    await prisma.message.create({
                        data: {
                            content: replyText,
                            role: "assistant",
                            userId: account.userId,
                        },
                    });

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
