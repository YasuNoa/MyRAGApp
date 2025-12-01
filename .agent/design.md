# 設計仕様書 (design.md)

## 1. システムアーキテクチャ

```mermaid
graph TD
    User[User] -->|Browser| Cloudflare[Cloudflare (DNS/CDN)]
    Cloudflare -->|HTTPS| CloudRun[Google Cloud Run]
    
    subgraph "Cloud Run Services"
        CloudRun --> Frontend[Next.js Frontend]
        CloudRun --> Backend[Python FastAPI Backend]
    end
    
    User -->|LINE App| LINE[LINE Platform]
    LINE -->|Webhook| Frontend
    
    Frontend -->|API Call| Backend
    Frontend -->|ORM| DB[(PostgreSQL)]
    Backend -->|SQL| DB
    
    subgraph "External Services"
        Backend -->|Embedding/Chat| Gemini[Google Gemini API]
        Backend -->|Vector Search| Pinecone[(Pinecone Vector DB)]
        Frontend -->|Auth| GoogleAuth[Google Auth]
        Frontend -->|Drive API| GDrive[Google Drive API]
    end
```

### 1.1. コンポーネント役割
*   **Next.js Frontend (App Router)**:
    *   ユーザーインターフェースの提供。
    *   認証 (NextAuth.js) の管理。
    *   BFF (Backend for Frontend) として、DBへの直接アクセスや外部APIとの連携を行う。
    *   LINE Webhookのエンドポイント (`/api/webhook/line`)。
*   **Python FastAPI Backend**:
    *   **ポート**: 8000
    *   **役割**: 計算リソースを要する処理、Pythonライブラリが豊富な処理を担当。
    *   **機能**:
        *   PDF/画像からのテキスト抽出 (OCR含む)。
        *   テキストのチャンク分割 (LangChain)。
        *   Embedding生成 (Gemini API)。
        *   PineconeへのUpsert / Query。
        *   音声文字起こし。
*   **PostgreSQL**:
    *   ユーザーデータ、セッション、ドキュメントのメタデータと**全文コンテンツ**、チャット履歴を保存。
*   **Pinecone**:
    *   ドキュメントのベクトルデータと検索用メタデータ（タグ、ファイルID等）を保存。

## 2. データベース設計 (Schema)

### 2.1. ER図 (簡易)
*   **User**: ユーザー情報。
*   **Account**: OAuth連携情報 (Google, LINE)。
*   **Document**: インポートされた知識データ。
    *   `tags`: String[] (タグ配列)
    *   `content`: String (全文テキスト)
    *   `source`: "drive", "manual", "line"
*   **Message**: チャット履歴。
    *   `category`: String (※将来的にtagsへ移行検討)

### 2.2. データフロー
1.  **インポート時**:
    *   Frontend -> (File/Text) -> Backend
    *   Backend -> (Text Extraction) -> (Chunking) -> (Embedding) -> Pinecone
    *   Backend/Frontend -> (Full Text) -> PostgreSQL ("Document" table)
2.  **検索時 (RAG)**:
    *   Frontend -> (Query) -> Backend
    *   Backend -> (Embedding) -> Pinecone (Vector Search with Filters)
    *   Backend -> (Fetch Full Content by ID) -> PostgreSQL
    *   Backend -> (Context + Query) -> Gemini -> Answer

## 3. API インターフェース (Python Backend)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/import-file` | ファイル(PDF/画像/Office)を受け取り、OCR/Embedding処理を行いPineconeとDBに保存。タグ対応。 |
| POST | `/import-text` | テキストを受け取り、Embedding処理を行いPineconeに保存。タグ対応。 |
| POST | `/process-voice-memo` | 音声ファイルを受け取り、文字起こし・要約・ベクトル化を行う。 |
| POST | `/delete-file` | 指定されたファイルIDのベクトルデータを削除する。 |
| POST | `/update-tags` | 指定されたファイルIDのタグを更新する。 |

## 4. ディレクトリ構造
```
/
├── app/                 # Next.js App Router
│   ├── api/             # API Routes (BFF)
│   ├── knowledge/       # 知識管理ページ
│   ├── notes/           # ノートページ
│   └── ...
├── backend/             # Python FastAPI Application
│   ├── main.py          # エントリーポイント
│   ├── Dockerfile       # Python環境定義
│   └── requirements.txt # Python依存ライブラリ
├── prisma/              # Prisma Schema & Migrations
├── src/
│   ├── lib/             # ユーティリティ (gemini.ts, pinecone.ts, prisma.ts)
│   └── services/        # ビジネスロジック (knowledge.ts)
├── .agent/              # エージェント用ドキュメント (本ファイル等)
└── docker-compose.yml   # コンテナ構成
```
