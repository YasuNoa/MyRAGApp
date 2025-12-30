# 課金実装詳細レポート (2025/12/28)

## 概要
本レポートは、`jibunAI-ios` アプリにおける課金基盤（RevenueCat + StoreKit）およびバックエンド連携の技術的詳細と実装決定事項を記録したものです。

## 1. 課金基盤の構成

### RevenueCat
iosアプリの課金管理の中核としてRevenueCatを採用しています。
- **役割**: クロスプラットフォーム（将来的なAndroid対応含む）でのサブスクリプション管理、レシート検証の簡略化。
- **環境設定**: `jibunAI_iosApp.swift` にて、ビルド構成（Debug/Release）に応じてAPI Keyを動的に切り替える仕組みを導入済み。
- **Entitlements (権限)**:
  - `standard`: Standardプラン用権限
  - `premium`: Premiumプラン用権限

### StoreKit & Pricing (iOS)
Appleのアプリ内課金（In-App Purchase）を利用します。
定義済みの製品IDと価格設定（Monetization Plan準拠）は以下の通りです。

| プラン | 期間 | プロダクトID | 価格 (税込) |
| :--- | :--- | :--- | :--- |
| **Standard** | 月額 | `standard_monthly` | ¥600 |
| **Standard** | 年額 | `standard_yearly` | ¥6,000 |
| **Premium** | 月額 | `premium_monthly` | ¥1,500 |
| **Premium** | 年額 | `premium_yearly` | ¥15,000 |

### ローカルテスト環境 (`jibunAI.storekit`)
開発効率向上のため、StoreKit Configuration Fileを導入しました。
- **ファイルパス**: `jibunAI-ios/jibunAI.storekit`
- **メリット**: App Store Connectへのアップロードや審査待ち時間なしで、Xcode上のみで課金フロー（購入、更新、解約、復元）のテストが完結します。

## 2. 実装フロー詳細

### A. Paywall (課金画面) の実装 (`PaywallView.swift`)
UI/UXの信頼性を高めるために以下のロジックを実装しています。

1.  **動的なプラン取得**:
    - RevenueCatの `Offerings` を取得し、現在有効な商品のみを表示。
    - キャンペーン等で商品の入れ替えがあってもアプリ審査なしで変更可能。
2.  **購入トランザクション**:
    - **ブロッキングUI**: 購入ボタン押下時に `isPurchasing` フラグを立て、画面全体にローディングオーバーレイを表示。連打による二重決済エラーやUI不整合を防止。
    - **エラーハンドリング**:
        - ユーザーキャンセル (`.userCancelled`) はエラーとして扱わず、静かに画面を維持。
        - 通信エラーや決済失敗時は、具体的なエラー内容をAlertで表示。
3.  **リストア (復元) の厳密化**:
    - 単に `restorePurchases` が成功したかどうかだけでなく、**「有効なEntitlementが返ってきたか」** をチェック。
    - 通信は成功したが有効なプランがない場合、「復元可能な購入が見つかりませんでした」と明示することで、ユーザーの混乱（「ボタン押したのに反映されない」）を防ぐ。
4.  **法的リンク**:
    - 利用規約 (Terms) とプライバシーポリシー (Privacy) へのリンクを画面下部に配置。

### B. データ同期とステータス管理 (`jibunAI_iosApp.swift`, `AuthService.swift`)
アプリで購入された情報を、即座にバックエンドのデータベースと同期させる仕組みです。

1.  **状態監視**:
    - `AppStateManager` が RevenueCat の `CustomerInfo` を監視し、変更があれば即座にアプリ内の `userPlan` を更新。
2.  **有効期限の表示**:
    - `customerInfo.entitlements[id].expirationDate` を取得し、`SettingsView` に「有効期限: yyyy/MM/dd」として表示。
3.  **バックエンド同期フロー**:
    - **Step 1 (Plan Sync)**: `AuthService.syncUserPlan` を呼び出し、サーバー側の `UserSubscription` テーブルの `plan` カラムを更新。
    - **Step 2 (Profile Refresh)**: 同期完了直後に、再度 `AuthService.syncUserSession` を呼び出し、最新のユーザー情報（更新されたクレジット残高や使用制限枠など）をサーバーから再取得。
    - **目的**: 課金直後のユーザーが、アプリを再起動することなく即座にプロ機能（チャット上限緩和など）を利用できるようにするため。

## 3. 今後の運用・保守

- **製品IDの追加**: 新しいサブスクリプションを追加する場合は、App Store Connectへの登録に加え、`jibunAI.storekit` にも追記することでローカルテストが可能になります。
- **価格改定**: StoreKitファイルとRevenueCatダッシュボードの両方で価格を変更する必要があります。
