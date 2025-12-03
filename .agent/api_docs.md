# API仕様書 (API Documentation)

## Python Backend (FastAPI)
Base URL: `http://backend:8000` (内部) / `https://...` (本番)

### ファイル操作

#### `POST /import-file`
ファイルインポートの統合エンドポイント。
*   **Input**: `Multipart/Form-Data`
    *   `file`: バイナリファイル
    *   `metadata`: JSON文字列 (`{"userId": "...", "mimeType": "...", "tags": [...]}`)
*   **対応形式**: PDF, 画像, PPTX, DOCX, XLSX, CSV, 音声 (MP3/M4A/WAV), テキスト。
*   **処理**: OCR/文字起こし -> チャンク分割 -> 埋め込み -> Pinecone & Postgres保存。

#### `POST /import-text`
テキストデータの直接インポート。
*   **Input**: JSON `{ "text": "...", "userId": "...", "tags": [...] }`

#### `POST /delete-file`
指定ファイルの全ベクトルを削除。
*   **Input**: JSON `{ "fileId": "...", "userId": "..." }`

#### `POST /update-tags`
指定ファイルのタグを更新。
*   **Input**: JSON `{ "fileId": "...", "userId": "...", "tags": [...] }`

### AI操作

#### `POST /query`
RAG検索 & チャット応答生成。
*   **Input**: JSON `{ "query": "...", "userId": "...", "tags": [...] }`
*   **Output**: JSON `{ "answer": "..." }`
*   **ロジック**: クエリ埋め込み -> Pinecone検索 -> 全文取得 (Postgres) -> Gemini回答生成 (Google検索付き)。

#### `POST /classify`
ユーザー意図の分類。
*   **Input**: JSON `{ "text": "..." }`
*   **Output**: JSON `{ "intent": "CHAT" | "STORE" | "REVIEW", "category": "..." }`

## Next.js API Routes
Base URL: `/api`

### `POST /api/upload`
Backend `/import-file` へのラッパー。
1.  Postgresに `Document` レコードを作成。
2.  Backend `/import-file` を `dbId` 付きで呼び出し。
3.  成功/失敗を返す。

### `POST /api/voice/process`
ボイスメモ処理用ラッパー (レガシー/特定用途)。
*   Backend `/process-voice-memo` (または `/import-file`) を呼び出す。

### `POST /api/webhook/line`
LINE Messaging API Webhook。
*   **ロジック**:
    1.  署名検証。
    2.  `Account` テーブルからユーザー特定。
    3.  意図分類 (`/classify` またはローカルGemini)。
    4.  **STORE**: メッセージをDocumentとして保存。
    5.  **REVIEW**: 今日のメッセージを取得して要約。
    6.  **CHAT**: `/query` を呼び出して回答。
    7.  LINE API経由で返信。
