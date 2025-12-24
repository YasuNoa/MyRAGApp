# Universal Link 実装ガイド

## 📋 必要な情報

### 確認してください

1. **Apple Team ID**
   - Apple Developer → Account → Membership
   - 例: `ABC123XYZ`

2. **ドメイン**
   - Webアプリのドメイン（どっち使う？）
   - Option A: `jibun-ai.com` （カスタムドメイン）
   - Option B: `myragapp-backend-968150096572.asia-northeast1.run.app` （Cloud Run）

3. **Bundle ID**
   - `com.yasu.jibunAI-ios` ✅

---

## 🔧 Step 1: バックエンドに apple-app-site-association を追加

### FastAPI の場合

```python
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/.well-known/apple-app-site-association")
async def apple_app_site_association():
    """
    Apple Universal Links 用の設定ファイル
    
    注意:
    - Content-Type は application/json
    - 拡張子なし
    - HTTPSで配信必須
    """
    return JSONResponse(
        content={
            "applinks": {
                "apps": [],
                "details": [
                    {
                        # TODO: YOUR_TEAM_ID を実際の Team ID に置き換え
                        "appID": "YOUR_TEAM_ID.com.yasu.jibunAI-ios",
                        "paths": [
                            "/line-auth/*",
                            "/auth/*",
                            "/callback/*"
                        ]
                    }
                ]
            }
        },
        headers={
            "Content-Type": "application/json"
        }
    )

# LINEからのコールバック用エンドポイント
@app.get("/line-auth/callback")
async def line_auth_callback(
    code: str,
    state: str,
    friendship_status_changed: str = None
):
    """
    LINEからのコールバック
    Universal Link 経由でここに来る
    
    フロー:
    1. LINEがこのURLにリダイレクト
    2. iOS がこのドメインを認識してアプリを起動
    3. アプリが code を受け取る
    4. アプリがバックエンドの /api/auth/line にトークンを送信
    """
    # iOS アプリにリダイレクト（URL Schemeも併用）
    # アプリが起動したら、code をアプリに渡す
    return RedirectResponse(
        url=f"com.yasu.jibunAI-ios://line-callback?code={code}&state={state}"
    )
```

---

## 📱 Step 2: iOS アプリ設定

### 2-1. Xcode で Associated Domains 追加

1. **TARGETS** → **jibunAI-ios** を選択
2. **Signing & Capabilities** タブ
3. **+ Capability** をクリック
4. **Associated Domains** を検索して追加

### 2-2. Domain を追加

追加されたら、**+ ボタン** をクリックして以下を入力:

#### カスタムドメインの場合
```
applinks:jibun-ai.com
```

#### Cloud Run の場合
```
applinks:myragapp-backend-968150096572.asia-northeast1.run.app
```

**注意:** 
- `https://` は**不要**
- `applinks:` の後にドメインだけ
- ポート番号も不要

---

## 🍎 Step 3: Apple Developer Center 設定

### 3-1. App ID 設定

1. https://developer.apple.com/account にアクセス
2. **Certificates, Identifiers & Profiles**
3. **Identifiers** → **App IDs**
4. `com.yasu.jibunAI-ios` を選択
5. **Capabilities** セクションで:
   - ✅ **Associated Domains** にチェック
6. **Save** をクリック

---

## 🟢 Step 4: LINE Developers Console 設定

### 4-1. LINE Login タブ

https://developers.line.biz/console/ で:

1. チャネルを選択（Channel ID: 2008568178）
2. **LINE Login** タブ
3. **App settings** セクション

### 4-2. 設定を追加

```
iOS bundle ID: com.yasu.jibunAI-ios

iOS scheme: line3rdp.2008568178

iOS universal link: https://YOUR_DOMAIN/line-auth/callback
```

**例:**
- カスタムドメイン: `https://jibun-ai.com/line-auth/callback`
- Cloud Run: `https://myragapp-backend-968150096572.asia-northeast1.run.app/line-auth/callback`

**Save** をクリック

---

## 💻 Step 5: iOS アプリのコード更新

### 5-1. Universal Link のハンドリング追加

`jibunAI_iosApp.swift` を更新:

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
        print("🚀 App initializing...")
        FirebaseApp.configure()
        print("✅ Firebase configured")
        
        LineAuthManager.shared.setup(channelID: "2008568178")
        print("✅ LINE SDK configured")
        
        if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") {
            print("✅ GoogleService-Info.plist found at: \(path)")
        } else {
            print("❌ GoogleService-Info.plist NOT FOUND")
        }
        
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
                    handleIncomingURL(url)
                }
                // Universal Link のハンドリング
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { userActivity in
                    print("🌐 Received Universal Link")
                    if let url = userActivity.webpageURL {
                        print("   URL: \(url)")
                        handleUniversalLink(url)
                    }
                }
        }
    }
    
    // URL Scheme ハンドリング
    private func handleIncomingURL(_ url: URL) {
        if url.scheme == "line3rdp" {
            print("🟢 Handling LINE URL Scheme")
            _ = LoginManager.shared.application(.shared, open: url)
        } else if url.scheme == "com.yasu.jibunAI-ios" {
            print("🔵 Handling custom URL Scheme")
            handleCustomScheme(url)
        } else {
            print("🔵 Handling Google URL")
            GIDSignIn.sharedInstance.handle(url)
        }
    }
    
    // Universal Link ハンドリング
    private func handleUniversalLink(_ url: URL) {
        print("🌐 Processing Universal Link: \(url)")
        
        // /line-auth/callback?code=xxx&state=yyy のパース
        if url.path.contains("/line-auth/callback") {
            print("🟢 LINE auth callback received")
            
            guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                  let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
                print("❌ Failed to extract code from Universal Link")
                return
            }
            
            print("✅ LINE auth code: \(code)")
            
            // LINE認証コードを処理
            Task {
                await handleLINEAuthCode(code)
            }
        }
    }
    
    // カスタム URL Scheme ハンドリング
    private func handleCustomScheme(_ url: URL) {
        // com.yasu.jibunAI-ios://line-callback?code=xxx
        if url.host == "line-callback" {
            guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                  let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
                return
            }
            
            Task {
                await handleLINEAuthCode(code)
            }
        }
    }
    
    // LINE認証コード処理
    private func handleLINEAuthCode(_ code: String) async {
        print("🟢 Processing LINE auth code...")
        
        // TODO: バックエンドにコードを送信してトークン取得
        // このロジックは AuthService に移動することを推奨
        
        do {
            // バックエンドの /api/auth/line/exchange エンドポイントにコードを送信
            // Firebase Custom Token を取得
            // Firebase にサインイン
            
            print("✅ LINE authentication completed")
            
        } catch {
            print("❌ LINE authentication failed: \(error)")
        }
    }
}
```

---

## 🧪 Step 6: テスト

### 6-1. apple-app-site-association の確認

ブラウザで開く:
```
https://YOUR_DOMAIN/.well-known/apple-app-site-association
```

**期待される結果:**
```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "YOUR_TEAM_ID.com.yasu.jibunAI-ios",
      "paths": ["/line-auth/*", "/auth/*", "/callback/*"]
    }]
  }
}
```

### 6-2. Apple の検証ツール

https://search.developer.apple.com/appsearch-validation-tool/

ドメインを入力して **Validate** をクリック

✅ が表示されればOK！

### 6-3. 実機テスト

1. **実機でアプリをビルド**（シミュレーターでは Universal Link のテストが難しい）
2. Safari で以下のURLを開く:
   ```
   https://YOUR_DOMAIN/line-auth/callback?code=test&state=test
   ```
3. **アプリが起動すれば成功！** 🎉

---

## 🚨 トラブルシューティング

### Error: "apple-app-site-association not found"

**原因:** ファイルが正しく配信されていない

**確認:**
- HTTPSで配信されているか
- Content-Type が `application/json` か
- ステータスコード 200 で返ってくるか

### Error: Universal Link が動かない

**チェック項目:**
1. ✅ Associated Domains が Xcode に追加されているか
2. ✅ Apple Developer で App ID に Associated Domains が有効か
3. ✅ apple-app-site-association に正しい Team ID が入っているか
4. ✅ Bundle ID が一致しているか

### デバッグ方法

実機で:
```
Settings → Developer → Universal Links
→ Associated Domains Development
→ ON にする
```

---

## 📝 チェックリスト

### バックエンド
- [ ] `/.well-known/apple-app-site-association` エンドポイント追加
- [ ] `/line-auth/callback` エンドポイント追加
- [ ] Team ID を設定

### Xcode
- [ ] Associated Domains Capability 追加
- [ ] `applinks:YOUR_DOMAIN` を追加
- [ ] Universal Link ハンドリングコード追加

### Apple Developer
- [ ] App ID に Associated Domains を有効化

### LINE Developers Console
- [ ] iOS bundle ID 設定
- [ ] iOS scheme 設定
- [ ] iOS universal link 設定

---

## 💡 次のステップ

1. **Team ID を教えて**
2. **ドメインを決める**（Cloud Run でOK？カスタムドメイン？）
3. バックエンドのコードを追加
4. Xcode設定
5. テスト

準備できた？Team ID とドメイン教えて！🚀

