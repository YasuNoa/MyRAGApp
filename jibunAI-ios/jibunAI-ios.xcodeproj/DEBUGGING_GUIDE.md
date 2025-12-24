# デバッグガイド

## 🔍 Xcodeでログを見る

### コンソールを開く
- **View → Debug Area → Activate Console**
- またはショートカット: **Cmd + Shift + Y**

### フィルター機能
1. コンソール下部の検索バー
2. キーワードで絞り込み:
   - `Firebase`
   - `Google`
   - `LINE`
   - `Error`

---

## 🚨 シミュレーターが落ちる問題

### 症状: Google ログインでクラッシュ

#### チェック項目

##### 1. GoogleService-Info.plist の確認
```
Project Navigator → GoogleService-Info.plist を選択
右側の File Inspector で:
  ✅ Target Membership → jibunAI-ios にチェック
  ✅ Location: プロジェクト内にある
```

##### 2. Info.plist の URL Schemes 確認
```
TARGETS → jibunAI-ios → Info タブ → URL Types

必要な設定:
  Item 0:
    Identifier: com.google.app
    URL Schemes: com.googleusercontent.apps.968150096572-jo1mhu24kkubgkfeh7jet19ve0aksp18
  
  Item 1:
    Identifier: com.line.app
    URL Schemes: line3rdp.2008568178
```

##### 3. クラッシュログを確認

コンソールで探す:
```
Thread 1: signal SIGABRT
```

よくあるエラー:
- `GoogleService-Info.plist not found`
- `REVERSED_CLIENT_ID not found`
- `Bundle ID mismatch`

---

## 🍎 Apple Sign-In がうまくいかない

### 必要な設定チェック

#### 1. Xcode Capability
```
TARGETS → jibunAI-ios → Signing & Capabilities

必要:
  ✅ Sign in with Apple
```

追加方法:
- **+ Capability** ボタン
- **Sign in with Apple** を検索して追加

#### 2. Apple Developer Center
```
https://developer.apple.com/account

Certificates, Identifiers & Profiles
  → Identifiers
  → App IDs
  → com.yasu.jibunAI-ios を選択
  → Capabilities:
      ✅ Sign in with Apple
```

#### 3. Firebase Console
```
https://console.firebase.google.com

Authentication → Sign-in method
  → Apple
  → Enable: ON
```

#### 4. シミュレーターで Apple ID ログイン
```
Settings アプリ → Sign in to your iPhone
→ Apple ID でログイン
```

シミュレーターで Apple ID にサインインしていないと動作しません！

---

## 🔧 デバッグ用コード追加

### jibunAI_iosApp.swift にログ追加

```swift
import SwiftUI
import Combine
import FirebaseCore
import GoogleSignIn
import LineSDK

@main
struct jibunAI_iosApp: App {
    @StateObject private var appState = AppStateManager()
    
    init() {
        // デバッグログ追加
        print("🚀 App initializing...")
        
        // Firebase初期化
        FirebaseApp.configure()
        print("✅ Firebase configured")
        
        // LINE SDK初期化
        LineAuthManager.shared.setup(channelID: "2008568178")
        print("✅ LINE SDK configured")
        
        // GoogleService-Info.plist の確認
        if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") {
            print("✅ GoogleService-Info.plist found at: \(path)")
        } else {
            print("❌ GoogleService-Info.plist NOT FOUND")
        }
        
        // Client ID の確認
        if let clientID = FirebaseApp.app()?.options.clientID {
            print("✅ Firebase Client ID: \(clientID)")
        } else {
            print("❌ Firebase Client ID NOT FOUND")
        }
    }
    
    var body: some Scene {
        WindowGroup {
            AppRootView()
                .environmentObject(appState)
                .onOpenURL { url in
                    print("📱 Received URL: \(url)")
                    
                    if url.scheme == "line3rdp" {
                        print("🟢 Handling LINE URL")
                        _ = LoginManager.shared.application(.shared, open: url)
                    } else {
                        print("🔵 Handling Google URL")
                        GIDSignIn.sharedInstance.handle(url)
                    }
                }
        }
    }
}
```

### LoginView.swift にログ追加

```swift
private func handleGoogleLogin() {
    isLoading = true
    errorMessage = nil
    
    print("🔵 Google login started...")
    
    Task {
        do {
            print("🔵 Calling AuthService.signInWithGoogle()")
            let (user, token) = try await authService.signInWithGoogle()
            
            print("✅ Google login success!")
            print("   User ID: \(user.id)")
            print("   Display Name: \(user.displayName ?? "nil")")
            print("   Email: \(user.email ?? "nil")")
            
            await MainActor.run {
                APIService.shared.authToken = token
                appState.currentUser = user
                appState.isLoggedIn = true
                isLoading = false
            }
        } catch {
            print("❌ Google login failed: \(error)")
            await MainActor.run {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }
}

private func handleAppleLogin() {
    isLoading = true
    errorMessage = nil
    
    print("🍎 Apple login started...")
    
    Task {
        do {
            print("🍎 Calling SignInWithAppleCoordinator")
            let coordinator = SignInWithAppleCoordinator()
            let authorization = try await coordinator.signIn()
            
            print("🍎 Got authorization, signing in with Firebase...")
            let (user, token) = try await authService.signInWithApple(authorization: authorization)
            
            print("✅ Apple login success!")
            print("   User ID: \(user.id)")
            
            await MainActor.run {
                APIService.shared.authToken = token
                appState.currentUser = user
                appState.isLoggedIn = true
                isLoading = false
            }
        } catch {
            print("❌ Apple login failed: \(error)")
            await MainActor.run {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }
}
```

---

## 🧪 段階的テスト

### Step 1: アプリ起動確認
```
Product → Run (Cmd+R)
コンソールを見る:
  🚀 App initializing...
  ✅ Firebase configured
  ✅ LINE SDK configured
  ✅ GoogleService-Info.plist found at: ...
  ✅ Firebase Client ID: ...
```

もし `❌` が出たら、そこに問題あり！

### Step 2: ランディングページ表示
- アプリが正常に起動
- 「じぶんAI」が表示される
- 「無料で始める」ボタンが押せる

### Step 3: ログイン画面表示
- ログイン画面が表示される
- 4つのボタンが見える

### Step 4: Google ログイン
- ボタンを押す
- コンソールで `🔵 Google login started...` を確認
- シミュレーターが落ちる場合:
  - コンソールで最後のログを確認
  - クラッシュログを見る

---

## 💡 よくあるエラーと対処法

### Error: "GoogleService-Info.plist not found"
**対処:**
1. ファイルを Project Navigator で探す
2. なければ再度追加
3. Target Membership を確認

### Error: "No application was found"
**対処:**
1. Info.plist の URL Schemes を確認
2. REVERSED_CLIENT_ID が正しいか確認

### Error: "Bundle ID mismatch"
**対処:**
1. Xcode の Bundle ID: `com.yasu.jibunAI-ios`
2. Firebase Console で同じ Bundle ID が登録されているか確認
3. GoogleService-Info.plist が正しいプロジェクトのものか確認

### Apple Sign-In: "No authorization found"
**対処:**
1. シミュレーターで Settings → Apple ID にサインイン
2. Xcode Capability に Sign in with Apple が追加されているか確認
3. Apple Developer Center で App ID に Sign in with Apple が有効か確認

---

## 🎯 次のアクション

1. **上記のデバッグログを追加**
2. **アプリを実行**
3. **コンソールのログをコピー**
4. **どこでエラーが出ているか確認**

ログの内容を見せてくれれば、すぐ問題が特定できます！ 🚀

