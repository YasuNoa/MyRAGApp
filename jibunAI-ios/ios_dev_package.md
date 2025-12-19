# iOSアプリ開発用 引き継ぎ資料

このドキュメントは、「MyRAGApp」のiOSフロントエンド開発を支援するAIアシスタント（XcodeのAI機能など）に渡すための必須情報をまとめたものです。

## 1. プロジェクト概要・技術スタック
- **目的**: 既存のRAG（検索拡張生成）サービスのiOSネイティブアプリを作成する。
- **言語**: Swift (SwiftUI)
- **ターゲットOS**: iOS 16.0以上
- **主要機能**:
    - ソーシャルログイン (Google, LINE, Apple)
    - チャットインターフェース (テキスト & RAG)
    - 音声メモの録音とアップロード
    - アプリ内課金 (サブスクリプション)

## 2. 認証 (Firebase Auth)
バックエンドは Firebase ID Token を使用して認証を行います。
- **iOS SDK**: `FirebaseAuth` を使用してください。
- **フロー**:
    1.  `GoogleSignIn`, `LineSDK`, `AuthenticationServices` (Sign in with Apple) を使ってユーザーログインを行う。
    2.  Userオブジェクトから `idToken` を取得する。
    3.  すべてのAPIリクエストの `Authorization` ヘッダーにこのトークンを付与する (`Bearer <token>`)。
    4.  **同期エンドポイント**: ログイン後、`POST /api/auth/sync` を叩いてユーザー情報をDBと同期させる。
        - *注: 現在のWebアプリではNext.jsのAPIルートで処理しています。アプリからこのNext.jsエンドポイントを叩くか、同様のロジックを実装する必要があります。*

## 3. APIエンドポイント (FastAPI Backed)
**Base URL**: `https://YOUR-CLOUD-RUN-URL.run.app` (実際の開発/本番URLに置換してください)

### チャット (Chat)
**`POST /ask`**
- **ヘッダー**: `Authorization: Bearer <firebase_id_token>`
- **ボディ (JSON)**:
    ```json
    {
      "query": "ユーザーの質問",
      "userId": "firebase_user_uid",
      "threadId": "スレッドID (任意)",
      "tags": ["タグ", "任意"]
    }
    ```
- **レスポンス**:
    ```json
    {
      "answer": "AIの回答...",
      "sources": ["ソース1...", "ソース2..."],
      "threadId": "スレッドID"
    }
    ```

### 音声メモ処理 (Voice Memo Processing)
**`POST /voice/process`** (定義: `routers/voice.py`)
- **ヘッダー**: `Authorization: Bearer <firebase_id_token>`
- **Content-Type**: `multipart/form-data`
- **ボディ**:
    - `file`: (バイナリ音声データ, 例: m4a/mp3)
    - `metadata`: (JSON文字列) `{"userId": "uid", "tags": []}`
- **レスポンス**:
    ```json
    {
      "transcript": "文字起こし結果全文...",
      "summary": "要約の箇条書き..."
    }
    ```

**`POST /voice/save`**
- **ボディ (JSON)**:
    ```json
    {
      "userId": "uid",
      "transcript": "...",
      "summary": "...",
      "title": "音声メモのタイトル",
      "tags": []
    }
    ```

## 4. アプリ内課金 (RevenueCat)
Appleの厳格で複雑な課金システムの実装を簡略化するため、**RevenueCat** の使用を強く推奨します。

- **セットアップ**:
    1.  `RevenueCat` SDKをインストール。
    2.  RevenueCatの管理画面で Offering（Free, Standard, Premium）を設定。
    3.  これらを App Store Connect の Product ID と紐付ける。
- **理由**: レシート検証、「サブスクリプション有効期限」の判定ロジック、購入の復元（Restore）などを自動で処理してくれるため、工数を大幅に削減できます。

## 5. OpenAPI仕様書 (OpenAPI Spec)
ローカルで起動中のバックエンドに対して以下のコマンドを実行することで、機械可読なAPI仕様書 (`openapi.json`) を生成できます：

```bash
curl http://localhost:8000/openapi.json > openapi.json
```

この `openapi.json` をAIアシスタントに読み込ませることで、すべてのデータ型やエンドポイントの定義を完璧に理解させることができます。
