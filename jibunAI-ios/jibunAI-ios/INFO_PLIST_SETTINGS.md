# Info.plist 設定項目

以下の設定をXcodeの Info.plist に追加してください：

## 1. Google Sign-In用 URL Scheme

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <!-- GoogleService-Info.plistのREVERSED_CLIENT_IDをここに入れる -->
            <string>com.googleusercontent.apps.YOUR-CLIENT-ID</string>
        </array>
    </dict>
</array>
```

## 2. Sign in with Apple Capability

Xcode で:
1. プロジェクトを選択
2. Signing & Capabilities タブ
3. 「+ Capability」をクリック
4. 「Sign in with Apple」を追加

## 3. Microsoft Sign-In用 URL Scheme（必要な場合）

```xml
<!-- 上記のCFBundleURLSchemesの配列に追加 -->
<string>msauth.YOUR-BUNDLE-ID</string>
```

## 4. LINE SDK用 URL Scheme（使用する場合）

```xml
<!-- 上記のCFBundleURLSchemesの配列に追加 -->
<string>line3rdp.YOUR-LINE-APP-ID</string>
```

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>lineauth2</string>
</array>
```

## 5. App Transport Security（開発環境用・本番では削除推奨）

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```
