# 機能一覧 (Features)

## 1. 知識インポート (Knowledge Import)

### 1.1. ファイルアップロード
*   **対応フォーマット**:
    *   **PDF**: テキスト抽出 + Gemini VisionによるOCRフォールバック。
    *   **画像**: JPEG, PNG, WEBP。Gemini Visionで画像説明を生成。
    *   **Office**: Word (.docx), Excel (.xlsx), PowerPoint (.pptx)。テキスト抽出。
    *   **CSV**: テキストとして取り込み。
*   **処理フロー**:
    1.  Frontendでファイル選択。
    2.  `KnowledgeService` がDBにメタデータ（タイトル, タグ, Source）を保存。
    3.  Backendへ転送し、テキスト抽出 & Vector Embedding生成。
    4.  PineconeへUpsert。
    5.  抽出されたテキスト全文をPostgreSQLへ保存（Long Context用）。

### 1.2. 音声メモ (Voice Memo)
*   **機能**: 音声ファイルをアップロードし、議事録やアイデアメモとして保存。
*   **AI処理**: Gemini 2.0 Flash (Multimodal) を使用。
    *   **Transcript**: 高精度な文字起こし。
    *   **Summary**: 内容の要約。
*   **保存**: TranscriptとSummaryの両方をベクトル化して保存。

### 1.3. テキスト直接入力
*   **機能**: UIからメモやアイデアを直接入力して保存。
*   **タグ付け**: 保存時にタグを付与可能。

### 1.4. Google Drive連携
*   **機能**: Google Drive Pickerを使用してファイルを選択・インポート。
*   **対応**: Google Docs, Slides, Sheets, PDF。

## 2. 検索・対話 (Search & Chat)

### 2.1. RAGチャット
*   **機能**: 自然言語での質問に対し、保存された知識に基づいて回答。
*   **ロジック**:
    1.  **Query Embedding**: 質問をベクトル化。
    2.  **Vector Search**: Pineconeから類似チャンクを検索 (Top-K)。
    3.  **Filtering**: ユーザーIDとタグによる絞り込み。
    4.  **Content Retrieval**: ヒットしたドキュメントの**全文**をPostgreSQLから取得。
    5.  **Answer Generation**: Gemini 2.0 Flash に「質問 + 検索結果(全文)」を与えて回答生成。
    6.  **Grounding**: 内部知識で不足する場合、Google検索を実行して最新情報を補完。

### 2.2. Intent Classification (意図分類)
*   **機能**: ユーザーの入力が「検索(SEARCH)」「保存(STORE)」「振り返り(REVIEW)」のどれかを自動判別。
*   **LINE連携時**:
    *   "STORE": メッセージを知識として保存。
    *   "SEARCH": RAG検索を実行して回答。

### 2.3. タグフィルタリング
*   **機能**: チャット画面でタグを選択し、検索対象を特定のトピック（例：「仕事」「アイデア」）に限定。

## 3. 管理機能

### 3.1. 知識一覧 (Knowledge Base)
*   **機能**: 保存されたドキュメントの一覧表示。
*   **操作**:
    *   詳細表示（全文確認）。
    *   タグ編集。
    *   削除（DBとPineconeの両方から削除）。

### 3.2. プロフィール設定
*   **機能**: ユーザー名、アイコンの確認。アカウント削除。

## 4. LINE連携
*   **機能**: LINE公式アカウントを友だち追加して利用。
*   **特徴**:
    *   テキストメッセージ送信 → 自動保存 or 検索（意図分類）。
    *   画像送信 → 画像説明を生成して保存（予定）。
    *   音声送信 → 文字起こしして保存（予定）。
