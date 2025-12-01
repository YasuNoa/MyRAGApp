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
*   **Libraries (Backend)**:
    *   `google-generative-ai`: Gemini API (LLM, Embedding) クライアント。
    *   `pinecone-client`: ベクトルデータベース操作。
    *   `langchain-text-splitters`: テキストのチャンク分割。
    *   `sentence-transformers`: Cross-Encoderによる検索結果のRe-ranking (精度向上)。
*   **Key Code**:
    *   `backend/main.py`:
        *   `get_embedding()`: テキストのベクトル化。
        *   `chunk_text()`: 長文の分割。
        *   `import_text()` / `import_file()`: データの保存処理。
    *   `app/api/chat/route.ts`: チャットUIからのリクエスト処理 (BFF)。

### 1.3. ファイルインポート & OCR
PDF、画像、Officeファイルを解析し、テキストを抽出します。
*   **Libraries (Backend)**:
    *   `pypdf`: PDFからのテキスト抽出。
    *   `pdf2image`: PDFを画像に変換 (OCR前処理)。
    *   `pytesseract`: Tesseract OCR エンジン (画像からの文字認識)。
    *   `python-pptx`, `python-docx`, `pandas`: Office/CSVファイルの解析。
*   **Key Code**:
    *   `backend/main.py`:
        *   `extract_text_from_pdf()`: PDF解析。
        *   `extract_text_with_ocr()`: OCR処理。
        *   `_process_image()`: Gemini Vision を用いた画像説明生成。

### 1.4. 音声文字起こし (Voice Memo)
音声ファイルをアップロードし、文字起こしと要約を行います。
*   **Libraries**:
    *   `google-generative-ai`: Gemini 2.0 Flash (Multimodal) を使用。
*   **Implementation**:
    *   従来の `Whisper` 等は使用せず、Gemini 2.0 の高いマルチモーダル性能を活用して、音声から直接テキストと要約を生成しています。
*   **Key Code**:
    *   `backend/main.py`: `process_voice_memo()` エンドポイント。

### 1.5. LINE連携 (Messaging)
LINE公式アカウントを通じて、メッセージの保存と対話を行います。
*   **Libraries**:
    *   `@line/bot-sdk`: LINE Messaging API クライアント。
*   **Implementation**:
    *   Webhookでメッセージを受信し、Geminiで意図（保存/検索）を分類してから処理を分岐します。
*   **Key Code**:
    *   `app/api/webhook/line/route.ts`: Webhookハンドラ。
    *   `src/lib/line.ts`: LINE APIラッパー。

### 1.6. データベース & ベクトル検索
*   **PostgreSQL (Prisma)**:
    *   `prisma/schema.prisma`: データモデル定義。
    *   `Document` テーブル: 全文データ、メタデータ。
    *   `User`, `Account` テーブル: ユーザー情報。
*   **Pinecone**:
    *   ベクトルインデックス (`myragapp`)。
    *   Metadata: `userId`, `fileId`, `tags` を付与してフィルタリングに使用。

## 2. インフラストラクチャ構成

### 2.1. コンピューティング
*   **Google Cloud Run**:
    *   Frontend (Next.js) と Backend (FastAPI) をコンテナとしてサーバーレス実行。
    *   自動スケーリング対応。

### 2.2. ビルド & デプロイ
*   **Google Cloud Build**:
    *   `cloudbuild.yaml`: CI/CDパイプライン定義。
    *   GitHubへのPushをトリガーに、Dockerイメージのビルド、DBマイグレーション、デプロイを自動実行。

### 2.3. シークレット管理
*   **Secret Manager**:
    *   `DATABASE_URL`, `API_KEY` などの機密情報を安全に管理し、Cloud Run/Build に注入。
