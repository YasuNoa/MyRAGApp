"use client";

import { BookOpen, Database, MessageSquare, Smartphone } from "lucide-react";

export default function UsagePage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "30px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
        使い方ガイド
      </h1>

      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ backgroundColor: "var(--primary-color)", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>1</span>
          授業ノート・文字起こし
        </h2>
        <div style={{ padding: "20px", backgroundColor: "var(--input-bg)", borderRadius: "var(--radius)", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
            <div style={{ padding: "10px", backgroundColor: "rgba(66, 133, 244, 0.1)", borderRadius: "8px", color: "var(--primary-color)" }}>
              <BookOpen size={32} />
            </div>
            <div>
              <p style={{ marginBottom: "10px", lineHeight: "1.6" }}>
                授業や会議の音声をアップロードして、自動で文字起こし・要約ができます。サイドバーの<strong>「授業ノート」</strong>メニューから行えます。
              </p>
              <ul style={{ listStyle: "disc", paddingLeft: "20px", color: "var(--text-secondary)", lineHeight: "1.8" }}>
                <li><strong>リアルタイム録音</strong>: 「START」ボタンを押すだけで、その場で録音・文字起こしが始まります。</li>
                <li><strong>関連資料の添付</strong>: 授業で配られたPDFやテキストファイルを添付すると、音声データと一緒に保存・管理できます。</li>
                <li><strong>AI要約</strong>: 録音終了後、AIが自動的に要点をまとめた「AI Summary」を生成します。</li>
                <li><strong>カテゴリ管理</strong>: 「数学」「英語」などのカテゴリを付けて整理できます。</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ backgroundColor: "var(--primary-color)", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>2</span>
          知識を登録する
        </h2>
        <div style={{ padding: "20px", backgroundColor: "var(--input-bg)", borderRadius: "var(--radius)", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
            <div style={{ padding: "10px", backgroundColor: "rgba(66, 133, 244, 0.1)", borderRadius: "8px", color: "var(--primary-color)" }}>
              <Database size={32} />
            </div>
            <div>
              <p style={{ marginBottom: "10px", lineHeight: "1.6" }}>
                PDFやテキストデータも登録できます。サイドバーの<strong>「知識登録」</strong>メニューから行えます。
              </p>
              <ul style={{ listStyle: "disc", paddingLeft: "20px", color: "var(--text-secondary)", lineHeight: "1.8" }}>
                <li><strong>タグ付け</strong>: 登録時に「タグ」を入力することで、後から情報を探しやすくなります。</li>
                <li><strong>Googleドライブ連携</strong>: Googleドライブ内のドキュメントを直接インポートできます。</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ backgroundColor: "var(--primary-color)", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>3</span>
          タグで情報を整理・検索
        </h2>
        <div style={{ padding: "20px", backgroundColor: "var(--input-bg)", borderRadius: "var(--radius)", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
            <div style={{ padding: "10px", backgroundColor: "rgba(66, 133, 244, 0.1)", borderRadius: "8px", color: "var(--primary-color)" }}>
              <BookOpen size={32} />
            </div>
            <div>
              <p style={{ marginBottom: "10px", lineHeight: "1.6" }}>
                登録した知識にタグを付けることで、効率的に活用できます。
              </p>
              <ul style={{ listStyle: "disc", paddingLeft: "20px", color: "var(--text-secondary)", lineHeight: "1.8" }}>
                <li><strong>チャットで絞り込み</strong>: チャット画面の入力欄左にあるプルダウンからタグを選択すると、そのタグが付いたデータだけを対象に質問できます。</li>
                <li><strong>一覧で管理</strong>: 「学習済みデータ」メニューから、登録済みのデータをタグ付きで一覧表示・削除できます。</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ backgroundColor: "var(--primary-color)", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>4</span>
          高精度チャット (ロングコンテキスト)
        </h2>
        <div style={{ padding: "20px", backgroundColor: "var(--input-bg)", borderRadius: "var(--radius)", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
            <div style={{ padding: "10px", backgroundColor: "rgba(66, 133, 244, 0.1)", borderRadius: "8px", color: "var(--primary-color)" }}>
              <MessageSquare size={32} />
            </div>
            <div>
              <p style={{ marginBottom: "10px", lineHeight: "1.6" }}>
                登録した知識に基づいて、AIと会話ができます。
              </p>
              <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
                <strong>新機能:</strong> 従来の「要約検索」に加え、ドキュメントの<strong>「全文」</strong>を読み込んで回答するようになりました。これにより、授業の細かいニュアンスや、長い文脈を理解した正確な回答が可能になっています。
              </p>
              <p style={{ color: "var(--text-secondary)", lineHeight: "1.6", marginTop: "10px" }}>
                <strong>Google検索連携:</strong> 登録した知識だけでは答えられない質問（最新のニュースや一般的な事実など）には、AIが自動的に<strong>Google検索</strong>を行って回答します。
                <br />
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>※ 検索機能はプランによって回数制限がある場合があります。</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ backgroundColor: "var(--primary-color)", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>5</span>
          LINEで使う
        </h2>
        <div style={{ padding: "20px", backgroundColor: "var(--input-bg)", borderRadius: "var(--radius)", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
            <div style={{ padding: "10px", backgroundColor: "rgba(66, 133, 244, 0.1)", borderRadius: "8px", color: "var(--primary-color)" }}>
              <Smartphone size={32} />
            </div>
            <div>
              <p style={{ marginBottom: "10px", lineHeight: "1.6" }}>
                このAIはLINEからも利用できます。外出先からでも、LINEで友達に話しかけるように質問すれば、同じ知識ベースを使って回答してくれます。
              </p>
            </div>
          </div>
        </div>
      </section>

      <div style={{ marginTop: "50px", padding: "20px", borderTop: "1px solid var(--border-color)", textAlign: "center", color: "var(--text-secondary)", fontSize: "14px" }}>
        <p>じぶんAI - あなただけのパーソナルアシスタント</p>
      </div>
    </div>
  );
}
