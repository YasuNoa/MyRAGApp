# じぶんAI iOSアプリ - Firebase設定ガイド

## 📋 準備完了チェックリスト

### ✅ コード実装
- [x] `jibunAI_iosApp.swift` - Firebase初期化追加
- [x] `AuthService.swift` - 認証サービス実装
- [x] `SignInWithAppleCoordinator.swift` - Apple Sign-In実装
- [x] `LoginView.swift` - 実際の認証ロジックに更新
- [x] `APIService.swift` - バックエンドURL設定完了

### 📦 必要な手順

## 1. Swift Package Managerでパッケージ追加

### Firebase iOS SDK
1. Xcodeで **File → Add Package Dependencies...**
2. URL入力: `https://github.com/firebase/firebase-ios-sdk`
3. 以下を選択:
   - ✅ **FirebaseAuth**
   - ✅ **FirebaseFirestore**（オプション）

### Google Sign-In
1. **File → Add Package Dependencies...**
2. URL入力: `https://github.com/google/GoogleSignIn-iOS`
3. 以下を選択:
   - ✅ **GoogleSignIn**
   - ✅ **GoogleSignInSwift**

### LINE SDK（使用する場合）
1. **File → Add Package Dependencies...**
2. URL入力: `https://github.com/line/line-sdk-ios-swift`
3. ✅ **LineSDK** を選択

---

## 2. Firebase Console設定

### Step 1: GoogleService-Info.plistをダウンロード
1. [Firebase Console](https://console.firebase.google.com)にアクセス
2. プロジェクトを選択（既存のWebプロジェクトと同じもの）
3. **⚙️ Project Settings → General**
4. 「Your apps」セクションで **iOS アプリを追加**（または既存のを選択）
5. **Bundle ID** を入力: `com.yourcompany.jibunAI-ios`
6. **GoogleService-Info.plist** をダウンロード
7. **Xcodeプロジェクトのルート**にドラッグ＆ドロップ
   - ✅ **「Copy items if needed」にチェック**
   - ✅ **ターゲットに追加**されていることを確認

### Step 2: Google Sign-In設定
1. Firebase Console → **Authentication → Sign-in method**
2. **Google** を有効化
3. サポートメールを設定

### Step 3: Apple Sign-In設定
1. Firebase Console → **Authentication → Sign-in method**
2. **Apple** を有効化
3. Apple Developer Centerで:
   - App IDに「Sign In with Apple」Capabilityを追加
   - Service IDを作成（オプション、Webで使う場合）

### Step 4: Microsoft Sign-In設定
1. Firebase Console → **Authentication → Sign-in method**
2. **Microsoft** を有効化
3. [Azure Portal](https://portal.azure.com)で:
   - アプリ登録を作成
   - Client ID と Secret を取得
   - Firebase に設定

---

## 3. Xcode プロジェクト設定

### Info.plist設定

1. Xcodeでプロジェクトを選択
2. **Info** タブを開く
3. 以下を追加:

#### URL Types（重要！）
```
Key: CFBundleURLTypes
Type: Array
  - Item 0 (Dictionary)
    - CFBundleTypeRole: Editor
    - CFBundleURLSchemes (Array)
      - Item 0: com.googleusercontent.apps.[YOUR-REVERSED-CLIENT-ID]
```

**REVERSED_CLIENT_IDの確認方法:**
- `GoogleService-Info.plist`を開く
- `REVERSED_CLIENT_ID`の値をコピー
- 上記の`[YOUR-REVERSED-CLIENT-ID]`部分に貼り付け

例: `com.googleusercontent.apps.123456789-abcdefg`

### Sign in with Apple Capability追加

1. プロジェクトを選択
2. **Signing & Capabilities** タブ
3. **+ Capability** をクリック
4. **Sign in with Apple** を追加

### Bundle IDの確認
- **General** タブ → **Bundle Identifier**
- Apple Developer Centerの App ID と一致させる

---

## 4. Apple Developer Center設定

### App ID設定
1. [Apple Developer](https://developer.apple.com)にログイン
2. **Certificates, Identifiers & Profiles**
3. **Identifiers** → App IDを選択（または新規作成）
4. **Sign in with Apple** にチェック✅
5. 保存

---

## 5. バックエンド側の対応（必須）

### 新しいエンドポイントの実装

#### `/api/auth/sync` - ユーザー情報同期
```python
@app.post("/api/auth/sync")
async def sync_user(
    authorization: str = Header(...),
    user_id: str = Body(...)
):
    # Firebase ID Token検証
    # ユーザー情報をDBに保存/更新
    return {"status": "success"}
```

#### `/api/auth/line` - LINE認証（使用する場合）
```python
@app.post("/api/auth/line")
async def line_auth(
    lineAccessToken: str = Body(...)
):
    # LINEトークンを検証
    # Firebase Custom Tokenを生成
    return {"firebaseToken": custom_token}
```

---

## 6. テスト手順

### 開発中のテスト
1. シミュレーターでアプリをビルド
2. ランディングページが表示されることを確認
3. 「無料で始める」をタップ
4. 各ログインボタンをテスト:
   - ✅ Google Sign-In
   - ✅ Apple Sign-In
   - ✅ Microsoft Sign-In
   - ⚠️ LINE（SDKとバックエンド実装が必要）

### デバッグのヒント
- Xcodeのコンソールでログを確認
- Firebase Console → Authentication → Users でユーザーが作成されているか確認
- ネットワークエラーの場合は `APIService.baseURL` を確認

---

## 🚨 よくあるエラーと対処法

### エラー: "No such module 'FirebaseAuth'"
**対処:** Swift Package Managerでパッケージが正しく追加されているか確認。Xcode再起動も試してください。

### エラー: "The operation couldn't be completed. (OSStatus error -25300.)"
**対処:** Keychain Access問題。シミュレーターをリセット: Device → Erase All Content and Settings

### エラー: Google Sign-In failed
**対処:** 
- `GoogleService-Info.plist`が正しく追加されているか確認
- Info.plistのURL Schemeが正しいか確認
- Bundle IDが一致しているか確認

### エラー: Apple Sign-In failed
**対処:**
- Sign in with Apple Capabilityが追加されているか確認
- Apple Developer CenterでApp IDに設定されているか確認

---

## 🎉 完了！

全ての設定が完了したら、アプリをビルドして実際にログインしてみてください！

問題があれば、エラーメッセージをコピーして確認してください。
