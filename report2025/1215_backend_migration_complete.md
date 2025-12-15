# 2025-12-15: Backend Migration (Complete) Report

## 概要
Python Backendへの主要機能の移行およびデータベース設計の刷新が完了しました。
これにより、「AI処理とDB保存の一貫性」が保たれ、FrontendはUI/UXに集中できる構成となりました。

## 完了したフェーズ

### 1. Chat API 移行 (`/ask`)
- **完了日**: 12/14
- **内容**: RAG検索、会話履歴の保存、プラン制御をPythonに完全移行。
- **成果**: 単一のエンドポイントでチャット機能が完結するようになりました。

### 2. Voice API 移行 (`/voice`)
- **完了日**: 12/15
- **内容**:
    - 音声データ処理 (`/voice/process`)、要約生成、DB保存 (`/voice/save`) をPythonに移行。
    - Frontend (`api/voice/*`) はプロキシ化のみ。
- **成果**: 録音データの解析から保存までがバックエンド内で完結し、クライアント側の責務が大幅に軽減されました。

### 3. IDアーキテクチャ刷新 (Cleanup)
- **完了日**: 12/15
- **内容**:
    - **`externalId` (UUID) の廃止**: `Document` テーブルから削除。
    - **IDの統一**: PineconeのベクトルIDとして、DBの主キー (`id`) を採用。
    - **専用IDの新設**: `googleDriveId`, `lineMessageId` を新設し、「1カラム1の意味」を徹底。
- **成果**: データの整合性が保証され、デバッグや追跡が容易になりました。

### 4. Knowledge API 整理
- **完了日**: 12/15
- **内容**:
    - `src/lib/pinecone.ts` (Node.js用クライアント) を削除。
    - Frontendからの直接的なPinecone操作を全廃し、Python経由に統一。

## 現在のアーキテクチャ (責務分担)

| コンポーネント | 主な役割 | 扱うデータ |
| --- | --- | --- |
| **Frontend (Next.js)** | ユーザー認証 (Auth.js)<br>UI描画 / ルーティング<br>課金管理 (Stripe)<br>単純な一覧表示 (Prisma) | `User`, `Account`<br>`UserSubscription`<br>`Document` (Read Only/List) |
| **Backend (Python)** | AI処理 (Gemini)<br>ベクトル検索 (Pinecone)<br>チャット/音声/知識の保存<br>RAGロジック | `Document` (Write/Vector)<br>`Message` (Write)<br>Pinecone Vectors |

## 今後の展望
- **iOSアプリ開発**: すべての主要ロジックがPython API化されたため、iOS側はこれらのAPIを叩くだけで同じ機能を実装可能です。
- **機能拡張**: AIのロジック変更やモデルの差し替え等は、Python側のみを変更すれば全クライアントに反映されます。
