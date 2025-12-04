# Cloud Run Deployment Troubleshooting Report (2025-12-04)

## 概要
Cloud Runへのデプロイ時に「Container failed to start」エラーが発生し、デプロイが失敗する問題を解決しました。
主な原因は、デプロイ設定による環境変数の消失と、データベース接続設定の不整合でした。

## 発生していた問題
1.  **デプロイ失敗**: Cloud Runのリビジョン作成時にコンテナが起動せず、タイムアウトで失敗。
2.  **ログエラー**: `Invalid API Key` や `failed to connect to database` などのエラーが記録されていた。
3.  **環境変数の消失**: Terraformで設定したはずの環境変数（`DATABASE_URL`, `GOOGLE_API_KEY` 等）が、デプロイ後に消えていた。

## 原因と対策

### 1. `cloudbuild.yaml` による環境変数の上書き（主原因）
**原因:**
`cloudbuild.yaml` のデプロイコマンドに `--set-env-vars=TZ=Asia/Tokyo` オプションが含まれていました。
このオプションは指定した変数**以外をすべて削除**して設定するため、Terraformで管理していた他の重要な環境変数がすべて消去されていました。

**対策:**
`cloudbuild.yaml` から該当オプションを削除しました。
`TZ`（タイムゾーン）の設定は Terraform (`main.tf`) 側で行うように統一しました。

### 2. `asyncpg` と Transaction Pooler の相性問題
**原因:**
Supabaseの Transaction Pooler（ポート6543）を使用する場合、`asyncpg` のデフォルト機能である「Prepared Statements」がサポートされておらず、接続エラーが発生していました。

**対策:**
`backend/main.py` のDB接続設定を変更し、Prepared Statements を無効化しました。

```python
# backend/main.py
db_pool = await asyncpg.create_pool(DATABASE_URL, statement_cache_size=0)
```

### 3. 環境変数欠落時のクラッシュ
**原因:**
バックエンドのコードで、モジュール読み込み時（グローバルスコープ）にAPIクライアントを初期化していたため、環境変数がない状態で起動すると即座にクラッシュしていました。これにより、設定ミス時のトラブルシューティングが困難になっていました。

**対策:**
クライアントの初期化を `startup_event` 内に移動し、環境変数がなくてもコンテナ自体は起動するように（ログを出力できるように）リファクタリングしました。

## 今後の運用について
*   **環境変数の管理**: 環境変数は Terraform (`terraform.tfvars`) で一元管理し、`terraform apply` で反映させます。
*   **デプロイ**: 通常通り `cloudbuild.yaml` 経由（`gcloud builds submit` 等）でデプロイして問題ありません。環境変数は保持されます。
