# iOS Universal Link 対応 - バックエンド実装手順書

## 📋 プロジェクト情報

- **iOS Bundle ID**: `com.yasu.jibunAI-ios`
- **Apple Team ID**: `F2KY6KTH3H`
- **ドメイン**: `jibun-ai.com`
- **LINE Channel ID**: `2008568178`
- **バックエンドフレームワーク**: FastAPI
- **デプロイ先**: `https://jibun-ai.com`

---

## 🎯 実装する機能

### 1. Apple Universal Links のサポート
iOS アプリが `jibun-ai.com` のリンクを認識してアプリを開けるようにする

### 2. LINE ログインのコールバック処理
LINEからのリダイレクトを受け取り、iOSアプリに認証コードを渡す

### 3. LINE 認証コードの交換
iOS アプリから受け取った認証コードを Firebase Custom Token に変換する

---

## 🔧 実装手順

### Step 1: apple-app-site-association エンドポイントの追加

このファイルはiOSが読み込んで、どのパスをアプリで開くかを決定します。

#### エンドポイント仕様
- **パス**: `/.well-known/apple-app-site-association`
- **メソッド**: GET
- **Content-Type**: `application/json`
- **ファイル拡張子**: なし（重要！）
- **HTTPS**: 必須

#### 実装コード

```python
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/.well-known/apple-app-site-association")
async def apple_app_site_association():
    """
    Apple Universal Links の設定ファイル
    
    iOS がこのエンドポイントを定期的にチェックし、
    jibun-ai.com のリンクをアプリで開けるかを判断する
    
    重要:
    - Content-Type は application/json
    - ステータスコードは 200
    - HTTPS で配信必須
    - キャッシュしないこと（または短時間）
    """
    return JSONResponse(
        content={
            "applinks": {
                "apps": [],  # 空配列のまま
                "details": [
                    {
                        # Team ID + Bundle ID の組み合わせ
                        "appID": "F2KY6KTH3H.com.yasu.jibunAI-ios",
                        
                        # アプリで開くパスのパターン
                        "paths": [
                            "/line-auth/*",      # LINE 認証関連
                            "/auth/*",           # 一般的な認証
                            "/callback/*"        # コールバック
                        ]
                    }
                ]
            }
        },
        headers={
            "Content-Type": "application/json",
            # キャッシュを短くする（開発中は特に重要）
            "Cache-Control": "max-age=300"
        }
    )
```

#### テスト方法
デプロイ後、ブラウザで以下にアクセス:
```
https://jibun-ai.com/.well-known/apple-app-site-association
```

期待される出力:
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

---

### Step 2: LINE コールバックエンドポイントの追加

LINEの OAuth フローが完了すると、このエンドポイントにリダイレクトされます。

#### エンドポイント仕様
- **パス**: `/line-auth/callback`
- **メソッド**: GET
- **クエリパラメータ**:
  - `code` (必須): LINE の認証コード
  - `state` (必須): CSRF対策用のstate
  - `friendship_status_changed` (任意): LINE友達追加状態

#### 実装コード

```python
from fastapi import FastAPI, Query
from fastapi.responses import RedirectResponse
from typing import Optional

@app.get("/line-auth/callback")
async def line_auth_callback(
    code: str = Query(..., description="LINE OAuth authorization code"),
    state: str = Query(..., description="CSRF protection state"),
    friendship_status_changed: Optional[str] = Query(None, description="LINE friendship status")
):
    """
    LINE からのコールバックエンドポイント
    
    フロー:
    1. ユーザーが iOS アプリで「LINEでログイン」をタップ
    2. LINE SDK が LINE のログイン画面を開く
    3. ユーザーがログイン
    4. LINE がこのエンドポイントにリダイレクト (Universal Link)
    5. iOS がドメインを認識してアプリを起動
    6. このエンドポイントから iOS の URL Scheme でアプリにリダイレクト
    7. iOS アプリが code を受け取る
    
    注意:
    - Universal Link として動作するため、実際にはこのレスポンスは
      ブラウザに表示されず、iOS がインターセプトしてアプリを起動する
    - 念のため URL Scheme でのリダイレクトも実装
    """
    
    # ログ出力（デバッグ用）
    print(f"🟢 LINE callback received:")
    print(f"   Code: {code[:20]}...")
    print(f"   State: {state}")
    if friendship_status_changed:
        print(f"   Friendship: {friendship_status_changed}")
    
    # iOS アプリの URL Scheme を使ってリダイレクト
    # Universal Link で起動しない場合のフォールバック
    redirect_url = f"com.yasu.jibunAI-ios://line-callback?code={code}&state={state}"
    
    return RedirectResponse(
        url=redirect_url,
        status_code=302
    )
```

#### テスト方法（開発中）
ブラウザで以下にアクセス:
```
https://jibun-ai.com/line-auth/callback?code=test123&state=state456
```

期待される動作:
- iOS 実機: アプリが起動する
- ブラウザ: リダイレクトエラー（正常、アプリがないため）

---

### Step 3: LINE 認証コード交換エンドポイント

iOS アプリから LINE の認証コードを受け取り、Firebase Custom Token を返します。

#### エンドポイント仕様
- **パス**: `/api/auth/line/exchange`
- **メソッド**: POST
- **Content-Type**: `application/json`
- **リクエストボディ**:
  ```json
  {
    "code": "LINE_AUTHORIZATION_CODE"
  }
  ```
- **レスポンス**:
  ```json
  {
    "firebaseToken": "FIREBASE_CUSTOM_TOKEN"
  }
  ```

#### 実装コード

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import firebase_admin
from firebase_admin import auth, credentials
import os

# Firebase Admin SDK の初期化（アプリ起動時に1回だけ）
# サービスアカウントキーのパスを環境変数から取得
if not firebase_admin._apps:
    cred = credentials.Certificate(os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH"))
    firebase_admin.initialize_app(cred)


class LineAuthRequest(BaseModel):
    """LINE 認証コード交換リクエスト"""
    code: str


class LineAuthResponse(BaseModel):
    """Firebase Custom Token レスポンス"""
    firebaseToken: str


@app.post("/api/auth/line/exchange", response_model=LineAuthResponse)
async def exchange_line_code(request: LineAuthRequest):
    """
    LINE 認証コードを Firebase Custom Token に交換
    
    フロー:
    1. iOS アプリから LINE の認証コードを受け取る
    2. LINE OAuth API を使ってアクセストークンを取得
    3. LINE Profile API を使ってユーザー情報を取得
    4. Firebase Custom Token を生成
    5. iOS アプリに返す
    
    環境変数:
    - LINE_CHANNEL_ID: LINE チャネル ID (2008568178)
    - LINE_CHANNEL_SECRET: LINE チャネルシークレット
    - FIREBASE_SERVICE_ACCOUNT_KEY_PATH: Firebase サービスアカウントキーのパス
    """
    
    try:
        # Step 1: LINE OAuth トークンエンドポイント
        LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token"
        LINE_CHANNEL_ID = os.getenv("LINE_CHANNEL_ID", "2008568178")
        LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")
        
        if not LINE_CHANNEL_SECRET:
            raise HTTPException(
                status_code=500, 
                detail="LINE_CHANNEL_SECRET not configured"
            )
        
        # Step 2: LINE にアクセストークンをリクエスト
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                LINE_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": request.code,
                    "redirect_uri": "https://jibun-ai.com/line-auth/callback",
                    "client_id": LINE_CHANNEL_ID,
                    "client_secret": LINE_CHANNEL_SECRET
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            )
            
            if token_response.status_code != 200:
                print(f"❌ LINE token request failed: {token_response.text}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to exchange LINE code: {token_response.text}"
                )
            
            token_data = token_response.json()
            access_token = token_data["access_token"]
            id_token = token_data.get("id_token")  # OpenID Connect
            
            print(f"✅ LINE access token obtained")
        
        # Step 3: LINE Profile API でユーザー情報取得
        async with httpx.AsyncClient() as client:
            profile_response = await client.get(
                "https://api.line.me/v2/profile",
                headers={
                    "Authorization": f"Bearer {access_token}"
                }
            )
            
            if profile_response.status_code != 200:
                print(f"❌ LINE profile request failed: {profile_response.text}")
                raise HTTPException(
                    status_code=400,
                    detail="Failed to get LINE profile"
                )
            
            profile_data = profile_response.json()
            line_user_id = profile_data["userId"]
            display_name = profile_data.get("displayName")
            picture_url = profile_data.get("pictureUrl")
            
            print(f"✅ LINE user profile obtained: {line_user_id}")
        
        # Step 4: Firebase Custom Token を生成
        # UID は line_ プレフィックスをつけて一意にする
        firebase_uid = f"line_{line_user_id}"
        
        # カスタムクレーム（オプション）
        additional_claims = {
            "provider": "line",
            "line_user_id": line_user_id,
            "display_name": display_name,
            "picture": picture_url
        }
        
        custom_token = auth.create_custom_token(
            firebase_uid,
            additional_claims
        )
        
        # バイト列を文字列に変換
        firebase_token = custom_token.decode("utf-8")
        
        print(f"✅ Firebase Custom Token created for UID: {firebase_uid}")
        
        return LineAuthResponse(firebaseToken=firebase_token)
    
    except httpx.HTTPError as e:
        print(f"❌ HTTP error: {e}")
        raise HTTPException(status_code=500, detail=f"HTTP error: {str(e)}")
    
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
```

---

### Step 4: 環境変数の設定

以下の環境変数を設定してください:

```bash
# LINE 設定
LINE_CHANNEL_ID=2008568178
LINE_CHANNEL_SECRET=YOUR_LINE_CHANNEL_SECRET

# Firebase 設定
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/path/to/firebase-service-account-key.json
```

#### LINE Channel Secret の取得方法
1. https://developers.line.biz/console/ にアクセス
2. チャネルを選択（Channel ID: 2008568178）
3. **Basic settings** タブ
4. **Channel secret** をコピー

#### Firebase Service Account Key の取得方法
1. Firebase Console → Project Settings → Service accounts
2. 「Generate new private key」をクリック
3. ダウンロードした JSON ファイルをサーバーに配置
4. パスを環境変数に設定

---

### Step 5: 依存関係のインストール

```bash
pip install fastapi httpx firebase-admin pydantic
```

または `requirements.txt`:
```
fastapi>=0.104.0
httpx>=0.25.0
firebase-admin>=6.2.0
pydantic>=2.4.0
uvicorn>=0.24.0
```

---

## 🧪 テスト手順

### 1. ローカルテスト

```bash
# アプリ起動
uvicorn main:app --reload

# エンドポイントテスト
curl http://localhost:8000/.well-known/apple-app-site-association
curl "http://localhost:8000/line-auth/callback?code=test&state=test"
```

### 2. デプロイ後のテスト

#### apple-app-site-association の確認
```bash
curl https://jibun-ai.com/.well-known/apple-app-site-association
```

期待される出力:
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

#### Apple の検証ツール
https://search.developer.apple.com/appsearch-validation-tool/

ドメイン `jibun-ai.com` を入力して **Validate**

✅ が表示されれば成功！

---

## 🚨 トラブルシューティング

### Error: "apple-app-site-association not found"

**原因:**
- エンドポイントが実装されていない
- HTTPS で配信されていない
- パスが間違っている（`.well-known/` の前にスラッシュ `/` が必要）

**解決方法:**
```bash
# HTTPS でアクセスできるか確認
curl -I https://jibun-ai.com/.well-known/apple-app-site-association

# 期待されるヘッダー
# HTTP/2 200
# content-type: application/json
```

---

### Error: "Failed to exchange LINE code"

**原因:**
- LINE_CHANNEL_SECRET が設定されていない
- redirect_uri が LINE Console の設定と一致していない
- 認証コードの有効期限切れ（10分）

**解決方法:**
1. 環境変数を確認
2. LINE Console で Callback URL を確認:
   ```
   https://jibun-ai.com/line-auth/callback
   ```
3. ログを確認

---

### Error: "Firebase Admin SDK initialization failed"

**原因:**
- サービスアカウントキーが見つからない
- 権限が不足している

**解決方法:**
1. サービスアカウントキーのパスを確認
2. ファイルの読み取り権限を確認
3. Firebase Console でサービスアカウントの権限を確認

---

## 📝 チェックリスト

### 実装
- [ ] `/.well-known/apple-app-site-association` エンドポイント追加
- [ ] `/line-auth/callback` エンドポイント追加
- [ ] `/api/auth/line/exchange` エンドポイント追加
- [ ] Firebase Admin SDK 初期化
- [ ] 環境変数設定

### デプロイ
- [ ] `jibun-ai.com` にデプロイ
- [ ] HTTPS で配信されているか確認
- [ ] 環境変数が本番環境に設定されているか確認

### テスト
- [ ] `/.well-known/apple-app-site-association` にアクセスできるか
- [ ] Apple 検証ツールで ✅ が出るか
- [ ] ログが正しく出力されるか

---

## 🚀 次のステップ

1. このコードを実装
2. `jibun-ai.com` にデプロイ
3. iOS側の設定（別途手順あり）
4. 実機テスト

---

## 📞 サポート

エラーが出たら以下を確認:
1. サーバーログ
2. `curl` でのエンドポイントテスト
3. 環境変数の設定

それでも解決しない場合は、エラーメッセージとログを共有してください。

