# API仕様書 (API Documentation)

## Python Backend (FastAPI)
Base URL: `http://backend:8000` (内部) / `https://...` (本番)

### ファイル操作

#### `POST /import-file`
ファイルインポートの統合エンドポイント。
*   **Input**: `Multipart/Form-Data`
    *   `file`: Binary (PDF, JPG, PNG, MP3, M4A, WAV, PPTX, DOCX, XLSX, CSV, TXT)
    *   `metadata`: JSON String
        ```json
        {
          "fileId": "uuid...",
          "tags": ["tag1", "tag2"],
          "dbId": "cuid...", // Optional: Postgres Document ID
          "userPlan": "FREE" // Optional: "FREE" | "STANDARD" | "PREMIUM"
        }
        ```
*   **処理**: OCR/文字起こし -> チャンク分割 -> 埋め込み -> Pinecone & Postgres保存。

#### `POST /import-text`
テキストデータの直接インポート。
*   **Input**: JSON
    ```json
    {
      "text": "...",
      "userId": "cuid...",
      "source": "manual",
      "tags": ["tag1"]
    }
    ```

#### `POST /delete-file`
指定ファイルの全ベクトルを削除。
*   **Input**: JSON `{ "fileId": "uuid...", "userId": "cuid..." }`

#### `POST /update-tags`
指定ファイルのタグを更新。
*   **Input**: JSON `{ "fileId": "uuid...", "userId": "cuid...", "tags": ["new_tag"] }`

### AI操作

#### `POST /query`
RAG検索 & チャット応答生成。
*   **Input**: JSON
    ```json
    {
      "query": "...",
      "userId": "cuid...",
      "tags": [], // Optional filtering
      "userPlan": "FREE" // Required for search/grounding limits
    }
    ```
*   **Output**: JSON `{ "answer": "..." }`
*   **ロジック**: クエリ埋め込み -> Pinecone検索 (Top-K) -> 全文取得 (Postgres) -> Gemini回答生成 (Google検索付き)。

#### `POST /classify`
ユーザー意図の分類。
*   **Input**: JSON `{ "text": "..." }`
*   **Output**: JSON
    ```json
    {
      "intent": "CHAT" | "STORE" | "REVIEW",
      "category": "General" // Optional
    }
    ```

## Next.js API Routes
Base URL: `/api`

### `POST /api/upload`
Backend `/import-file` へのラッパー。
1.  Postgresに `Document` レコードを作成。
2.  Backend `/import-file` を `dbId` 付きで呼び出し。
3.  成功/失敗を返す。

### `POST /api/voice/process`
ボイスメモ処理用ラッパー。
*   Backend `/process-voice-memo` を呼び出す。

### `POST /api/trial/chat`
体験版チャット。
*   **制限**: 1セッションあたり2回まで。
*   **機能**: Gemini 2.0 Flashによる単純応答 (検索なし)。
*   **保存**: `GuestSession` に履歴を保存。

### `POST /api/trial/voice`
体験版音声メモ。
*   **制限**: 1セッションあたり1回まで。
*   **機能**: 音声アップロード -> Gemini要約。
*   **保存**: `GuestSession` に要約を保存。

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
