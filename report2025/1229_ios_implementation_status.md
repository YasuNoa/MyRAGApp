# iOS実装状況レポート (2025/12/29)

## 概要
iOSアプリ (`jibunAI-ios`) における課金機能（RevenueCat）、認証、およびユーザー体験（UI/UX）周りの実装状況をまとめました。
特にここ数日で大幅に強化された「課金フローの信頼性」と「ローカルテスト環境」について詳述します。

## 1. 課金機能 (RevenueCat & StoreKit)

### 実装ステータス: ✅ 完了 (テスト待ち)

#### 💎 プラン構成 (Monetization Plan準拠)
`jibunAI.storekit` およびアプリ内ロジックにて以下の価格設定を実装済みです。

| プラン名 | 期間 | 価格 (iOS) | Entitlement ID |
| :--- | :--- | :--- | :--- |
| **Standard** | 月額 | ¥600 | `standard` |
| **Standard** | 年額 | ¥6,000 | `standard` |
| **Premium** | 月額 | ¥1,500 | `premium` |
| **Premium** | 年額 | ¥15,000 | `premium` |

#### 🛠 RevenueCat実装詳細
- **SDK初期化**: `jibunAI_iosApp.swift` にて、環境（Debug/Release）に応じてAPI Keyを切り替えて初期化。
- **権限管理**: `AppStateManager` が RevenueCat の `CustomerInfo` を常時監視。購入やリストアが発生すると即座にアプリ内のプランステータス (`userPlan`) に反映されます。
- **有効期限管理**: RevenueCatから取得した `expirationDate` を保持し、設定画面等でユーザーに表示するようにしました。

#### 💳 Paywall (課金画面) の改善
`PaywallView.swift` にて以下のUX改善を実施しました。
- **ローディング制御**: 購入ボタン押下後、Appleの決済処理が完了するまで画面をロック（スピナー表示）し、連打や誤操作を防止。
- **エラーハンドリング**: 決済キャンセル時は静かに、エラー時は明確なアラートを表示するよう分岐。
- **リストア (復元) ロジック**: 単なる通信成功だけでなく、「有効な権利を持っているか」まで判定し、「復元しました」or「復元可能な購入がありません」を正確に伝え分けます。
- **法的要件**: 利用規約・プライバシーポリシーへのリンクを設置。

#### 🧪 ローカルテスト環境 (StoreKit 2)
App Store Connectへの接続不要でテスト可能な **StoreKit Configuration File (`jibunAI.storekit`)** を作成しました。
- **メリット**: 審査提出前でも、Xcodeだけで「購入」「解約」「更新」「リストア」の全フローを爆速でテスト可能です。
- **使い方**: XcodeのScheme設定で `StoreKit Configuration` に `jibunAI.storekit` を指定して実行するだけです。

## 2. バックエンド連携 & データ同期

### 実装ステータス: ✅ 完了

#### ユーザー同期フロー
1.  **ログイン時**: Firebase Authのトークンを用いてバックエンド (`/api/auth/sync`) と同期。DB上のユーザーID (CUID) を取得。
2.  **課金時**: RevenueCatで購入完了後、`AuthService.syncUserPlan` を呼び出し、DBのプラン情報を即時更新。
3.  **プロファイル再取得**: プラン更新直後に再度 `/api/auth/sync` を叩き、最新のクレジット残高や制限値（プラン変更で増えた分）をアプリに反映。

これにより、「課金したのに制限が解除されない」という事故を防いでいます。

## 3. UI/UX & 設定画面

### 実装ステータス: ✅ 完了

- **SettingsView**:
    - **プラン表示**: 「STANDARD プラン」等の表示に加え、「有効期限: 2025/12/31」のような日付表示を追加。
    - **サブスク管理**: iOSの設定アプリ（サブスクリプション管理画面）へのディープリンクを実装済み。解約導線を確保。
- **PaywallView**: Spotify風のカードUIを採用。高級感のあるダークテーマで統一。

## 4. 今後の課題・Next Steps

- [ ] **実機テスト (TestFlight)**: StoreKitでの模擬テストパス後、TestFlightを用いた本番相当環境（Sandbox）での最終確認。
- [ ] **プロモーション**: 1ヶ月無料キャンペーン等のオファーコード実装（ロジックは一部入っていますが、StoreKit設定とUIの最終調整が必要）。

---
以上が現在のiOS実装状況です。詳細なコード変更内容は `PaywallView.swift` および `jibunAI_iosApp.swift` をご確認ください。
