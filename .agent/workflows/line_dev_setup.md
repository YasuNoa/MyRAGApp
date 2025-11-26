# LINE開発用チャネルのセットアップ手順

本番環境（Vercel）と開発環境（ローカル）を分けるために、LINE Developersで新しいチャネルを作成します。

## 1. 新しいチャネルの作成
1.  [LINE Developers Console](https://developers.line.biz/console/) にアクセスしてログイン。
2.  プロバイダーを選択（既存のものでOK）。
3.  **「新規チャネル作成」** をクリック。
4.  **Messaging API** を選択。
5.  以下の情報を入力（例）:
    *   **チャネル名**: `じぶんAI (Dev)`
    *   **チャネル説明**: `開発用テストボット`
    *   **大業種/小業種**: 適当でOK（例: 個人/個人）
    *   **メールアドレス**: 自分のメールアドレス
6.  規約に同意して **「作成」**。

## 2. キーの取得
作成した「じぶんAI (Dev)」チャネルの設定画面で、以下をコピーします。

1.  **Basic settings** タブ:
    *   `Channel Secret`
2.  **Messaging API** タブ:
    *   `Channel access token`（一番下の「発行」ボタンを押す）

## 3. ローカル環境変数の更新
プロジェクトの `.env` ファイルを開き、コピーしたキーで書き換えます。

```bash
# .env ファイル
AUTH_LINE_ID="新しいチャネルのID (Basic settingsタブ)"
AUTH_LINE_SECRET="新しいチャネルのSecret"
LINE_CHANNEL_ACCESS_TOKEN="新しいチャネルのAccess Token"
```

## 4. Webhookの設定
1.  **Messaging API** タブの **Webhook settings** を探す。
2.  **Webhook URL** に、ngrokなどのローカルURLを入力。
    *   例: `https://xxxx-xxxx.ngrok-free.app/api/webhook/line`
3.  **Use webhook** をオンにする。
4.  **Verify** ボタンを押して「Success」が出るか確認。

## 5. 応答設定の無効化（重要）
1.  **Messaging API** タブの **LINE Official Account features** にある **Auto-reply messages** の「Edit」をクリック。
2.  LINE Official Account Managerが開くので以下を設定:
    *   **あいさつメッセージ**: オフ
    *   **応答メッセージ**: オフ
    *   **Webhook**: オン

これで、ローカルで開発する時はこの「(Dev)」ボットを使い、本番は元のボットを使うことができます！
