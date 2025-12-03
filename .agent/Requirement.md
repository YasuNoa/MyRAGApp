# 要件定義書 (Requirement.md)

## 1. プロジェクト概要
**プロジェクト名**: じぶんAI (Jibun AI) / MyRAGApp
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
    *   PDF, 画像, Officeファイル (Word, Excel, PPT), CSV を直接アップロード。
    *   **OCR機能**: 画像やスキャンPDFからもテキストを抽出 (Gemini Vision)。
*   **音声文字起こし (Voice Memo)**:
    *   音声ファイルをアップロードし、**Gemini 2.0 Flash** を用いて高精度に文字起こし・要約。
    *   文字起こし結果（Transcript）と要約（Summary）を自動保存。
*   **LINE連携**:
    *   LINE公式アカウントを通じて、メッセージを送信するだけでAIに記憶（STORE）させる。
    *   画像や音声メッセージの保存にも対応（予定）。
*   **テキスト直接入力**:
    *   UIから直接テキストを入力して保存。

### 3.2. 検索・対話 (Output)
*   **RAGチャット**:
    *   自然言語で質問すると、蓄積された知識ベースから関連情報を検索し、回答を生成。
    *   **ハイブリッド検索**: ベクトル検索 (Pinecone) と、メタデータフィルタリング（タグ、ユーザーID）。
    *   **Long Context RAG**: 検索ヒットしたドキュメントの全文をPostgreSQLから取得し、Geminiの長いコンテキストウィンドウを活用して回答精度を向上。
    *   **Google検索 (Grounding)**: 内部知識で不足する場合、Google検索を実行して最新情報を補完。
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
*   **プロフィール管理**:
    *   ユーザー名の変更、アカウント削除。

## 4. 非機能要件
*   **レスポンス速度**: Gemini 2.0 Flash モデルの活用により、高速な応答を実現。
*   **データプライバシー**: Row Level Security (RLS) に準じたロジック（アプリ層でのフィルタリング）で、ユーザーごとのデータを厳密に分離。
*   **拡張性**: Cloud Run によるサーバーレス構成で、アクセス増にも柔軟に対応。
*   **インフラ**: Dockerコンテナベースのデプロイ (Frontend: Node.js, Backend: Python)。

## 5. 使用技術スタック
*   **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS
*   **Backend**: Python 3.11 (FastAPI) - PDF解析, OCR, Embedding, RAG Logic
*   **Database**: PostgreSQL (Prisma) - メタデータ, 全文コンテンツ, チャット履歴
*   **Vector DB**: Pinecone - ベクトルインデックス
*   **LLM**: Google Gemini 2.0 Flash / Pro (Embedding: text-embedding-004)
*   **Auth**: NextAuth.js v5 (Google, LINE)
*   **Infrastructure**: Google Cloud Run, Cloud Build, Secret Manager

---

## 6. 将来拡張計画書: マルチペルソナ・アーキテクチャとLTV最大化戦略

本セクションは、「じぶんAI (MyRAGApp)」が単なる学生向けツールに留まらず、ユーザーのライフステージ（学生→社会人）に合わせて進化し、高いLTV（顧客生涯価値）を実現するための技術的およびビジネス的な拡張仕様を定義する。

### 6.1. データベース拡張設計 (Schema Evolution)
将来的にユーザー属性や好みの対話スタイルを保存するため、User テーブルを以下のように拡張する準備を行う。

```prisma
// schema.prisma (Future Roadmap)

model User {
  id            String    @id @default(cuid())
  // ...既存のカラム

  // --- 拡張: ペルソナ設定 ---
  // 職業/ステータス (アプリの振る舞いのベースとなる)
  occupation    OccupationStatus @default(STUDENT) 
  
  // AIの対話モード (システムプロンプトの骨子)
  aiMode        AiMode           @default(TUTOR) 
  
  // AIの性格/トーン (回答の温度感)
  aiTone        AiTone           @default(EMPATHETIC)

  // 属性変更のトリガーとなる日付 (例: 卒業予定年月)
  graduationDate DateTime?
}

enum OccupationStatus {
  STUDENT       // 学生
  BUSINESS      // 社会人
  OTHER         // その他
}

enum AiMode {
  TUTOR         // 家庭教師 (解説・教育重視)
  SECRETARY     // 秘書 (結論・効率重視)
  BUTLER        // 執事 (丁寧・サポート重視)
}

enum AiTone {
  PASSIONATE    // 熱血 (モチベーション向上)
  ANALYTICAL    // 冷静 (事実重視)
  EMPATHETIC    // 優しい (共感重視)
}
```

### 6.2. UXフロー: パーソナライズ・オンボーディング
初回登録時、または設定変更時に以下のUIを提供し、ユーザー体験を最適化する。

**Step 1: ステータス確認**
UI: 「あなたの現在のステータスを教えてください」
*   🎓 学生 (Default: Tutor Mode)
*   💼 社会人 (Default: Secretary Mode)
*   🏠 その他

**Step 2: パートナー性格診断**
UI: 「AIにどんな話し方をしてほしいですか？」
*   🔥 熱血 (背中を押してほしい)
*   🧊 冷静 (淡々と事実を知りたい)
*   🥰 優しい (褒めて伸ばしてほしい)

### 6.3. バックエンド実装: 動的プロンプト注入 (Prompt Injection)
`main.py` における `get_chat_model()` 関数を拡張し、ユーザー設定に基づいてシステムプロンプトを動的に生成・切り替えられるロジック（Factory Pattern）を採用する。

**実装イメージ (Python):**
```python
def get_system_prompt(user_mode: str, user_tone: str) -> str:
    # 1. ベースプロンプトの選択 (役割)
    if user_mode == "SECRETARY":
        base_prompt = PROMPT_TEMPLATE_SECRETARY # "結論ファースト、効率重視..."
    else:
        base_prompt = PROMPT_TEMPLATE_TUTOR     # "分かりやすさ重視、教育的..."

    # 2. トーンの注入 (性格)
    if user_tone == "ANALYTICAL":
        tone_instruction = "感情的な表現を排し、数値と事実に基づいて客観的に..."
    elif user_tone == "PASSIONATE":
        tone_instruction = "ユーザーを鼓舞するような熱い言葉選びを..."
    else:
        tone_instruction = "ユーザーの苦労に寄り添い、共感的な言葉選びを..."

    # 3. 統合
    return f"{base_prompt}\n\n【トーン設定】\n{tone_instruction}"
```

### 6.4. ビジネス戦略: ライフサイクル・マネジメント (Churn Prevention)
本機能の最大の目的は、ユーザーの環境変化（卒業・就職・転職）による解約（Churn）を防ぐことにある。

**シナリオ: "Graduation to Business"**
*   **トリガー**: ユーザーが大学を卒業するタイミング（3月など）。
*   **アクション**: アプリから通知を表示。
    > 「🎓 卒業おめでとうございます！ 4月からは『学生モード』を終了し、あなたの仕事をサポートする**『ビジネス秘書モード』**に切り替えますか？ 会議の議事録作成や、業界分析のお手伝いができます。」
*   **効果**:
    *   「授業対策アプリ」から「業務効率化アプリ」へと価値をスライドさせる。
    *   蓄積されたデータ（過去の学習履歴など）を保持したまま、新しいユースケースを提供する。
    *   これにより、LTV（顧客生涯価値）を最大化する。
