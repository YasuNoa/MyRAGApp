// HonoのサーバーをNode.js環境で動かすためのアダプターをインポートします。
// これがないと、Honoで作ったアプリを通常のNode.jsサーバーとして起動できません。
import { serve } from "@hono/node-server";
// Webフレームワーク「Hono」本体をインポートします。
// Honoは軽量で高速なWebフレームワークで、APIサーバーを作るのに適しています。
import { Hono } from "hono";
// Gemini（AI）を操作するための自作関数をインポートします。
// getEmbedding: テキストをベクトル（数値の羅列）に変換する関数
// generateAnswer: 検索結果を元にAIに回答を生成させる関数
import { getEmbedding, generateAnswer } from "./lib/gemini";
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

// Honoアプリのインスタンスを作成します。
// これがサーバーの本体となり、ここにルート（URLごとの処理）を追加していきます。
const app = new Hono();

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
    // リクエストボディから "query"（質問文）を取り出します。
    const { query } = await c.req.json();

    // 質問文がなければエラーを返します。
    if (!query) return c.json({ error: "Query is required" }, 400);

    try {
        console.log(`[検索中] 質問: ${query}`);

        // 1. 質問文自体もベクトル化します。
        // これにより、保存されているテキストのベクトルとの「距離（類似度）」を計算できるようになります。
        const vector = await getEmbedding(query);

        // 2. Pineconeから、質問のベクトルに近い（意味が似ている）テキストを検索します。
        // これが RAG (Retrieval-Augmented Generation) の "Retrieval"（検索）部分です。
        const context = await queryDocuments(vector);
        console.log(`[参照コンテキスト] ${context.length}件見つかりました:`, context);

        // 3. 検索で見つかったテキスト（context）と質問（query）を合わせてGeminiに渡します。
        // これにより、AIは「検索結果に基づいた回答」を生成できます。
        const answer = await generateAnswer(query, context);

        console.log(`[回答] ${answer}`);
        // 回答と、参照したコンテキストを返します。
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

    // 届いたイベントを1つずつ処理します（同時に複数のメッセージが来ることもあるため）。
    for (const event of events) {
        // イベントの種類が「メッセージ」で、かつその中身が「テキスト」である場合のみ反応します。
        // （スタンプや画像などは今回は無視します）
        if (event.type === "message" && event.message.type === "text") {
            const userMessage = event.message.text; // ユーザーが送ってきたメッセージ
            const replyToken = event.replyToken; // 返信するために必要なトークン（切符のようなもの）

            console.log(`[LINE] 受信: ${userMessage}`);

            try {
                // ここでRAGのフローを実行します。
                // 1. ユーザーのメッセージをベクトル化
                const vector = await getEmbedding(userMessage);
                // 2. 関連情報を検索
                const context = await queryDocuments(vector);
                // 3. AIで回答生成
                const answer = await generateAnswer(userMessage, context);

                // 生成された回答をLINEに返信します。
                await replyMessage(replyToken, answer);
                console.log(`[LINE] 返信: ${answer}`);
            } catch (e) {
                console.error("[LINE] Error:", e);
                // エラー時はユーザーに謝罪メッセージを送ります。
                // これがないとユーザーは無視されたと感じてしまいます。
                await replyMessage(replyToken, "すみません、エラーが発生しました。");
            }
        }
    }

    // LINEサーバーに対して「正常に受け取りました」という合図（200 OK）を返します。
    // これを返さないと、LINEサーバーは「失敗した」と思って何度も同じ通知を送ってきてしまいます。
    return c.json({ success: true });
});

// サーバーを起動する処理です。
// ローカル開発時（NODE_ENVがproductionでない時）のみ実行されます。
// Vercelなどのクラウド環境では、この部分は実行されず、export default app が使われます。
if (process.env.NODE_ENV !== 'production') {
    const port = 3001;
    console.log(`Server is running on port ${port}`);

    serve({
        fetch: app.fetch,
        port
    });
}

// アプリケーションをエクスポートします。
// Vercelなどのホスティングサービスは、この default export を使ってアプリを起動します。
export default app;
