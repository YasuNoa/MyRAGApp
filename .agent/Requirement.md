# 要件定義書 (Requirement.md)

## 1. プロジェクト概要
**プロジェクト名**: MyRAGApp (じぶんAI)
**目的**: ユーザーの個人的な知識（Google Drive, 手動メモ, LINEメッセージ, 音声）を集約し、RAG (Retrieval-Augmented Generation) 技術を用いて対話的に検索・活用できる「自分だけのAIアシスタント」を構築する。

## 2. ターゲットユーザー
*   個人の知識管理を効率化したいユーザー
*   日々のメモや学習記録をAIに覚えさせ、振り返りや検索に活用したいユーザー
*   Google Drive上のドキュメントを横断的に検索したいユーザー

## 3. 機能要件

### 3.1. 知識のインポート (Input)
*   **Google Drive連携**:
    *   Google Drive内のファイル（PDF, Google Docs）を一覧表示し、選択してインポートできること。
    *   インポート時にテキスト抽出、ベクトル化を行い、検索可能な状態にすること。
*   **手動アップロード**:
    *   テキストファイル、PDF、画像などを直接アップロードできること。
    *   OCR機能により、画像やスキャンPDFからもテキストを抽出できること。
*   **手動メモ (Notes)**:
    *   NotionライクなUIで、テキストメモを作成・保存できること。
    *   タグ付けによる整理ができること。
*   **音声文字起こし**:
    *   音声ファイルをアップロードし、Gemini 2.0 Flashを用いて高精度に文字起こしができること。
    *   文字起こし結果をノートとして保存できること。
*   **LINE連携**:
    *   LINE公式アカウントを通じて、メッセージを送信するだけでAIに記憶（STORE）させることができること。
    *   「振り返り」機能により、その日の記録をまとめて確認できること。

### 3.2. 検索・対話 (Output)
*   **RAGチャット**:
    *   自然言語で質問すると、蓄積された知識ベースから関連情報を検索し、回答を生成すること。
    *   **ハイブリッド検索**: ベクトル検索 (Pinecone) と、フルテキスト取得 (PostgreSQL) を組み合わせ、文脈を考慮した回答を行うこと。
*   **タグフィルタリング**:
    *   チャット時に特定のタグで検索範囲を絞り込めること。
*   **LINEチャット**:
    *   LINE上でAIと対話し、知識ベースに基づいた回答を得られること。

### 3.3. ユーザー管理
*   **認証**:
    *   Googleアカウント、LINEアカウントでのログイン（NextAuth.js）。
    *   アカウントリンク機能（複数のプロバイダを1つのユーザーに紐付け）。
*   **プロフィール**:
    *   表示名の変更、連携アカウントの管理。

## 4. 非機能要件
*   **レスポンス速度**: チャットの回答はストレスのない速度で生成されること（Gemini Flashモデルの活用）。
*   **データプライバシー**: ユーザーごとのデータは厳密に分離され、他者のデータが混入しないこと（Row Level Security的なロジックの実装）。
*   **拡張性**: 将来的に他のデータソース（Slack, Notion等）とも連携可能なアーキテクチャであること。
*   **UI/UX**: モダンで直感的なインターフェース（Neo-brutalism / Glassmorphism デザイン）。

## 5. 使用技術スタック
*   **Frontend**: Next.js (App Router), React, Tailwind CSS
*   **Backend**: Python (FastAPI) - 重い処理（PDF解析, OCR, Embedding）を担当
*   **Database**: PostgreSQL (Prisma) - ユーザー情報, ドキュメント原本, メッセージ履歴
*   **Vector DB**: Pinecone - ベクトルインデックス
*   **LLM**: Google Gemini 2.0 Flash / Pro
*   **Auth**: NextAuth.js (Google, LINE)
*   **Infrastructure**: Google Cloud Run (Docker), Terraform
*   **DNS/CDN**: Cloudflare (Domain: jibun-ai.com)

