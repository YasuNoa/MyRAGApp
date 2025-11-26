# My Personal RAG Bot

自分専用のLLM Botのバックエンドプロトタイプです。
LINEやSlackからテキストを受け取り、Pineconeに保存し、Geminiで回答を生成するフローを実装しています。

## 必要条件

- Node.js (v18以上推奨)
- Google AI Studio API Key (Gemini)
- Pinecone API Key & Index Name

## セットアップ

1. 依存関係のインストール
   ```bash
   npm install
   ```

2. 環境変数の設定
   `.env.example` をコピーして `.env` を作成し、APIキーを入力してください。
   ```bash
   cp .env.example .env
   ```
   
   `.env`の中身:
   ```
   GOOGLE_API_KEY=your_google_api_key
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX=your_index_name
   ```

## 実行方法

サーバーを起動します:

```bash
npx tsx src/index.ts
```

## 使い方 (APIエンドポイント)

### 1. 知識を覚える (Add)

```bash
curl -X POST http://localhost:3000/add \
  -H "Content-Type: application/json" \
  -d '{"text": "私の好きな食べ物は寿司です。"}'
```

### 2. 質問する (Ask)

```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "私の好きな食べ物は何？"}'
```

## 構成

- `src/index.ts`: メインサーバー (Hono)
- `src/lib/gemini.ts`: Gemini API クライアント (Embedding & Generation)
- `src/lib/pinecone.ts`: Pinecone API クライアント (Vector DB)
