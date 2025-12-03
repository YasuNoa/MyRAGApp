# データベーススキーマ (Database Schema)

## 概要
リレーショナルデータベースとして **PostgreSQL**、ベクトルデータベースとして **Pinecone** を使用しています。

## PostgreSQL スキーマ (Prisma)

### `User` (ユーザー)
アカウント情報を管理します。
*   `id`: String (CUID) - 主キー
*   `name`: String - 表示名
*   `email`: String - ユニークなメールアドレス
*   `image`: String - プロフィール画像URL
*   `metadata`: Json - 追加設定 (例: AIの名前)
*   *リレーション*: `accounts`, `sessions`, `messages`, `documents`, `feedbacks`

### `Document` (ドキュメント)
知識ベースのアイテム（ファイル、ノート）を管理します。
*   `id`: String (CUID) - 主キー
*   `userId`: String - 所有者
*   `title`: String - ファイル名またはタイトル
*   `content`: String (Text) - 抽出された全文 (ロングコンテキストRAG用)
*   `summary`: String (Text) - AI生成の要約
*   `type`: String - "knowledge" (デフォルト) または "note"
*   `tags`: String[] - タグの配列
*   `source`: String - "manual", "google-drive", "line", "voicememo"
*   `mimeType`: String - 例: "application/pdf", "audio/mpeg"
*   `externalId`: String - Pineconeベクトルと紐付けるためのID
*   `fileCreatedAt`: DateTime - ファイル自体の作成日時

### `Message` (メッセージ)
チャット履歴を保存します。
*   `id`: String (CUID) - 主キー
*   `content`: String - メッセージ本文
*   `role`: String - "user" または "assistant"
*   `userId`: String - 所有者
*   `category`: String - 分類 (例: "General", "Math")

### `Account` (アカウント)
OAuth認証情報 (NextAuth) を管理します。
*   `provider`: "google", "line"
*   `providerAccountId`: プロバイダ側のID
*   `access_token`, `refresh_token`: APIアクセス用

## Pinecone スキーマ

### Index: `myragapp`
*   **Dimensions**: 768 (Gemini `text-embedding-004`)
*   **Metric**: Cosine (コサイン類似度)

### ベクトルメタデータ (Vector Metadata)
Pineconeに保存される各ベクトルは、フィルタリング用に以下のメタデータを持ちます：
*   `userId`: String - **重要** データ分離に使用。
*   `fileId`: String - `Document.externalId` とリンク。
*   `chunkIndex`: Integer - チャンクの順序 (0, 1, 2...)。
*   `tags`: List[String] - タグベースのフィルタリング用。
*   `text`: String - 実際のテキストチャンク内容。
