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

### `GuestSession` (ゲストセッション)
体験版ユーザーの一時データを管理します。
*   `id`: String (CUID) - 主キー
*   `ipAddress`: String - レート制限用
*   `createdAt`: DateTime - 作成日時
*   `expiresAt`: DateTime - 有効期限 (1時間)
*   `chatCount`: Int - チャット利用回数 (Max 2)
*   `voiceCount`: Int - 音声利用回数 (Max 1)
*   `messages`: Json[] - チャット履歴
*   `voiceMemo`: String - 音声要約結果

### `UserSubscription` (サブスクリプション)
ユーザーのプランと利用制限を管理します。
*   `id`: String (CUID) - 主キー
*   `userId`: String - ユーザーID (Unique)
*   `plan`: Enum (FREE, STANDARD, PREMIUM) - 現在のプラン
*   `dailyChatCount`: Int - 本日のチャット送信数。**Free**: 上限10回/2h (リセット: `lastChatResetAt` + 2h)。**Std/Prem**: 上限100/200回 (リセット: 日付変更JST)。
*   `lastChatResetAt`: DateTime - チャット制限のリセット判定日時。
*   `dailyVoiceCount`: Int - **Free専用**: 本日の音声処理回数 (上限5回/日, リセット: 日付変更JST)。
*   `lastVoiceDate`: DateTime - 音声回数のリセット判定日時。
*   `monthlyVoiceMinutes`: Int - **Std/Prem専用**: 今月の音声処理時間 (分) (上限1800/6000分, リセット: 月初)。
*   `purchasedVoiceBalance`: Int - 追加購入した音声時間 (チケット)。

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
