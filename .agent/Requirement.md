# 要件定義書 (Requirement.md)

## 1. プロジェクト概要
**プロジェクト名**: じぶんAI (Jibun AI)
**目的**: ユーザーの個人的な知識（Google Drive, 手動メモ, LINEメッセージ, 音声）を集約し、RAG (Retrieval-Augmented Generation) 技術を用いて対話的に検索・活用できる「自分だけのAIアシスタント」を構築する。

## 2. ターゲットユーザー
*   個人の知識管理を効率化したいユーザー
*   日々のメモや学習記録をAIに覚えさせ、振り返りや検索に活用したいユーザー
*   Google Drive上のドキュメントを横断的に検索したいユーザー

## 3. 機能要件

### 3.1. 知識のインポート (Input)
*   **Google Drive連携**:
    *   Google Drive内のファイル（PDF, Google Docs, Slides, Sheets）をインポート。
    *   テキスト抽出、ベクトル化を行い、検索可能な状態にする。
*   **ファイルアップロード**:
    *   PDF, 画像, Officeファイル (Word, Excel, PPT) を直接アップロード。
    *   **OCR機能**: 画像やスキャンPDFからもテキストを抽出 (Tesseract / Gemini Vision)。
*   **音声文字起こし (Voice Memo)**:
    *   音声ファイルをアップロードし、**Gemini 2.0 Flash** を用いて高精度に文字起こし・要約。
    *   文字起こし結果（Transcript）と要約（Summary）を自動保存。
*   **LINE連携**:
    *   LINE公式アカウントを通じて、メッセージを送信するだけでAIに記憶（STORE）させる。
    *   画像や音声メッセージの保存にも対応（予定）。

### 3.2. 検索・対話 (Output)
*   **RAGチャット**:
    *   自然言語で質問すると、蓄積された知識ベースから関連情報を検索し、回答を生成。
    *   **ハイブリッド検索**: ベクトル検索 (Pinecone) と、キーワード検索/フィルタリングを組み合わせる。
    *   **Re-ranking**: 検索結果を Cross-Encoder で再ランク付けし、精度を向上。
*   **タグフィルタリング**:
    *   チャット時に特定のタグで検索範囲を絞り込み。
*   **LINEチャット**:
    *   LINE上でAIと対話し、知識ベースに基づいた回答を得る。
    *   意図分類 (Intent Classification) により、保存(STORE)と検索(SEARCH)を自動判別。

### 3.3. 管理機能
*   **知識管理**:
    *   インポート済みデータの一覧表示、削除、タグの編集。
*   **ユーザー管理**:
    *   Google / LINE アカウントでのログイン (NextAuth.js)。
    *   アカウントリンク機能。

## 4. 非機能要件
*   **レスポンス速度**: Gemini 2.0 Flash モデルの活用により、高速な応答を実現。
*   **データプライバシー**: Row Level Security (RLS) に準じたロジックで、ユーザーごとのデータを厳密に分離。
*   **拡張性**: Cloud Run によるサーバーレス構成で、アクセス増にも柔軟に対応。

## 5. 使用技術スタック
*   **Frontend**: Next.js 15 (App Router), React, Tailwind CSS
*   **Backend**: Python 3.11 (FastAPI) - PDF解析, OCR, Embedding, Re-ranking
*   **Database**: PostgreSQL (Prisma) - メタデータ, 全文コンテンツ
*   **Vector DB**: Pinecone - ベクトルインデックス
*   **LLM**: Google Gemini 2.0 Flash / Pro
*   **Auth**: NextAuth.js (Google, LINE)
*   **Infrastructure**: Google Cloud Run, Cloud Build, Secret Manager
*   **DNS/CDN**: Cloudflare

