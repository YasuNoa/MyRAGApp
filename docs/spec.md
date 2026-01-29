# 技術仕様 (Technical Specification)

## 技術スタック

### フロントエンド
-   **フレームワーク**: Next.js 16 (App Router)
-   **言語**: TypeScript
-   **スタイリング**: Tailwind CSS
-   **認証**: NextAuth.js v5 (Beta)
-   **ホスティング**: Google Cloud Run (Docker化)

### バックエンド
-   **フレームワーク**: FastAPI (Python)
-   **ランタイム**: Python 3.10+
-   **主要ライブラリ**:
    -   `google-generativeai`: Gemini API クライアント
    -   `asyncpg`: PostgreSQL (pgvector) クライアント
    -   `prisma`: DB クライアント (Python版)
    -   `langchain`: テキスト分割とオーケストレーション
    -   `ffmpeg`: 音声処理 (Docker/システムにインストール)

### データベース & ストレージ
-   **プライマリDB**: PostgreSQL (ユーザーデータ, チャット履歴, ドキュメントメタデータ/コンテンツ)
-   **ベクトルDB**: Supabase Vector / pgvector (Embeddings)
-   **オブジェクトストレージ**: 暗黙的 (ローカル一時保存または処理へのパススルー。ただしRAG用のファイルコンテンツはPostgresの `Document.content` に保存)。

## AIモデル
-   **LLM**: Google Gemini 2.0 Flash (`gemini-2.0-flash`)
-   **Embeddings**: Google Text Embedding 004 (`models/text-embedding-004`)

## 外部サービス
-   **Stripe**: 決済 (チェックアウト, Webhook)
-   **Google Cloud**: デプロイ環境 (推定)
-   **LINE Platform**: Messaging API

## 開発環境
-   **Docker**: `docker-compose.yml` でフロントエンド、バックエンド、Postgres (または外部DB接続) をオーケストレーション。
-   **Prisma**: スキーマ管理用ORM。

## 制限事項 & 制約
-   **音声処理**:
    -   Free: 上限 20分。
    -   Standard: 上限 90分。
    -   Premium: 上限 180分。
-   **チャンク分割**: テキストは約1500文字で分割し、ベクトルDB接続用に150文字のオーバーラップを持たせる。
