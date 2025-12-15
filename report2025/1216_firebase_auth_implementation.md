# 2025-12-16: Firebase Authentication Implementation Report

## 概要
本プロジェクトでは、従来の `NextAuth.js` を廃止し、**Firebase Authentication** を中心とした認証基盤へ移行しました。
これにより、クライアントサイドでの柔軟な状態管理と、バックエンドAPIでの堅牢なトークン検証が可能になりました。

## アーキテクチャ構成

### A. クライアントサイド (Frontend)
- **`AuthContext` (`src/context/AuthContext.tsx`)**:
  - アプリケーション全体でログイン状態 (`user`) と認証トークンを管理するコンテキストです。
  - Firebase SDKの `onAuthStateChanged` を使用し、リアルタイムにログイン状態を監視します。
  - **`fetchWithAuth`**: 自動的にトークン (`Authorization: Bearer ...`) を付与してAPIリクエストを行う関数を提供。

- **`useAuth` フック**:
  - 各コンポーネントから簡単に `user` 情報や `fetchWithAuth` を利用するためのカスタムフックです。

- **API連携**:
  - Googleログイン: `signInWithPopup` (Client SDK) を使用。
  - LINEログイン: カスタムフロー (後述) を使用。

### B. サーバーサイド (Backend / API)
- **`verifyAuth` (`src/lib/auth-check.ts`)**:
  - APIルート向けの認証ガード関数です。
  - リクエストヘッダーの `Authorization` からIDトークンを取得し、`Firebase Admin SDK` を使って検証します。
  - 検証後、**Prisma `Account` テーブル** を参照して、DB上の `User.id` (CUID) を解決して返します。

- **ユーザー同期 (`app/api/auth/sync/route.ts`)**:
  - ログイン/登録成功時に呼び出される重要なAPIです。
  - Firebase UIDを受け取り、DBに `User` レコードが存在しなければ**新規作成**し、存在すれば紐付けを行います。

## 認証フローの詳細

### Google ログイン
1. ユーザーが「Googleでログイン」ボタンをクリック。
2. Firebase Client SDK (`signInWithPopup`) でGoogle認証を実行。
3. 成功後、IDトークンを取得し、`/api/auth/sync` をコール。
4. DB同期完了後、タッシュボードへリダイレクト。

### LINE ログイン (Custom Auth)
1. ユーザーが「LINEでログイン」ボタンをクリック。
2. `/api/auth/line/login` へリダイレクト（LINEの認証画面へ）。
3. 認証後、`/api/auth/line/callback` に戻る。
4. サーバー側でLINEの検証を行い、**Firebase Custom Token** を発行。
5. トークン付きでフロントエンド (`/login/callback?token=...`) に戻す。
6. クライアント側で `signInWithCustomToken` を実行し、Firebaseログイン完了。
7. `/api/auth/sync` でDB同期し、ダッシュボードへ。

## セキュリティ対策 (Security Guards)

### ルーティング保護 (`LayoutWrapper.tsx`)
- **クライアントサイドガード**:
  - `publicPaths` (`/`, `/login`, `/register` 等) 以外のページへのアクセスを監視。
  - 未ログイン (`!user`) の場合、即座にログイン画面へ強制リダイレクトさせます。
  - ロード中はコンテンツを表示せず、ローディング画面を表示して情報のチラつき（Flash）を防ぎます。

### API保護
- 全ての保護されたAPIルート (`/api/ask` 等) で `verifyAuth` を呼び出し。
- 無効なトークンや未認証のリクエストは `401 Unauthorized` で拒否されます。

## データベース設計 (Prisma)
- **`Account` テーブル**:
  - `provider`: "firebase"
  - `providerAccountId`: Firebase UID
  - これにより、FirebaseのユーザーとアプリケーションのDBユーザー (`User`) を1対1で確実に紐付けています。

---

**ステータス**: 実装完了 (Implementation Complete)
**次のステップ**: Firebase Console での鍵設定と有効化
