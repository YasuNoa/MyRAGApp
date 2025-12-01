# 開発レポート: 2025-12-01

## 本日の成果

### 1. インフラ構築 (Cloud Run & Terraform)
*   **Terraform導入**:
    *   `main.tf`: Cloud Run (Backend/Frontend) の構成をコード化。
    *   `variables.tf`, `terraform.tfvars`: 環境変数を管理（SecretsはGit除外）。
    *   `gcloud` コマンドの手動実行から、IaC (Infrastructure as Code) への移行準備完了。

### 2. デプロイ準備 & トラブルシューティング
*   **Backend (Python)**:
    *   `Dockerfile` 修正: Cloud Runに合わせてポート `8080` を使用するように変更。
    *   `uvicorn` の起動コマンドを環境変数 `PORT` に対応。
*   **Frontend (Next.js)**:
    *   `Dockerfile` 最適化: Standaloneモード対応。
    *   ビルドエラー修正:
        *   `KnowledgeSource` 型定義エラーの修正。
        *   LINE Bot初期化時の環境変数不足エラーを修正（ダミー値で回避）。
        *   `public` ディレクトリ欠如による `COPY` エラーを修正。
*   **認証周り**:
    *   `gcloud auth login` / `application-default login` による権限設定。
    *   Billing Accountの紐付け案内。

### 3. 環境変数移行
*   Vercelで管理していた環境変数（LINE, Google, Pinecone, NextAuth）を `terraform.tfvars` に移行完了。

## 次回のタスク
1.  **Backendデプロイ完了確認**:
    *   現在再ビルド中のBackendイメージを使って `terraform apply` を成功させる。
2.  **動作確認**:
    *   発行されたURLでアプリが正常に動くか確認。
    *   LINE BotのWebhook URL更新。
    *   Google OAuthの承認済みドメイン/リダイレクトURI更新。
3.  **CI/CD構築**:
    *   GitHub Actions または Cloud Build トリガーの設定（自動デプロイ化）。

## メモ
*   TerraformのStateファイルは現状ローカル管理。
*   Cloud Runは無料枠が大きいので個人開発には最適。
*   AI Studio (Gemini API) は商用利用時はPay-as-you-goプランへの切り替えを推奨。
