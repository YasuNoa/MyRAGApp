# API ドキュメント (Internal API)

本ドキュメントは、Frontend (Next.js) と Backend (Python FastAPI) 間の通信インターフェースを定義します。

## Base URL
*   **Local**: `http://localhost:8000`
*   **Docker/Cloud Run**: `http://backend:8000` (環境変数 `PYTHON_BACKEND_URL` で指定)

## Endpoints

### 1. File Import
ファイルをインポートし、テキスト抽出・ベクトル化・保存を行います。

*   **URL**: `/import-file`
*   **Method**: `POST`
*   **Content-Type**: `multipart/form-data`
*   **Parameters**:
    *   `file`: UploadFile (Required) - アップロードするファイル。
    *   `metadata`: JSON String (Required)
        ```json
        {
            "userId": "user_123",
            "fileId": "uuid_v4",
            "fileName": "example.pdf",
            "mimeType": "application/pdf",
            "tags": ["tag1", "tag2"],
            "dbId": "document_id_from_postgres"
        }
        ```
*   **Response**:
    ```json
    {
        "status": "success",
        "message": "Successfully processed example.pdf",
        "chunks_count": 15,
        "fileId": "uuid_v4"
    }
    ```

### 2. Voice Memo Processing
音声ファイルを文字起こし・要約し、保存します。

*   **URL**: `/process-voice-memo`
*   **Method**: `POST`
*   **Content-Type**: `multipart/form-data`
*   **Parameters**:
    *   `file`: UploadFile (Required) - 音声ファイル (mp3, wav, m4a, etc.)
    *   `metadata`: JSON String (Required)
        ```json
        {
            "userId": "user_123",
            "fileId": "uuid_v4",
            "tags": ["VoiceMemo"],
            "dbId": "document_id_from_postgres"
        }
        ```
    *   `save`: Boolean (Optional, default=True) - 保存するかどうか。
*   **Response**:
    ```json
    {
        "status": "success",
        "transcript": "...",
        "summary": "...",
        "chunks_count": 5
    }
    ```

### 3. Text Import
テキストを直接インポートします。

*   **URL**: `/import-text`
*   **Method**: `POST`
*   **Content-Type**: `application/json`
*   **Body**:
    ```json
    {
        "text": "保存したいテキスト内容...",
        "userId": "user_123",
        "tags": ["memo"],
        "summary": "要約（任意）",
        "dbId": "document_id_from_postgres"
    }
    ```
*   **Response**:
    ```json
    {
        "status": "success",
        "fileId": "generated_uuid",
        "chunks_count": 1
    }
    ```

### 4. RAG Query
質問に対してRAG検索を行い、回答を生成します。

*   **URL**: `/query`
*   **Method**: `POST`
*   **Content-Type**: `application/json`
*   **Body**:
    ```json
    {
        "query": "ユーザーの質問",
        "userId": "user_123",
        "tags": ["tag1"] // フィルタリング用（任意）
    }
    ```
*   **Response**:
    ```json
    {
        "answer": "AIによる回答..."
    }
    ```

### 5. Intent Classification
テキストの意図を分類します。

*   **URL**: `/classify`
*   **Method**: `POST`
*   **Content-Type**: `application/json`
*   **Body**:
    ```json
    {
        "text": "ユーザーの入力テキスト"
    }
    ```
*   **Response**:
    ```json
    {
        "intent": "STORE" | "SEARCH" | "REVIEW",
        "tags": ["tag1", "tag2"]
    }
    ```

### 6. Delete File
ファイルのベクトルデータを削除します。

*   **URL**: `/delete-file`
*   **Method**: `POST`
*   **Content-Type**: `application/json`
*   **Body**:
    ```json
    {
        "fileId": "uuid_v4",
        "userId": "user_123"
    }
    ```
*   **Response**:
    ```json
    {
        "status": "success",
        "message": "Deleted vectors for file ..."
    }
    ```

### 7. Update Tags
ファイルのタグを更新します。

*   **URL**: `/update-tags`
*   **Method**: `POST`
*   **Content-Type**: `application/json`
*   **Body**:
    ```json
    {
        "fileId": "uuid_v4",
        "userId": "user_123",
        "tags": ["new_tag1", "new_tag2"]
    }
    ```
*   **Response**:
    ```json
    {
        "status": "success",
        "message": "Updated tags for N vectors"
    }
    ```
