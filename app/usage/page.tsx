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
          知識を登録する
        </h2>
        <div style={{ padding: "20px", backgroundColor: "var(--input-bg)", borderRadius: "var(--radius)", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
            <div style={{ padding: "10px", backgroundColor: "rgba(66, 133, 244, 0.1)", borderRadius: "8px", color: "var(--primary-color)" }}>
              <Database size={32} />
            </div>
            <div>
              <p style={{ marginBottom: "10px", lineHeight: "1.6" }}>
                まずはAIに覚えさせたい情報を登録しましょう。サイドバーの<strong>「知識登録」</strong>メニューから行えます。
              </p>
              <ul style={{ listStyle: "disc", paddingLeft: "20px", color: "var(--text-secondary)", lineHeight: "1.8" }}>
                <li><strong>テキスト入力</strong>: メモや議事録などを直接貼り付けて登録できます。</li>
                <li><strong>Googleドライブ連携</strong>: Googleドライブ内のドキュメントを直接インポートできます。</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ backgroundColor: "var(--primary-color)", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>2</span>
          チャットで質問する
        </h2>
        <div style={{ padding: "20px", backgroundColor: "var(--input-bg)", borderRadius: "var(--radius)", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
            <div style={{ padding: "10px", backgroundColor: "rgba(66, 133, 244, 0.1)", borderRadius: "8px", color: "var(--primary-color)" }}>
              <MessageSquare size={32} />
            </div>
            <div>
              <p style={{ marginBottom: "10px", lineHeight: "1.6" }}>
                登録した知識に基づいて、AIと会話ができます。サイドバーの<strong>「チャット」</strong>メニューから開始します。
              </p>
              <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
                「〇〇について教えて」「先週の会議の決定事項は？」など、登録したデータにある内容を質問してみましょう。AIが関連する情報を検索して回答します。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ backgroundColor: "var(--primary-color)", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>3</span>
          LINEで使う
        </h2>
        <div style={{ padding: "20px", backgroundColor: "var(--input-bg)", borderRadius: "var(--radius)", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
            <div style={{ padding: "10px", backgroundColor: "rgba(66, 133, 244, 0.1)", borderRadius: "8px", color: "var(--primary-color)" }}>
              <Smartphone size={32} />
            </div>
            <div>
              <p style={{ marginBottom: "10px", lineHeight: "1.6" }}>
                このAIはLINEからも利用できます。
              </p>
              <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
                外出先からでも、LINEで友達に話しかけるように質問すれば、同じ知識ベースを使って回答してくれます。
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
