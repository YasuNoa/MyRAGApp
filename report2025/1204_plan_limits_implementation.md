# 実装レポート: プラン制限と音声処理の強化 (2025-12-04)

## 1. 概要
本日の開発では、ユーザーのプラン（Free, Standard, Premium）に応じた機能制限の実装と、音声処理機能の強化を行いました。これにより、サービスの持続可能性を高め、上位プランへのアップグレードインセンティブを創出します。

## 2. 実装されたプラン制限

### 2.1 チャット制限
*   **実装ファイル**: `app/api/ask/route.ts`
*   **内容**:
    *   **Free**: 10通 / 2時間（リセット間隔を短くし、頻繁に戻ってきてもらう設計）
    *   **Standard**: 100通 / 日
    *   **Premium**: 200通 / 日
*   **仕組み**: `UserSubscription` テーブルの `dailyChatCount` と `lastChatResetAt` を使用して制御。

### 2.2 ストレージ（保存数）制限
*   **実装ファイル**: `app/api/knowledge/upload/route.ts`
*   **内容**:
    *   **Free**: 5ファイル
    *   **Standard**: 200ファイル
    *   **Premium**: 1000ファイル
*   **仕組み**: アップロード時に `Document` テーブルの件数をカウントし、上限を超えている場合はエラー (403) を返却。

### 2.3 音声処理制限
*   **実装ファイル**: `backend/main.py`, `app/api/upload/route.ts`
*   **内容**:
    *   **Free**:
        *   回数: 5回 / 日
        *   時間: **冒頭20分のみ** (自動トリミング)
    *   **Standard**:
        *   回数: 無制限
        *   時間: 1ファイル120分、月間1800分 (30時間)
    *   **Premium**:
        *   回数: 無制限
        *   時間: 1ファイル180分、月間6000分 (100時間)

## 3. 技術的詳細

### 3.1 音声トリミング (ffmpeg)
バックエンドに `ffmpeg` を導入し、Freeプランユーザーの音声ファイルを処理前に自動的にトリミングするロジックを実装しました。

```python
# backend/main.py (抜粋)
if user_plan == "FREE":
    if duration_sec > 1200: # 20分
        logger.info("Free plan detected. Trimming audio...")
        trimmed_filename = trim_audio(temp_filename, duration_sec=1200)
```

### 3.2 月間利用時間の管理
Standard/Premiumプラン向けに、月間の音声処理時間をDBで管理する仕組みを導入しました。
*   `UserSubscription` テーブルに `monthlyVoiceMinutes` と `lastVoiceResetDate` カラムを追加。
*   処理前に `ffmpeg` で正確な再生時間を取得し、累積時間をチェック・更新。

### 3.3 UI/UXの改善
*   **フッターリンク**: 利用規約とプライバシーポリシーへのリンクを、ログインページ（ホームページ）のみに表示するように変更し、アプリ利用中の没入感を高めました (`app/_components/LayoutWrapper.tsx`)。

## 4. 今後の課題
*   **チケット課金**: 音声処理時間を追加購入できるチケット機能の実装。
*   **Stripe連携**: 実際の決済処理との連携。
*   **通知**: 制限に達した際のユーザーへの通知UIの改善。

## 5. ドキュメント更新
`.agent` ディレクトリ内の以下のドキュメントを更新しました。
*   `monetization.md`: プラン詳細表の更新
*   `database_schema.md`: `UserSubscription` テーブルの追加
*   `spec.md`: `ffmpeg` と音声処理フローの追記
*   `Requirement.md`: マネタイズ戦略の更新
