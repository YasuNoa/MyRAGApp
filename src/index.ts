// HonoのサーバーをNode.js環境で動かすためのアダプターをインポートします。
// これがないと、Honoで作ったアプリを通常のNode.jsサーバーとして起動できません。
// import { serve } from "@hono/node-server"; // src/server.ts に移動
// Webフレームワーク「Hono」本体をインポートします。
// Honoは軽量で高速なWebフレームワークで、APIサーバーを作るのに適しています。
import { Hono } from "hono";
// Gemini（AI）を操作するための自作関数をインポートします。
// getEmbedding: テキストをベクトル（数値の羅列）に変換する関数
// generateAnswer: 検索結果を元にAIに回答を生成させる関数
import { getEmbedding, generateAnswer, classifyIntent } from "./lib/gemini";
// Pinecone（ベクトルデータベース）を操作するための自作関数をインポートします。
// upsertDocument: ベクトルデータを保存・更新する関数
// queryDocuments: 類似するベクトルを検索する関数
import { upsertDocument, queryDocuments } from "./lib/pinecone";
// LINE Bot関連の機能をインポートします。
// lineConfig: LINEの設定情報
// lineClient: LINE APIを叩くためのクライアント
// replyMessage: ユーザーに返信を送るための関数
import { lineConfig, lineClient, replyMessage } from "./lib/line";
// LINEからの署名検証などを行うためのミドルウェアですが、今回は手動実装しているため未使用の可能性があります。
import { middleware } from "@line/bot-sdk";
// 一意なID（UUID）を生成するためのライブラリです。
// データベースに保存する際、ドキュメントごとに重複しないIDを付けるために使います。
import { v4 as uuidv4 } from "uuid";
import { auth } from "../auth";
import { prisma } from "./lib/prisma";

// Honoアプリのインスタンスを作成します。
// これがサーバーの本体となり、ここにルート（URLごとの処理）を追加していきます。
const app = new Hono().basePath("/api");

// データを保存するAPIエンドポイントを定義します。
// HTTPメソッドは「POST」を使います（データの作成・追加はPOSTが一般的だからです）。
// URLは "/add" です。
// なぜこれが必要か？: ユーザーがチャットボットに知識を追加できるようにするためです。
app.post("/add", async (c) => {
    // リクエストボディからJSONデータを取得し、その中の "text" プロパティを取り出します。
    // awaitが必要なのは、ネットワーク経由でデータを受け取る処理が非同期だからです。
    const { text } = await c.req.json();

    // もし text が空っぽだったら、エラーを返します。
    // 400 は "Bad Request"（リクエストが不正）という意味のステータスコードです。
    if (!text) return c.json({ error: "Text is required" }, 400);

    try {
        // 処理が始まったことをログに出力します（デバッグ用）。
        console.log(`[保存中] テキスト: ${text}`);

        // 1. テキストをベクトル化（数値化）します。
        // AIは言葉を直接理解できないので、意味を表す数値のリストに変換する必要があります。
        const vector = await getEmbedding(text);

        // 2. Pinecone（データベース）に保存します。
        // 保存には一意なIDが必要なので、uuidv4() でランダムなIDを生成します。
        const id = uuidv4();
        // ID、元のテキスト、そしてベクトルデータの3つをセットで保存します。
        await upsertDocument(id, text, vector);

        // 保存が成功したことをログに出力します。
        console.log(`[完了] ID: ${id} で保存しました。`);

        // クライアント（呼び出し元）に成功したことと、生成されたIDをJSONで返します。
        return c.json({ success: true, id });
    } catch (e) {
        // もし途中でエラーが発生した場合（API制限やDB接続エラーなど）はここに来ます。
        console.error(e);
        // 500 は "Internal Server Error"（サーバー内部エラー）という意味です。
        return c.json({ error: "Failed to add document" }, 500);
    }
});

// 質問を受け付けて回答するAPIエンドポイントを定義します。
// ここでもデータの送信を伴うので「POST」を使います。
// URLは "/ask" です。
app.post("/ask", async (c) => {
    const session = await auth();
    if (!session || !session.user?.id) {
        return c.json({ error: "Unauthorized" }, 401);
    }
    const userId = session.user.id;

    const { query } = await c.req.json();
    if (!query) return c.json({ error: "Query is required" }, 400);

    try {
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
        return c.json({ answer, context });
    } catch (e) {
        console.error(e);
        return c.json({ error: "Failed to get answer" }, 500);
    }
});

// LINEからのWebhookを受け取るエンドポイントです。
// LINE Botにメッセージが送られると、LINEのサーバーからこのURLに通知が来ます。
app.post("/webhook/line", async (c) => {
    // LINEからのリクエストには、改ざん防止のための署名（signature）が付いています。
    const signature = c.req.header("x-line-signature");
    // 署名がないリクエストは不正とみなしてエラーにします。
    if (!signature) return c.json({ error: "Signature missing" }, 400);

    // リクエストの本文（body）をテキストとして取得します。
    const body = await c.req.text();

    // 本来はここで署名の検証（verify）を行うべきですが、現在は実装されていません。
    // 本番環境では @line/bot-sdk の middleware を使うか、手動で検証ロジックを書く必要があります。
    // 現状は「署名があるか」のチェックのみで、中身の正当性はチェックしていないことに注意してください。

    // LINEからのイベントデータ（メッセージ受信など）を取り出します。
    const events = JSON.parse(body).events;

    // 届いたイベントを1つずつ処理します
    for (const event of events) {
        if (event.type === "message" && event.message.type === "text") {
            const userMessage = event.message.text;
            const replyToken = event.replyToken;
            const lineUserId = event.source.userId; // LINEのユーザーID

            console.log(`[LINE] 受信: ${userMessage} (from ${lineUserId})`);

            try {
                // 1. LINE IDからアプリのユーザーIDを特定する
                const account = await prisma.account.findFirst({
                    where: {
                        provider: "line",
                        providerAccountId: lineUserId,
                    },
                });

                // ユーザーが見つからない場合は、とりあえずログだけ出して処理続行（またはエラー返信）
                // ここでは「ゲスト」として扱うか、エラーにするか迷いますが、一旦保存せずに進めます。
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
                // ここでGeminiに「これは覚えさせるやつ？質問？」と聞きます
                // import { classifyIntent } from "./lib/gemini"; を忘れずに！
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

            } catch (e) {
                console.error("[LINE] Error:", e);
                await replyMessage(replyToken, "すみません、エラーが発生しました。");
            }
        }
    }

    return c.json({ success: true });
});

// サーバー起動処理は src/server.ts に移動しました。

// アプリケーションをエクスポートします。
// Vercelなどのホスティングサービスは、この default export を使ってアプリを起動します。
export default app;
