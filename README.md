# じぶんAI (Jibun AI)

## 概要
「じぶんAI」は、LINEを通じてユーザーの日々の発言や思考を蓄積し、AIが「分身」として対話を行うパーソナルアシスタントアプリケーションです。
RAG (Retrieval-Augmented Generation) 技術を活用し、過去の会話や記録に基づいた文脈理解と応答を実現しています。

## 特徴
*   **LINE Botインターフェース**: 普段使い慣れたLINEアプリから、自然な会話形式で利用可能。
*   **長期記憶 (RAG)**: Supabase Vector (pgvector) を使用し、過去の発言を半永久的に記憶・検索可能。
*   **意図・カテゴリ自動分類**: Google Gemini APIにより、ユーザーの発言意図（保存/検索）やカテゴリ（仕事、趣味など）を自動で判別。
*   **ユーザー管理**: LINEログイン認証と連携し、ユーザーごとのデータをセキュアに管理。

## 技術スタック
*   **Frontend**: Next.js 15 (App Router), TypeScript, Auth.js
*   **Backend**: Python (FastAPI)
*   **Database**: PostgreSQL (Prisma ORM for schema management)
*   **Vector Database**: Supabase Vector (pgvector)
*   **LLM**: Google Gemini API (gemini-2.0-flash)
*   **Messaging Platform**: LINE Messaging API
*   **Infrastructure**: Vercel (Frontend), Google Cloud Run (Backend), Docker (Dev Experience)

## ディレクトリ構成
*   `app/`: Next.js アプリケーションコード (Frontend / BFF)
*   `backend/`: Python FastAPI アプリケーションコード (AI Logic / RAG)
*   `src/lib/`: 外部サービス連携ロジック (Shared Utilities)
*   `prisma/`: データベーススキーマとマイグレーション
*   `docs/`: 要件定義書および仕様書
*   `report2025/`: 開発進捗ログ (旧 agent_manegemant)

## セットアップ手順 (開発環境)

### 1. 前提条件
*   Node.js (v18以上)
*   Docker / Docker Compose
*   LINE Developers アカウント
*   Google Cloud Platform アカウント (Gemini API)
*   Supabase アカウント (Vector Search用)

### 2. インストール
リポジトリをクローンし、依存関係をインストールします。
```bash
git clone https://github.com/YasuNoa/MyRAGApp.git
cd MyRAGApp
npm install
```

### 3. 環境変数の設定
`.env.example` をコピーして `.env` を作成し、各APIキーを設定します。
```bash
cp .env.example .env
```

### 4. データベースの起動
Docker Composeを使用してPostgreSQLを起動します。
```bash
docker compose up -d
```

### 5. マイグレーションの適用
Prismaを使用してデータベーススキーマを適用します。
```bash
npx prisma migrate dev
```

### 6. アプリケーションの起動
開発サーバーを起動します。
```bash
npm run dev
```

## ドキュメント
詳細な要件や仕様については、以下のドキュメントを参照してください。
*   [要件定義書](docs/requirements.md)
*   [基本仕様書](docs/specifications.md)

WebUI：https://jibunai.vercel.app/
公式LINE：https://line.me/ti/p/@662awtth
