# 音声処理機能の改善と堅牢化 (2025/12/09)

## 概要
長時間（30分〜180分）の音声ファイルに対応し、かつ文字起こし・要約の品質を担保するための大規模な改修を行いました。

## 主な変更点

### 1. 10分分割処理 (Chunking) の実装
Gemini 1.5 Flash の出力トークン制限（約8,000トークン / 日本語で約25分相当）を回避するため、長尺動画を分割して処理するロジックを実装しました。

*   **Before**:
    *   1つのファイルをそのままGeminiにアップロード。
    *   30分を超える音声の場合、途中で出力がカットされ、JSONフォーマットエラーや文字起こしの欠損が発生。
*   **After**:
    *   `ffmpeg` を使用し、音声を **10分 (600秒) ごと** に物理分割 (`part000.mp3`, `part001.mp3`...)。
    *   各パートを順次Geminiで「文字起こしのみ」処理。
    *   全パートのテキストを結合し、最後にまとめて「要約」を生成。
    *   **成果**: 180分の動画でも途切れることなく全文文字起こしが可能に。

### 2. ロバストなフォーマットへの変更
GeminiのJSON生成能力の限界（長文時の構文エラー）を回避するため、独自のテキストフォーマットを採用しました。

*   **Before**: `response_mime_type: "application/json"`
    *   長文生成時に `{` や `}` が欠落し、パースエラーが頻発。
*   **After**: 素のテキスト形式 (`text/plain`)
    *   独自の区切り文字 `[SUMMARY]` と `[TRANSCRIPT]` を使用。
    *   Markdownのような形式で出力させ、正規表現やSplitで抽出。
    *   **成果**: フォーマット崩れによるエラーがほぼゼロに。

### 3. 要約品質の向上 (Prompt Engineering)
「要約が短い」「最初の方しか要約されない」という問題に対応しました。

*   **変更内容**:
    *   プロンプトに `Cover the **entire content**` (全内容をカバーせよ) と明記。
    *   `Structure with bullet points` (箇条書きで構造化せよ) と指示。
    *   **成果**: 4万文字を超える長文でも、全体を網羅した包括的な要約が生成されるように改善。

### 4. フロントエンド連携の修正
*   **修正**: `src/services/python-backend.ts` が `save="false"` (保存しない) を送っていたバグを修正。
*   **成果**: 手動アップロードおよび授業ノートの録音が、正しくDBとPineconeに保存されるようになりました。

## 構成図 (処理フロー)

```mermaid
graph TD
    A[User Upload] -->|Audio File| B(Backend API)
    B --> C{User Plan Check}
    C -->|Free| D[Truncate to 20min]
    C -->|Standard| E[Truncate to 90min]
    D --> F[Chunking Logic]
    E --> F
    
    subgraph "Chunking Process"
        F -->|ffmpeg| G[Split into 10min Segments]
        G --> H[Loop Segments]
        H -->|Transcribe| I[Gemini 1.5 Flash]
        I --> J[Merge Transcripts]
    end
    
    J -->|Full Text| K[Generate Summary (Gemini)]
    K --> L[Save to PostgreSQL & Pinecone]
```

## 今後の課題・推奨事項
1.  **DBスキーマへの `duration` 追加**:
    *   現在 `Document` テーブルに音声の長さ情報がないため、正確な利用統計のため追加を推奨 (Int型, 秒単位)。
2.  **スケーラビリティ**:
    *   現在は同期処理（アップロード中に待機が必要）。ユーザー数が急増した場合は、非同期キュー（Worker処理）への移行を検討。
