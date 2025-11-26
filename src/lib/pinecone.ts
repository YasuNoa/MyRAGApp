// Pineconeのクライアントライブラリをインポートします。
// これを使うことで、PineconeのAPIを簡単に呼び出すことができます。
import { Pinecone } from "@pinecone-database/pinecone";
// 環境変数（.envファイル）を読み込むためのライブラリです。
// APIキーなどの機密情報はコードに直接書かず、環境変数として管理するのがセキュリティの基本です。
import dotenv from "dotenv";

// .envファイルの内容を process.env に読み込みます。
dotenv.config();

// 環境変数からPineconeのAPIキーとインデックス名（DB名）を取得します。
const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX;

// もしAPIキーが設定されていなければ、警告を出します。
// これがないと、接続エラーの原因がわからずデバッグに苦労するためです。
if (!apiKey) {
    console.warn("PINECONE_API_KEY is not set in .env file");
}

// Pineconeのクライアントを初期化します。
// ここでAPIキーを渡すことで、クラウド上のPineconeサービスと認証を行います。
// これ以降、この `pc` オブジェクトを使ってデータベース操作を行います。
const pc = new Pinecone({
    apiKey: apiKey || "",
});

// 使用するインデックス（データベース）を指定します。
// インデックスは事前にPineconeの管理画面で作成しておく必要があります。
// ここでは .env で指定された名前（なければ "quickstart"）のインデックスに接続します。
const index = pc.index(indexName || "quickstart");

// ドキュメント（テキストとベクトル）を保存・更新する関数です。
// id: ドキュメントの一意なID
// text: 元のテキスト（検索結果として表示するため）
// vector: テキストを数値化したベクトルデータ（検索のため）
export async function upsertDocument(id: string, text: string, vector: number[]) {
    // index.upsert() を使ってデータを保存します。
    // Pineconeには、ID、ベクトル(values)、メタデータ(metadata)をセットで保存できます。
    await index.upsert([
        {
            id: id,
            values: vector,
            metadata: { text }, // 元のテキストも一緒に保存しておかないと、検索しても「どの文章か」がわかりません。
        },
    ]);
}

// 類似するドキュメントを検索する関数です。
// vector: 検索クエリ（質問文）のベクトル
// topK: 上位何件を取得するか（デフォルトは3件）
export async function queryDocuments(vector: number[], topK: number = 3): Promise<string[]> {
    // index.query() を使って、渡されたベクトルに近いデータを検索します。
    const queryResponse = await index.query({
        vector: vector,
        topK: topK,
        includeMetadata: true, // メタデータ（元のテキスト）も含めて取得します。
    });

    // 検索結果から、元のテキストだけを取り出して配列として返します。
    // match.metadata?.text が存在するものだけをフィルタリングしています。
    return queryResponse.matches
        .map((match) => match.metadata?.text as string)
        .filter((text) => text !== undefined);
}
