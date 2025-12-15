# 2025-12-14: Backend Migration (Phase 1) Report

## 目的
Web (Next.js) と iOS (Future) で**バックエンドを共通化**するため、これまでNext.jsのAPI Routes (`app/api/*`) に記述されていたビジネスロジックとDB操作を、Python FastAPI (`backend/`) に移行するプロジェクトを開始しました。

## 実施内容

### 1. Python環境の強化
- **Prismaの導入**: `prisma-client-py` をインストールし、Pythonから既存のPostgreSQLスキーマ (`schema.prisma`) をそのまま利用してDB操作ができる環境を構築しました。
- **ホットリロード有効化**: Docker開発環境で `backend` サービスのホットリロード (`--reload`) を有効にし、開発効率を向上させました。

### 2. Chat APIの移行 (`/ask`)
- **Before**:
    - `Next.js`: 認証 → DB保存 (User) → PythonへFetch → DB保存 (Assistant) → 返却
    - `Python`: RAG処理のみ
- **After**:
    - `Next.js`: 認証 → PythonへFetch (Proxy) → 返却
    - `Python`: **DB保存 (User) → RAG処理 → DB保存 (Assistant)**
- **成果**:
    - チャット機能に関する「状態管理（DB操作）」と「知能（AI処理）」がPython側に集約されました。
    - iOSアプリからは、このPythonエンドポイント (`/ask`) を直接叩くだけで、Webと同じチャット体験（履歴保存含む）を実装可能になりました。

## 次のステップ
- **Voice APIの移行**: 音声処理 (`/import-file`) のDB保存ロジックも同様にPythonへ完全移行します。
- **共通APIの整備**: タグ管理や知恵袋（ナレッジ）の一覧取得APIなども随時移行していきます。
