# じぶんAI iOS アプリ - セットアップ手順書

## 🎯 今回実装する認証方法

- ✅ **Google Sign-In** - 設定済み
- ✅ **LINE ログイン** - バックエンド実装済み
- 🔜 **Apple Sign-In** - これから設定
- 🔜 **Microsoft** - これから設定

---

## 📦 Step 1: Swift Package Manager でパッケージ追加

### 1-1. Firebase iOS SDK
```
File → Add Package Dependencies...
URL: https://github.com/firebase/firebase-ios-sdk
Version: Up to Next Major Version 11.0.0
```

**選択するパッケージ:**
- ✅ `FirebaseAuth`
- ✅ `FirebaseFirestore` (オプション)

### 1-2. Google Sign-In SDK
```
File → Add Package Dependencies...
URL: https://github.com/google/GoogleSignIn-iOS
Version: Up to Next Major Version 8.0.0
```

**選択するパッケージ:**
- ✅ `GoogleSignIn`
- ✅ `GoogleSignInSwift`

### 1-3. LINE SDK
```
File → Add Package Dependencies...
URL: https://github.com/line/line-sdk-ios-swift
Version: Up to Next Major Version 5.0.0
```

**選択するパッケージ:**
- ✅ `LineSDK`

---

## 🔥 Step 2: Firebase Console設定

### 2-1. iOSアプリの追加

1. https://console.firebase.google.com を開く
2. **Webで使っているプロジェクト**を選択
3. ⚙️ **Project Settings** → **General** タブ
4. 「Your apps」セクションまでスクロール
5. **iOS アイコン**をクリックして「Add app」

### 2-2. Bundle ID設定

Xcodeで確認:
```
プロジェクト選択 → TARGETS → jibunAI-ios → General → Bundle Identifier
```

例: `com.yourcompany.jibunAI-ios`

この値をFirebaseに入力してください。

### 2-3. GoogleService-Info.plist ダウンロード

1. Firebaseの画面で「Download GoogleService-Info.plist」をクリック
2. ダウンロードしたファイルをXcodeにドラッグ＆ドロップ
3. ✅ **「Copy items if needed」にチェック**
4. ✅ **「Add to targets: jibunAI-ios」にチェック**
5. 「Finish」をクリック

---

## ⚙️ Step 3: Info.plist 設定

### 3-1. REVERSED_CLIENT_ID を確認

1. Xcodeで `GoogleService-Info.plist` を開く
2. `REVERSED_CLIENT_ID` の値をコピー
   - 例: `com.googleusercontent.apps.123456789-abc...`

### 3-2. URL Types追加（重要！）

プロジェクト設定で:

1. **TARGETS** → **jibunAI-ios** 選択
2. **Info** タブを開く
3. 一番下にスクロール
4. **URL Types** セクションを展開（なければ追加）
5. **+** ボタンをクリック

#### Google Sign-In用
```
URL Schemes: [REVERSED_CLIENT_ID をここに貼り付け]
Identifier: com.google.app
Role: Editor
```

#### LINE SDK用
```
URL Schemes: line3rdp.[YOUR_LINE_CHANNEL_ID]
Identifier: com.line.app
Role: Editor
```

**LINE Channel IDの確認方法:**
1. https://developers.line.biz/console/ を開く
2. プロバイダー → チャネル → 「Basic settings」
3. **Channel ID** をコピー

### 3-3. LSApplicationQueriesSchemes追加

**Info** タブで、右クリック → **Add Row**:

```
Key: LSApplicationQueriesSchemes
Type: Array
  - Item 0: lineauth2
  - Item 1 (オプション): line (LINE アプリ起動用)
```

---

## 📝 Step 4: LINE Channel ID の設定

`jibunAI_iosApp.swift` を開いて、以下の部分を編集:

```swift
init() {
    // Firebase初期化
    FirebaseApp.configure()
    
    // LINE SDK初期化
    // TODO: 以下の "YOUR_LINE_CHANNEL_ID" を実際のChannel IDに変更
    LineAuthManager.shared.setup(channelID: "YOUR_LINE_CHANNEL_ID")
}
```

**実際のChannel ID（数字）に置き換えてください。**

例:
```swift
LineAuthManager.shared.setup(channelID: "1234567890")
```

---

## 🧪 Step 5: ビルド & テスト

### ビルド前のチェックリスト

- [ ] Firebase SDK 追加済み
- [ ] Google Sign-In SDK 追加済み
- [ ] LINE SDK 追加済み
- [ ] `GoogleService-Info.plist` 追加済み
- [ ] Info.plist の URL Schemes 設定済み（Google + LINE）
- [ ] LINE Channel ID 設定済み
- [ ] LSApplicationQueriesSchemes 設定済み

### ビルドと実行

1. シミュレーター選択（iOS 16.0以上推奨）
2. **Product → Build** (Cmd+B)
3. エラーがなければ **Product → Run** (Cmd+R)

### テスト手順

1. アプリが起動し、ランディングページが表示される
2. 「無料で始める」をタップ
3. ログイン画面が表示される
4. **各ログインボタンをテスト:**
   - ✅ **Googleでログイン** → Google選択画面が表示される
   - ✅ **LINEでログイン** → LINEログイン画面が表示される
   - ⚠️ **Apple/Microsoft** → まだ設定していないので「エラー」になるのが正常

---

## 🚨 よくあるエラーと対処法

### エラー: "No such module 'FirebaseAuth'"
**原因:** Swift Package が正しく追加されていない

**対処法:**
1. Xcode を再起動
2. File → Packages → Resolve Package Versions
3. それでもダメなら、パッケージを削除して再度追加

---

### エラー: "The operation couldn't be completed. (OSStatus error -25300.)"
**原因:** Keychain Access 問題

**対処法:**
シミュレーターをリセット:
```
Device → Erase All Content and Settings...
```

---

### エラー: Google Sign-In が動かない
**チェック項目:**
1. ✅ `GoogleService-Info.plist` がプロジェクトに追加されている
2. ✅ Info.plist の URL Schemes に `REVERSED_CLIENT_ID` が設定されている
3. ✅ Bundle ID が Firebase Console と一致している
4. ✅ Firebase Console で Google 認証が有効化されている

---

### エラー: LINE ログインが動かない
**チェック項目:**
1. ✅ LINE Developers Console でチャネルが作成されている
2. ✅ `jibunAI_iosApp.swift` で正しい Channel ID を設定している
3. ✅ Info.plist の URL Schemes に `line3rdp.[CHANNEL_ID]` が設定されている
4. ✅ LSApplicationQueriesSchemes に `lineauth2` が追加されている
5. ✅ バックエンドの `/api/auth/line` エンドポイントが動作している

**バックエンドのテスト方法:**
```bash
curl -X POST https://myragapp-backend-968150096572.asia-northeast1.run.app/api/auth/line \
  -H "Content-Type: application/json" \
  -d '{"lineAccessToken": "test_token"}'
```

---

## 📱 次のステップ: Apple Sign-In 設定

Apple Sign-Inを有効にするには:

1. **Apple Developer Account** が必要（$99/年）
2. **App ID** を作成 + Sign in with Apple Capability追加
3. **Firebase Console** で Apple Sign-In を有効化
4. **Xcode** で Signing & Capabilities → Sign in with Apple 追加

詳細は別途設定時に説明します！

---

## 🔐 次のステップ: Microsoft 設定

Microsoft認証を有効にするには:

1. **Azure Portal** でアプリ登録
2. Client ID と Client Secret 取得
3. **Firebase Console** で Microsoft プロバイダー設定
4. Redirect URIを設定

詳細は別途設定時に説明します！

---

## 📞 サポート

エラーが出たら、以下の情報を教えてください:
- エラーメッセージ（全文）
- Xcodeのコンソールログ
- どのボタンを押したときのエラーか

一緒に解決しましょう！🚀

