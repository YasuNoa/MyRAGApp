# API Documentation

## Backend API (Python/FastAPI)
Base URL: `http://localhost:8000` (Internal)

### Chat (会話)
- **POST** `/ask`
    - **Body**:
        ```json
        {
          "query": "string (必須)",
          "userId": "string (必須)",
          "threadId": "string (任意)",
          "tags": ["string"]
        }
        ```
    - **Logic (処理フロー)**:
        1. **ユーザー解決**: `userId` (Provider ID) を内部の UUID に解決します。
        2. **制限チェック & プラン取得**: チャット回数制限を確認し、現在のユーザープランを取得します。
        3. **スレッド管理**:
           - `threadId` がない場合: 新規スレッドを作成 (タイトルはクエリから自動生成)。
           - `threadId` がある場合: 既存スレッドを取得・更新。
        4. **メッセージ保存**: ユーザーのメッセージを DB に保存します。
        5. **RAG (検索拡張生成)**:
            - **Embedding 生成**: Gemini (`models/text-embedding-004`) でクエリをベクトル化。
            - **ベクトル検索 (Pinecone)**: ベクトル DB を検索 (タグや `userId` でフィルタリング)。
            - **DB コンテンツ取得**: ヒットしたドキュメントの ID を元に、Postgres から本文を取得します。
            - **ファイル名検索**: Postgres (`Document` テーブル) に対してファイル名でのキーワード検索を行います。
            - **コンテキスト構築**: 検索結果を結合してコンテキストを作成します。
        6. **Web 検索 (DuckDuckGo)**:
            - 内部的なキーワード (「登録」「ファイル」など) が含まれ、かつコンテキストが見つかった場合はスキップ。
            - それ以外の場合、DuckDuckGo で検索を実行 (ユーザープランに基づく)。
        7. **回答生成**: Gemini 2.0 Flash を使用して、コンテキスト・Web 検索結果・クエリを元に回答を生成します。
        8. **メッセージ保存**: アシスタントの回答を DB に保存します。
    - **Returns**:
        ```json
        {
          "answer": "回答テキスト...",
          "sources": [],
          "threadId": "スレッドID"
        }
        ```

### Voice (音声)
- **POST** `/voice/process`
    - **Content-Type**: `multipart/form-data`
    - **Body**:
        - `file`: 音声ファイル (UploadFile)
        - `metadata`: JSON 文字列 `{"userId": "..."}`
    - **Logic**:
        1. 一時ファイルとして保存。
        2. `VoiceService.process_audio` を呼び出し:
           - 文字起こし (Transcription)。
           - フォーマット変換など。
    - **Returns**: 処理結果 (Transcript 等)

- **POST** `/voice/save`
    - **Body**:
        ```json
        {
          "userId": "string",
          "transcript": "string",
          "summary": "string",
          "title": "string",
          "tags": ["string"]
        }
        ```
    - **Logic**:
        - `VoiceService.save_voice_memo` を呼び出し、音声メモとして DB およびベクトル DB に保存します。
    - **Returns**: 保存されたドキュメント情報

### Health (ヘルスチェック)
- **GET** `/health`: `{"status": "ok"}`
- **GET** `/`: `{"message": "Python Backend is running!"}`

## Frontend API (Next.js App Router)

### Stripe (決済)
- **POST** `/api/stripe/checkout`
    - **Body**: `{"plan": "STANDARD" | "PREMIUM" | "TICKET", "interval": "month" | "year" | "one_time"}`
    - **Returns**: `{"url": "stripe_checkout_url"}`
- **POST** `/api/stripe/webhook`
    - **Logic**:
        - `checkout.session.completed`: サブスクリプション有効化、チケット残高追加、リファラル処理。
        - その他: `customer.subscription.updated`, `deleted` などのイベントを処理。

### Knowledge / Upload (ナレッジ・アップロード)
- **POST** `/api/knowledge/list`: ユーザーのドキュメント一覧を取得。
- **POST** `/api/knowledge/delete`: ドキュメントを削除 (Backend のクリーンアップ処理も含む)。
- **POST** `/api/upload`: ファイルアップロード処理 (Backend の `process-and-save-content` ロジック等と連携)。

### Auth (認証)
- **GET/POST** `/api/auth/[...nextauth]`: NextAuth.js によるログイン/ログアウト/セッション管理エンドポイント。
