# 技術仕様書 (Technical Specification)

本ドキュメントは、「じぶんAI」の各機能が具体的にどのライブラリ、ツール、コードによって実装されているかを記述します。

## 1. 機能別実装詳細

### 1.1. 認証 (Authentication)
ユーザーの本人確認とセッション管理を行います。
*   **Libraries**:
    *   `next-auth` (v5 Beta): 認証基盤。
    *   `@auth/prisma-adapter`: DBへのセッション保存。
*   **Providers**:
    *   `Google Provider`: Googleアカウントログイン。
    *   `LINE Provider`: LINEアカウントログイン。
*   **Key Code**:
    *   `auth.ts`: NextAuthの設定、プロバイダ定義。
    *   `auth.config.ts`: ミドルウェアでのルート保護ロジック。
    *   `app/api/auth/[...nextauth]/route.ts`: 認証APIエンドポイント。

### 1.2. RAGチャット (Retrieval-Augmented Generation)
ユーザーの質問に対し、蓄積された知識を検索して回答を生成します。
*   **Architecture**:
    *   **Frontend (Next.js)**: ユーザー入力の受け付け、DBへのメッセージ保存、Backend APIの呼び出し。
    *   **Backend (Python)**: Embedding生成、Pinecone検索、PostgreSQLからの全文取得、Geminiによる回答生成。
*   **Libraries (Backend)**:
    *   `google-generative-ai`: Gemini API (LLM, Embedding) クライアント。
    *   `pinecone-client`: ベクトルデータベース操作。
    *   `langchain-text-splitters`: テキストのチャンク分割。
    *   `asyncpg`: PostgreSQLへの非同期アクセス（全文取得用）。
*   **Key Code**:
    *   `app/api/ask/route.ts`: チャットAPI (BFF)。
    *   `backend/main.py`:
        *   `POST /query`: RAGのメインロジック。
            1.  クエリのEmbedding生成 (`text-embedding-004`)。
            2.  Pinecone検索 (タグフィルタリング対応)。
            3.  PostgreSQLからドキュメント全文を取得 (Long Context)。
            4.  Gemini 2.0 Flash で回答生成 (Google Search Grounding 対応)。

### 1.3. ファイルインポート & OCR
PDF、画像、Officeファイルを解析し、テキストを抽出します。
*   **Libraries (Backend)**:
    *   `pypdf`: PDFからのテキスト抽出。
    *   `python-pptx`, `python-docx`, `pandas`: Office/CSVファイルの解析。
    *   `google-generative-ai`: Gemini Vision (画像/PDFのOCR)。
*   **Key Code**:
    *   `app/api/upload/route.ts`: ファイルアップロードAPI (BFF)。DBにメタデータを保存後、Backendへ転送。
    *   `backend/main.py`:
        *   `POST /import-file`: 汎用インポートエンドポイント。MIMEタイプで分岐。
        *   `_process_pdf()`: PDF解析。テキスト抽出失敗時はGemini OCRへフォールバック。
        *   `_process_image()`: Gemini Vision を用いた画像説明生成。

### 1.4. 音声文字起こし (Voice Memo)
音声ファイルをアップロードし、文字起こしと要約を行います。
*   **Libraries**:
    *   `google-generative-ai`: Gemini 2.0 Flash (Multimodal) を使用。
*   **Implementation**:
    *   従来の `Whisper` 等は使用せず、Gemini 2.0 の高いマルチモーダル性能を活用して、音声から直接テキストと要約を生成しています。
*   **Key Code**:
    *   `backend/main.py`: `POST /process-voice-memo`。

### 1.5. LINE連携 (Messaging)
LINE公式アカウントを通じて、メッセージの保存と対話を行います。
*   **Libraries**:
    *   `@line/bot-sdk`: LINE Messaging API クライアント。
*   **Implementation**:
    *   Webhookでメッセージを受信し、Geminiで意図（保存/検索）を分類してから処理を分岐します。
*   **Key Code**:
    *   `app/api/webhook/line/route.ts`: Webhookハンドラ。
    *   `src/lib/line.ts`: LINE APIラッパー。
    *   `src/lib/gemini.ts`: `classifyIntent()` (意図分類)。

### 1.6. データベース & ベクトル検索
*   **PostgreSQL (Prisma)**:
    *   `prisma/schema.prisma`: データモデル定義。
    *   `Document` テーブル: 全文データ、メタデータ。
    *   `User`, `Account` テーブル: ユーザー情報。
*   **Pinecone**:
    *   ベクトルインデックス (`myragapp`)。
    *   Metadata: `userId`, `fileId`, `tags`, `chunkIndex`, `dbId` を付与。

## 2. インフラストラクチャ構成

### 2.1. コンピューティング
*   **Google Cloud Run**:
    *   Frontend (Next.js) と Backend (FastAPI) をコンテナとしてサーバーレス実行。
    *   自動スケーリング対応。

### 2.2. ビルド & デプロイ
*   **Google Cloud Build**:
    *   `cloudbuild.yaml`: CI/CDパイプライン定義。
    *   GitHubへのPushをトリガーに、Dockerイメージのビルド、DBマイグレーション、デプロイを自動実行。
    *   **Backend**: `node:20-slim` (Debian) ベースに変更 (OpenSSL互換性のため)。

### 2.3. シークレット管理
*   **Secret Manager**:
    *   `DATABASE_URL`, `API_KEY` などの機密情報を安全に管理し、Cloud Run/Build に注入。

## 3. API インターフェース (Python Backend)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/import-file` | 汎用インポート (PDF/画像/Office/CSV)。MIMEタイプで自動判別。 |
| POST | `/import-text` | テキスト直接登録。 |
| POST | `/process-voice-memo` | 音声ファイルの文字起こし・要約・保存。 |
| POST | `/delete-file` | 指定ファイルのベクトル削除。 |
| POST | `/update-tags` | 指定ファイルのタグ更新。 |
| POST | `/query` | RAG検索＆回答生成。 |
| POST | `/classify` | 意図分類 (Gemini)。 |

## 4. ディレクトリ構造
```
/
├── app/                 # Next.js App Router
│   ├── api/             # API Routes (BFF, Webhook)
│   ├── knowledge/       # 知識管理画面
│   ├── profile/         # プロフィール画面
│   └── ...
├── backend/             # Python FastAPI Application
│   ├── main.py          # エントリーポイント & ロジック
│   ├── prompts.py       # プロンプト定義
│   └── Dockerfile       # Python環境定義
├── prisma/              # Prisma Schema
├── src/
│   ├── lib/             # Utilities (gemini, pinecone, line)
│   └── services/        # Service Layer (FrontendからBackendを呼ぶロジック等)
├── .agent/              # エージェント用ドキュメント
└── cloudbuild.yaml      # CI/CD設定
```
