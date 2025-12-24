# Info.plist 設定ガイド

## URL Types の設定

Xcodeで以下の手順で設定してください：

### 手順
1. プロジェクトを選択
2. TARGETS → jibunAI-ios
3. Info タブ
4. 一番下までスクロール
5. URL Types を探す（なければ Custom iOS Target Properties で右クリック → Add Row）

### 追加する URL Types

#### Item 0: Google Sign-In
```
Identifier: com.google.app
URL Schemes: com.googleusercontent.apps.968150096572-jo1mhu24kkubgkfeh7jet19ve0aksp18
```

#### Item 1: LINE SDK
```
Identifier: com.line.app  
URL Schemes: line3rdp.2008568178
```

---

## LSApplicationQueriesSchemes の設定

同じ Info タブで：

### 追加方法
1. Custom iOS Target Properties で右クリック
2. Add Row
3. Key: `LSApplicationQueriesSchemes` を入力
4. Type: Array

### 追加する値
```
Item 0: lineauth2
Item 1: line
```

---

## 完成イメージ（Info.plistのXMLビュー）

もし手動で編集する場合、Info.plist を右クリック → Open As → Source Code で以下を追加：

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLName</key>
        <string>com.google.app</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.968150096572-jo1mhu24kkubgkfeh7jet19ve0aksp18</string>
        </array>
    </dict>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLName</key>
        <string>com.line.app</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>line3rdp.2008568178</string>
        </array>
    </dict>
</array>

<key>LSApplicationQueriesSchemes</key>
<array>
    <string>lineauth2</string>
    <string>line</string>
</array>
```

