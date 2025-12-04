import Link from "next/link";

export default function TermsPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link href="/" style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          gap: "8px", 
          color: "var(--text-secondary)", 
          textDecoration: "none",
          fontSize: "14px",
          padding: "8px 16px",
          borderRadius: "20px",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          border: "1px solid var(--border-color)"
        }}>
          ← ホームに戻る
        </Link>
      </div>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "20px" }}>利用規約</h1>
      <p style={{ marginBottom: "10px", color: "var(--text-secondary)" }}>最終更新日: 2025年11月30日</p>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "15px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>1. はじめに</h2>
        <p>
          この利用規約（以下、「本規約」といいます）は、「じぶんAI」（以下、「本サービス」といいます）の利用条件を定めるものです。
          本サービスを利用するすべてのユーザーは、本規約に同意したものとみなされます。
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "15px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>2. サービスの性質</h2>
        <p>
          本サービスは、ユーザー自身のデータをAIを用いて検索・活用するための個人的なツールです。
          現在はベータ版として提供されており、機能の変更や停止が予告なく行われる場合があります。
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "15px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>3. 免責事項</h2>
        <ul style={{ listStyleType: "disc", paddingLeft: "20px", marginTop: "10px" }}>
          <li><strong>回答の正確性:</strong> AIによって生成される回答は、必ずしも正確であるとは限りません。ユーザーは、生成された情報の正確性を自らの責任で確認するものとします。</li>
          <li><strong>データの消失:</strong> システムの不具合等によりデータが消失した場合、開発者はその責任を負いません。重要なデータは必ずバックアップをとってください。</li>
          <li><strong>サービスの停止:</strong> メンテナンスや障害により、サービスが一時的に利用できなくなる場合があります。</li>
        </ul>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "15px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>4. 禁止事項</h2>
        <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
        <ul style={{ listStyleType: "disc", paddingLeft: "20px", marginTop: "10px" }}>
          <li>法令または公序良俗に違反する行為。</li>
          <li>本サービスの運営を妨害する行為。</li>
          <li>他者の知的財産権やプライバシーを侵害する行為。</li>
          <li>不正な目的で本サービスを利用する行為。</li>
        </ul>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "15px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>5. 規約の変更</h2>
        <p>
          開発者は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
          変更後の規約は、本サービス上に表示された時点で効力を生じるものとします。
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "15px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>6. 準拠法・裁判管轄</h2>
        <p>
          本規約の解釈にあたっては、日本法を準拠法とします。
        </p>
      </section>
    </div>
  );
}
