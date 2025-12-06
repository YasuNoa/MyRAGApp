# システム仕様書 (System Specification)

## 1. アーキテクチャ概要
フロントエンド (UI/認証) と バックエンド (AI/ロジック) を分離した **マイクロサービスライク** な構成を採用しています。

```mermaid
graph TD
    User[ユーザー] -->|Web| NextJS[Next.js Frontend]
    User -->|LINE| LineWebhook[Next.js API Route]
    
    subgraph "Google Cloud Platform"
        NextJS -->|認証| NextAuth[NextAuth.js]
        NextJS -->|APIコール| PythonAPI[FastAPI Backend]
        LineWebhook -->|APIコール| PythonAPI
        
        PythonAPI -->|Read/Write| Postgres[(PostgreSQL)]
        PythonAPI -->|ベクトル検索| Pinecone[(Pinecone Vector DB)]
        PythonAPI -->|AI処理| Gemini[Google Gemini 2.0 Flash]
    end
```

## 2. 技術スタック

### フロントエンド
*   **フレームワーク**: Next.js 14+ (App Router)
*   **言語**: TypeScript
*   **スタイリング**: Tailwind CSS, Vanilla CSS (ネオブルータリズム/モダンデザイン)
*   **認証**: NextAuth.js v5 (Google, LINE プロバイダ)
*   **状態管理**: React Context (ChatContext, SidebarContext)

### バックエンド
*   **フレームワーク**: FastAPI (Python)
*   **言語**: Python 3.11+
*   **AIモデル**:
    *   **生成**: Google Gemini 2.0 Flash (`gemini-2.0-flash`) - 全ての生成タスクで使用
*   **ベクトルDB**: Pinecone (Index: `myragapp`)
*   **埋め込みモデル**: Google `models/text-embedding-004` (768次元)
*   **データベース**: PostgreSQL (`asyncpg` for Python, `prisma` for Next.js)
*   **ツール**: LangChain (テキスト分割), PyPDF, Pandas (Excel), python-docx, python-pptx, **ffmpeg** (音声処理).

### インフラストラクチャ
*   **コンテナ化**: Docker, Docker Compose
*   **CI/CD**: Google Cloud Build
*   **ホスティング**: Google Cloud Run
*   **データベース**: Google Cloud SQL (PostgreSQL) または Supabase (開発用)

## 3. 認証とユーザーライフサイクル (Authentication & Lifecycle)

### 3.1 デュアルセーフガード戦略 (Dual Safeguard Strategy)
ユーザーのプラン割り当てに関して、**整合性 (Consistency)** と **堅牢性 (Robustness)** を両立させるため、以下の二重の戦略を採用しています。

1.  **Entry Point Safeguard (Auth Hooks)**:
    *   ユーザーがログイン (`NextAuth.js`) した瞬間に、`jwt` コールバック内で `UserSubscription` の存在を確認。
    *   存在しない場合、即座にデフォルトの `FREE` プランを作成します。
    *   *目的*: アプリケーション利用開始時にデータ整合性を保証する。

2.  **Execution Safeguard (Backend Fallback)**:
    *   バックエンド (`FastAPI`) でリクエストを処理する際（例: 音声処理）、`get_user_plan` 関数でプランを取得。
    *   万が一ここでプランが見つからない場合（Authフックの失敗や直接APIコールの可能性）、ここで **Lazy Creation** を行い `FREE` プランを作成して処理を続行します。
    *   *目的*: 予期せぬデータ欠損によるクラッシュ（500エラー）を完全防衛する。

## 4. データフロー

### 3.1 音声/ファイルインポートフロー
1.  **アップロード**: ユーザーがWeb UI からファイルをアップロード。
2.  **APIコール**: Next.js (`/api/voice/process`) が Python Backend (`/process-voice-memo`) にファイルを送信。
3.  **事前チェック & 抽出**:
    *   **プラン確認**: `get_user_plan` でプランを取得 (Dual Safeguard)。
    *   **制限チェック**:
        *   **Storage Limit**: 全ファイルの合計数がプラン上限 (Free: 5, Std: 200...) 未満かチェック。
        *   **Voice Limit**: `UserSubscription.dailyVoiceCount` (Free: 5回/日) をチェック & インクリメント。
    *   **一時保存**: `/tmp` にファイルを保存。
    *   **Gemini処理**: Gemini 2.0 Flash にアップロードし、文字起こし (transcript) と要約 (summary) を生成。
4.  **分割・埋め込み**:
    *   **チャンク分割**: `RecursiveCharacterTextSplitter` (Size: 1500, Overlap: 150)。
    *   **ベクトル化**: `text-embedding-004` で埋め込み生成。
5.  **保存**:
    *   **ベクトル**: Pinecone にメタデータ (`userId`, `fileId`, `tags`, `type="transcript"|"summary"`) と共に保存(Batch Upsert)。
    *   **コンテンツ**: 全文テキストと要約を PostgreSQL の `Document` レコードに更新 (Client側で作成した `dbId` を使用)。

### 3.2 RAGチャットフロー
1.  **クエリ**: ユーザーがチャットUI (`/api/ask`) またはLINEからメッセージを送信。
2.  **保存**: Next.jsがユーザーのメッセージを `Message` テーブルに保存。
3.  **検索**: Python Backend (`/query`) へリクエスト (`userPlan` を同梱)。
    *   クエリをベクトル化し、Pinecone を検索。
    *   必要に応じてPostgreSQLから全文を取得 (Long Context)。
    *   Google検索 (Grounding) を実行 (Planによる)。
4.  **生成**: Gemini 2.0 Flash が、検索結果 + Google検索結果を元に回答を生成。
5.  **保存**: Next.jsがAIの回答を `Message` テーブルに保存。
6.  **応答**: 回答をユーザーに返却。

### 3.3 体験版 (Trial) フロー
1.  **アクセス**: 未ログインユーザーが `/` または `/trial` にアクセス。
2.  **セッション**: 初回アクセス時に `GuestSession` を作成 (Cookie: `guestSessionId`)。
3.  **チャット**:
    *   `/api/trial/chat` をコール。
    *   `GuestSession.chatCount` をチェック (Max 2)。
    *   Gemini (Search Toolなし) で回答生成。
    *   履歴を `GuestSession.messages` に保存。
4.  **音声メモ**:
    *   `/api/trial/voice` をコール。
    *   `GuestSession.voiceCount` をチェック (Max 1)。
    *   Gemini で要約生成。
    *   結果を `GuestSession.voiceMemo` に保存。

## 4. データベース構成 (概念)

### PostgreSQL (Prisma)
 主要なテーブル構成:

*   **User**: ユーザー基本情報 (Name, Email, Password等)。
*   **UserSubscription**:
    *   プラン (FREE, STANDARD, PREMIUM)。
    *   利用制限管理用のカウンタ (`dailyChatCount`, `dailyVoiceCount`, `monthlyVoiceMinutes`)。
    *   Stripe連携ID。
*   **Document**: 知識データ。メタデータ (タイトル, タイプ, タグ) + コンテンツ (テキスト, 要約)。
*   **Thread**: チャットスレッド。
*   **Message**: チャット履歴 (User/Assistant)。`Thread` に紐づく。
*   **Account**: OAuthトークン (Google, LINE)。
*   **GuestSession**: 体験版ユーザーの一時データ。
*   **Feedback**: ユーザーからのフィードバック。

### Pinecone (Index: `myragapp`)
*   **Namespace**: なし (メタデータ `userId` でフィルタリング)。
*   **Metadata**: `userId`, `fileId`, `chunkIndex`, `tags`, `text` (チャンク内容), `type` ("transcript" or "summary")。
