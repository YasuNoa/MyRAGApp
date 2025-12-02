# Cloud Build & Prisma 修正レポート

## 1. 問題の概要
Cloud Build パイプラインの「Build Frontend」ステップにおいて、`PrismaClientInitializationError` によりビルドが失敗していました。エラー内容は `libssl.so.1.1` ライブラリの欠損を示しており、これは Alpine ベースの Node.js イメージと Prisma が期待する OpenSSL バージョンの不整合が原因でした。さらに、Cloud Build のタイムアウトや、デプロイ時のデータベースリセット（データ消失）の問題もありました。

## 2. 実施した修正

### 2.1. Dockerfile の更新 (Frontend)
*   **ファイル**: `Dockerfile`
*   **変更点**: ベースイメージを `node:20-alpine` から `node:20-slim` (Debianベース) に変更しました。
*   **理由**: Debian は Prisma が依存する OpenSSL などの標準ライブラリとの互換性が高いためです。
12: *   **追加修正**: `builder` ステージにも `apt-get install -y openssl` を追加しました。
13: *   **理由**: `next build` (Prisma生成を含む) が実行される `builder` ステージで OpenSSL が欠落しており、Prisma がバージョン検知に失敗していたためです。

### 2.2. Prisma 設定の更新
*   **ファイル**: `prisma/schema.prisma`
*   **変更点**: `binaryTargets` に `debian-openssl-3.0.x` を追加しました。
*   **理由**: `node:20-slim` 環境で動作する正しい Prisma クライアントバイナリを生成するためです。

### 2.3. Cloud Build 設定の更新
*   **ファイル**: `cloudbuild.yaml`
*   **変更点**:
    1.  **ビルドの直列化**: 「Build Backend」が「Build Frontend」の完了を待つように設定しました。これにより、リソース競合を減らし、標準マシンスペックでのタイムアウトを防ぎます。
    2.  **権限エラーの修正**: `npx` 実行時の `EACCES` エラーを修正するため、`HOME=/tmp` および `npm_config_cache=/tmp/npm-cache` を設定しました。これにより、読み取り専用ファイルシステム上でも `npm` がキャッシュや設定を書き込めるようになります。
    3.  **マイグレーション戦略の変更**: `migrate reset --force` から `migrate deploy` に変更しました。これにより、デプロイ時に既存のデータを保持できるようになります。

### 2.4. Backend の最適化
*   **ファイル**: `backend/.dockerignore`
*   **変更点**: `__pycache__` や `venv` などを除外する設定ファイルを作成しました。
*   **理由**: ビルドコンテキストのサイズを削減し、ビルドプロセスを高速化するためです。

### 2.5. マイグレーション戦略の最適化 (Supabase Pooler対策)
*   **問題**: Supabase Transaction Pooler (ポート6543) 経由での `migrate reset` がハングする現象を確認。
*   **対策**:
    1.  **基本戦略 (Plan A)**: `migrate deploy` を使用。Pooler経由でも差分適用なら成功する可能性が高い。
    2.  **フォールバック (Plan B)**: 万が一失敗した場合は、一時的に Direct Connection (ポート5432) を使用する。

## 3. 技術的知見 (Lessons Learned)
今回のトラブルシューティングで得られた重要な知見です。

1.  **Prisma & Docker**: `next build` は `prisma generate` を内包するため、ビルドステージ (`builder`) にも OpenSSL が必須である。
2.  **Cloud Build & npm**: Cloud Build のファイルシステムは一部読み取り専用のため、`HOME=/tmp` を設定しないと `npm/npx` が権限エラーで落ちる。
3.  **Supabase & Prisma**: Transaction Pooler (6543) は `migrate reset` のような破壊的変更と相性が悪い。マイグレーションは Direct Connection (5432) が安全。

## 4. 検証結果
*   **ビルド成功**: OpenSSL ターゲットの修正と権限設定により、Frontend のビルドが安定して成功することを確認。
*   **データ保持**: `migrate deploy` への切り替えにより、デプロイごとのデータ消失リスクを排除。
*   **運用体制**: 非同期ビルド (`--async`) の導入により、ローカルネットワークの影響を受けずにデプロイ可能に。
