# RevenueCat セットアップガイド

## 📋 必要な情報

- **Bundle ID**: `com.yasu.jibunAI-ios`
- **RevenueCat API Key**: 取得後に設定

---

## 🚀 RevenueCat API Key 取得手順

### 1. アカウント作成
https://www.revenuecat.com/ で無料アカウント作成

### 2. プロジェクト作成
- Project name: `jibunAI`

### 3. iOS アプリ登録
- App name: `jibunAI iOS`
- Platform: iOS
- Bundle ID: `com.yasu.jibunAI-ios`

### 4. API Key 取得
- **Public SDK key** をコピー
- 例: `appl_aBcDeFgHiJkLmNoPqRsTuVwXyZ`

---

## 📱 iOS アプリへの実装

### Step 1: RevenueCat SDK 追加

既に `PaywallView.swift` があるので、SDK 追加のみ:

```
File → Add Package Dependencies...
URL: https://github.com/RevenueCat/purchases-ios
```

パッケージ選択:
- ✅ `RevenueCat`
- ✅ `RevenueCatUI`

---

### Step 2: API Key 設定

`jibunAI_iosApp.swift` を更新:

```swift
import SwiftUI
import Combine
import FirebaseCore
import FirebaseAuth
import GoogleSignIn
import LineSDK
import RevenueCat  // 追加

@main
struct jibunAI_iosApp: App {
    @StateObject private var appState = AppStateManager()
    
    init() {
        print("🚀 App initializing...")
        
        // Firebase初期化
        FirebaseApp.configure()
        print("✅ Firebase configured")
        
        // LINE SDK初期化
        LineAuthManager.shared.setup(channelID: "2008568178")
        print("✅ LINE SDK configured")
        
        // RevenueCat 初期化
        Purchases.logLevel = .debug  // 開発中はデバッグログON
        Purchases.configure(
            withAPIKey: "YOUR_REVENUECAT_API_KEY",  // ← ここに API Key を設定
            appUserID: nil  // Firebase UID は後で設定
        )
        print("✅ RevenueCat configured")
        
        // ... 他の初期化コード
    }
    
    // ...
}
```

---

### Step 3: ユーザー識別子の設定

ログイン後に RevenueCat のユーザーを Firebase UID に紐付け:

`AuthService.swift` または各ログイン処理に追加:

```swift
// ログイン成功後
let authResult = try await Auth.auth().signIn(with: credential)
let firebaseUID = authResult.user.uid

// RevenueCat のユーザーを Firebase UID に設定
try await Purchases.shared.logIn(firebaseUID)
print("✅ RevenueCat user logged in: \(firebaseUID)")
```

---

### Step 4: 課金画面の表示

設定画面に課金ボタンを追加:

`SettingsView.swift` に追加:

```swift
struct SettingsView: View {
    @EnvironmentObject var appState: AppStateManager
    @State private var showPaywall = false
    
    var body: some View {
        ZStack {
            Color(red: 0.05, green: 0.05, blue: 0.05)
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 24) {
                    // ... 既存のコード
                    
                    // プランアップグレードボタン
                    if appState.userPlan == "FREE" {
                        Button {
                            showPaywall = true
                        } label: {
                            HStack {
                                Image(systemName: "star.fill")
                                    .foregroundColor(.yellow)
                                Text("Premiumにアップグレード")
                                    .font(.headline)
                                    .foregroundColor(.white)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                LinearGradient(
                                    colors: [
                                        Color(red: 0.5, green: 0.6, blue: 1.0),
                                        Color(red: 0.4, green: 0.5, blue: 0.9)
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(12)
                        }
                        .padding(.horizontal, 20)
                    }
                    
                    // ... 既存のコード
                }
            }
        }
        .sheet(isPresented: $showPaywall) {
            SubscriptionView()
                .environmentObject(appState)
        }
    }
}
```

---

### Step 5: SubscriptionView の更新

`PaywallView.swift` を更新して、購入完了時にプラン状態を更新:

```swift
import SwiftUI
import RevenueCat
import RevenueCatUI

struct SubscriptionView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var appState: AppStateManager
    
    var body: some View {
        PaywallView(displayCloseButton: true)
            .onPurchaseCompleted { customerInfo in
                print("✅ Purchase completed")
                
                // エンタイトルメントをチェック
                if customerInfo.entitlements["premium"]?.isActive == true {
                    Task { @MainActor in
                        appState.userPlan = "PREMIUM"
                        print("✅ User plan updated to PREMIUM")
                    }
                }
                
                dismiss()
            }
            .onRestoreCompleted { customerInfo in
                print("✅ Restore completed")
                
                if customerInfo.entitlements["premium"]?.isActive == true {
                    Task { @MainActor in
                        appState.userPlan = "PREMIUM"
                    }
                }
                
                dismiss()
            }
    }
}
```

---

### Step 6: アプリ起動時のプラン状態確認

`jibunAI_iosApp.swift` または `AppRootView.swift` に追加:

```swift
.task {
    // RevenueCat からプラン状態を取得
    await checkSubscriptionStatus()
}

func checkSubscriptionStatus() async {
    do {
        let customerInfo = try await Purchases.shared.customerInfo()
        
        if customerInfo.entitlements["premium"]?.isActive == true {
            await MainActor.run {
                appState.userPlan = "PREMIUM"
                print("✅ User has PREMIUM plan")
            }
        } else {
            await MainActor.run {
                appState.userPlan = "FREE"
                print("ℹ️ User has FREE plan")
            }
        }
    } catch {
        print("❌ Failed to check subscription status: \(error)")
    }
}
```

---

## 📝 RevenueCat ダッシュボード設定

### Products（商品）設定

1. RevenueCat → **Products** → **+ New**
2. 以下を設定:

```
Product Identifier: com.yasu.jibunAI.premium.monthly
Type: Subscription
App: jibunAI iOS
```

必要に応じて追加:
```
com.yasu.jibunAI.premium.yearly  # 年間プラン
com.yasu.jibunAI.premium.lifetime  # 買い切り
```

---

### Entitlements（権限）設定

1. RevenueCat → **Entitlements** → **+ New**
2. 以下を設定:

```
Identifier: premium
Description: Premium features
```

3. Products を追加:
   - `com.yasu.jibunAI.premium.monthly`
   - `com.yasu.jibunAI.premium.yearly`

---

### Offerings（オファリング）設定

1. RevenueCat → **Offerings** → **+ New**
2. 以下を設定:

```
Identifier: default
Description: Default pricing
```

3. Packages を追加:

```
Package: $rc_monthly
Product: com.yasu.jibunAI.premium.monthly

Package: $rc_annual  # オプション
Product: com.yasu.jibunAI.premium.yearly
```

---

## 🧪 テスト方法

### Sandbox テスト（実機必須）

1. **Settings → App Store → Sandbox Account**
2. テスト用 Apple ID でサインイン
3. アプリで課金テスト
4. 実際の課金は発生しない

### RevenueCat ダッシュボードで確認

1. **Customers** タブ
2. Firebase UID で検索
3. サブスクリプション状態を確認

---

## 🚨 トラブルシューティング

### Error: "Invalid API Key"

**原因:** API Key が間違っている

**解決方法:**
1. RevenueCat → Apps → API Keys で確認
2. `appl_` で始まる iOS 用のキーを使用

---

### Error: "No products found"

**原因:** 
- App Store Connect でサブスクリプションが承認されていない
- Product ID が一致していない

**解決方法:**
1. App Store Connect で In-App Purchase のステータス確認
2. RevenueCat の Product Identifier と一致しているか確認

---

### 購入完了後にプランが更新されない

**原因:** Entitlement の設定が間違っている

**解決方法:**
1. RevenueCat → Entitlements → `premium` が存在するか
2. Products が Entitlement に紐付いているか確認

---

## 📋 チェックリスト

### RevenueCat
- [ ] アカウント作成
- [ ] プロジェクト作成
- [ ] iOS アプリ登録
- [ ] API Key 取得
- [ ] Products 作成
- [ ] Entitlements 作成
- [ ] Offerings 作成

### App Store Connect
- [ ] サブスクリプション作成
- [ ] Product ID 設定
- [ ] 価格設定
- [ ] 承認待ち → 承認済み

### iOS アプリ
- [ ] RevenueCat SDK 追加
- [ ] API Key 設定
- [ ] `jibunAI_iosApp.swift` 更新
- [ ] `SubscriptionView.swift` 更新
- [ ] `SettingsView.swift` にボタン追加

### テスト
- [ ] Sandbox でテスト
- [ ] 購入フロー確認
- [ ] プラン状態更新確認
- [ ] RevenueCat ダッシュボードで確認

---

## 🎯 まとめ

1. **RevenueCat で API Key を取得**
2. **iOS アプリに実装**（今やる）
3. **App Store Connect でサブスクリプション作成**（後でOK）
4. **RevenueCat で Products/Offerings 設定**（後でOK）

まずは **API Key 取得** だけやって、実装は後でもOK！

---

## 💡 API Key をすぐ使いたい場合

とりあえず課金なしで動かしたいなら、API Key だけ設定すればOK:

```swift
// 開発中はダミーキーでもアプリは起動する
Purchases.configure(withAPIKey: "TEMP_KEY")
```

後でちゃんとした API Key に置き換えればOK！

