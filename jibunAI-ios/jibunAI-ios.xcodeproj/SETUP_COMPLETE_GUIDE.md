# Universal Link 設定 - 完全ガイド

## 🎯 あなたの設定情報

- **Team ID**: `F2KY6KTH3H`
- **Bundle ID**: `com.yasu.jibunAI-ios`
- **ドメイン**: `jibun-ai.com`

---

## ✅ Step 1: バックエンド（VSCode）

`main.py` または FastAPI のメインファイルに以下を追加：

```python
from fastapi import FastAPI
from fastapi.responses import JSONResponse, RedirectResponse
from typing import Optional

app = FastAPI()

# Universal Links 設定ファイル
@app.get("/.well-known/apple-app-site-association")
async def apple_app_site_association():
    return JSONResponse(
        content={
            "applinks": {
                "apps": [],
                "details": [{
                    "appID": "F2KY6KTH3H.com.yasu.jibunAI-ios",
                    "paths": ["/line-auth/*", "/auth/*", "/callback/*"]
                }]
            }
        },
        headers={"Content-Type": "application/json"}
    )

# LINE コールバック
@app.get("/line-auth/callback")
async def line_auth_callback(code: str, state: str):
    print(f"🟢 LINE callback: code={code[:10]}...")
    return RedirectResponse(
        url=f"com.yasu.jibunAI-ios://line-callback?code={code}&state={state}"
    )

# LINE コード → Firebase Token 交換
@app.post("/api/auth/line/exchange")
async def exchange_line_code(request: dict):
    code = request.get("code")
    # TODO: LINE OAuth + Firebase Custom Token 実装
    return {"firebaseToken": "YOUR_FIREBASE_TOKEN"}
```

**デプロイして確認:**
```
https://jibun-ai.com/.well-known/apple-app-site-association
```

---

## ✅ Step 2: Xcode 設定

### 2-1. Associated Domains 追加

1. **TARGETS** → **jibunAI-ios** を選択
2. **Signing & Capabilities** タブ
3. **+ Capability** をクリック
4. **Associated Domains** を検索して追加

### 2-2. Domain を追加

追加されたら、**+** ボタンをクリック:

```
applinks:jibun-ai.com
```

**注意:** `https://` は不要！

---

## ✅ Step 3: Apple Developer Center

### 3-1. App ID 設定

1. https://developer.apple.com/account
2. **Certificates, Identifiers & Profiles**
3. **Identifiers** → **App IDs**
4. `com.yasu.jibunAI-ios` を選択（なければ作成）
5. **Capabilities** で:
   - ✅ **Associated Domains** にチェック
   - ✅ **Sign in with Apple** にチェック（ついでに）
6. **Save**

---

## ✅ Step 4: LINE Developers Console

### 4-1. 設定追加

https://developers.line.biz/console/ で:

1. チャネル選択（2008568178）
2. **LINE Login** タブ
3. **App settings**:

```
iOS bundle ID: com.yasu.jibunAI-ios

iOS scheme: line3rdp.2008568178

iOS universal link: https://jibun-ai.com/line-auth/callback
```

4. **Save**

---

## ✅ Step 5: Info.plist 設定（Xcode）

### URL Schemes（既に設定済みかも）

**TARGETS** → **Info** → **URL Types**:

```
Item 0:
  Identifier: com.google.app
  URL Schemes: com.googleusercontent.apps.968150096572-jo1mhu24kkubgkfeh7jet19ve0aksp18

Item 1:
  Identifier: com.line.app
  URL Schemes: line3rdp.2008568178

Item 2 (新規追加):
  Identifier: com.yasu.app
  URL Schemes: com.yasu.jibunAI-ios
```

### LSApplicationQueriesSchemes

```
Item 0: lineauth2
Item 1: line
```

---

## 🧪 Step 6: テスト

### 6-1. バックエンド確認

ブラウザで開く:
```
https://jibun-ai.com/.well-known/apple-app-site-association
```

**期待される結果:**
```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "F2KY6KTH3H.com.yasu.jibunAI-ios",
      "paths": ["/line-auth/*", "/auth/*", "/callback/*"]
    }]
  }
}
```

### 6-2. Apple 検証ツール

https://search.developer.apple.com/appsearch-validation-tool/

ドメイン `jibun-ai.com` を入力して **Validate**

✅ が出ればOK！

### 6-3. 実機テスト

1. **実機でアプリをビルド**（Universal Link は実機必須）
2. **Safari** で開く:
   ```
   https://jibun-ai.com/line-auth/callback?code=test&state=test
   ```
3. **アプリが起動すれば成功！** 🎉

### 6-4. LINE ログインテスト

1. アプリで「LINEでログイン」をタップ
2. LINE ログイン画面
3. ログイン
4. **アプリに戻ってくれば成功！** 🎉

---

## 🚨 トラブルシューティング

### Error: "apple-app-site-association not found"

**チェック:**
- HTTPS で配信されているか
- Content-Type が `application/json` か
- ステータスコード 200 か

### Error: Universal Link が動かない

**チェック:**
1. ✅ Associated Domains が Xcode に追加されているか
2. ✅ Apple Developer で Associated Domains が有効か
3. ✅ Team ID が `F2KY6KTH3H` で正しいか
4. ✅ バックエンドがデプロイされているか

### デバッグモード（実機）

```
Settings → Developer → Universal Links
→ Associated Domains Development: ON
```

---

## 📝 チェックリスト

### バックエンド（VSCode）
- [ ] `/.well-known/apple-app-site-association` 追加
- [ ] `/line-auth/callback` 追加
- [ ] `/api/auth/line/exchange` 追加
- [ ] `jibun-ai.com` にデプロイ

### Xcode
- [ ] `jibunAI_iosApp.swift` 更新（Universal Link ハンドリング）
- [ ] Associated Domains Capability 追加
- [ ] `applinks:jibun-ai.com` 追加
- [ ] Info.plist に `com.yasu.jibunAI-ios` URL Scheme 追加

### Apple Developer
- [ ] App ID に Associated Domains 有効化
- [ ] App ID に Sign in with Apple 有効化

### LINE Developers Console
- [ ] iOS bundle ID: `com.yasu.jibunAI-ios`
- [ ] iOS scheme: `line3rdp.2008568178`
- [ ] iOS universal link: `https://jibun-ai.com/line-auth/callback`

---

## 🚀 次のステップ

1. **バックエンドにコード追加** → VSCodeで
2. **jibun-ai.com にデプロイ**
3. **ブラウザで確認** → `/.well-known/apple-app-site-association`
4. **Xcode設定** → Associated Domains
5. **Apple Developer設定** → App ID
6. **LINE設定** → iOS universal link
7. **ビルド & テスト** 🎉

準備できた？次どこから始める？ 🚀

