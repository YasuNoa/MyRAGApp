// Googleの生成AI（Gemini）を利用するためのライブラリをインポートします。
import { GoogleGenerativeAI } from "@google/generative-ai";

// 環境変数からGoogleのAPIキーを取得します。
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.warn("GOOGLE_API_KEY is not set in .env file");
}

// Geminiのクライアントを初期化します。
// これを使って、Geminiのモデル（AI）にアクセスします。
const genAI = new GoogleGenerativeAI(apiKey || "");

// テキストを「ベクトル（数値の配列）」に変換する関数です。
// なぜこれが必要か？:
// コンピュータやデータベース（Pinecone）は「言葉の意味」を直接比較することができません。
// そこで、AIを使って言葉を数値化（ベクトル化）することで、
// 「意味が似ている文章」を数学的に計算（距離計算）できるようにします。
// これが「DBにデータが溜まる仕組み」の入り口であり、検索の要となります。
export async function getEmbedding(text: string): Promise<number[]> {
    // "text-embedding-004" という、ベクトル化専用のモデルを使います。
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    // テキストを渡して、ベクトルデータを取得します。
    const result = await model.embedContent(text);

    // 結果の中から、数値の配列（values）だけを取り出して返します。
    return result.embedding.values;
}

// ユーザーの意図を分類する関数
export async function classifyIntent(text: string): Promise<{ intent: "STORE" | "SEARCH"; category: string; }> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
    あなたはユーザーのメッセージを分析するAIです。
    以下の2つの情報をJSON形式で出力してください。

    1. intent (意図):
       - "STORE": ユーザーが自分の情報を教えてくれたり、覚えてほしいと言った場合（例：「私の趣味は〜」「〜が好き」「〜に行ってきた」）
       - "SEARCH": ユーザーが質問したり、雑談したり、挨拶した場合（例：「私の趣味は何？」「こんにちは」「おすすめは？」）

    2. category (カテゴリ):
       以下のリストから最も適切なものを1つ選んでください。
       - 仕事_本業, 仕事_副業, 学習_技術, 学習_語学
       - 生活_食事, 生活_健康, 生活_家計, 生活_住まい
       - 趣味_旅行, 趣味_エンタメ, 趣味_音楽, 趣味_スポーツ
       - 関係_家族, 関係_友人, 関係_恋人
       - スケジュール, アイデア, 日記, ニュース, その他

    出力フォーマット:
    {
      "intent": "STORE" or "SEARCH",
      "category": "カテゴリ名"
    }

    ユーザーのメッセージ: "${text}"
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResponse = response.text().trim();

    // JSON部分だけを取り出す（Markdownのコードブロック記法 ```json ... ``` を除去）
    const jsonString = textResponse.replace(/^```json\n|\n```$/g, "").trim();

    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON from Gemini:", textResponse);
        // パース失敗時はデフォルト値を返す
        return { intent: "SEARCH", category: "その他" };
    }
}

// ユーザーの質問と、検索で見つかった情報（コンテキスト）を元に、回答を生成する関数です。
// なぜこれが必要か？:
// AI（Gemini）は、あなたがPineconeに保存したデータのことを知りません。
// そこで、Pineconeから検索した「関連情報（コンテキスト）」をヒントとしてプロンプトに含めることで、
// AIがその情報を「拾って」回答できるようにします。これが RAG の仕組みです。
export async function generateAnswer(query: string, context: string[]): Promise<string> {
    // "gemini-flash-latest" という、高速で安価なモデルを使います。
    // 用途に応じて "gemini-pro" などに変更することも可能です。
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // AIへの命令文（プロンプト）を作成します。
    // ここで「コンテキスト」と「質問」をセットで渡すのがポイントです。
    const prompt = `
  あなたは親切なアシスタントです。以下のコンテキストを使用して、ユーザーの質問に答えてください。
  答えがコンテキストにない場合は、「提供された情報からはわかりません」と答えてください。
  
  コンテキスト:
  ${context.join("\n\n")}
  
  質問:
  ${query}
  `;

    // プロンプトをAIに送信し、回答を生成させます。
    const result = await model.generateContent(prompt);

    // 生成されたテキストを返します。
    return result.response.text();
}
