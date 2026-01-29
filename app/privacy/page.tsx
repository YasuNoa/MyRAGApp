import Link from "next/link";

export default function PrivacyPage() {
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
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "20px" }}>プライバシーポリシー</h1>
      <p style={{ marginBottom: "10px", color: "var(--text-secondary)" }}>最終更新日: 2025年11月30日</p>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "15px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>1. はじめに</h2>
        <p>
          「じぶんAI」（以下、「本サービス」といいます）は、ユーザーの個人的な知識管理と活用を支援するアプリケーションです。
          本プライバシーポリシーでは、本サービスにおけるユーザー情報の取り扱いについて説明します。
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "15px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>2. 収集する情報</h2>
        <p>本サービスは、以下の情報を収集・利用します。</p>
        <ul style={{ listStyleType: "disc", paddingLeft: "20px", marginTop: "10px" }}>
          <li><strong>Googleアカウント情報:</strong> ログイン認証およびユーザー識別のために、メールアドレスとプロフィール情報を取得します。</li>
          <li><strong>Google Drive内のデータ:</strong> ユーザーが明示的に選択したファイル（PDF, Google Docs等）の内容を取得します。これらはユーザーの同意なしに取得されることはありません。</li>
          <li><strong>ユーザー入力データ:</strong> チャットメッセージ、メモ、アップロードされたファイルの内容。</li>
          <li><strong>※注意事項:</strong> 学校の教材、職場の機密文書、または第三者の著作権を含むデータをアップロードする場合、ユーザーは所属する組織の許可を得ているものとみなします。これにより生じた問題について、開発者は関与しません。</li>
        </ul>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "15px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>3. 情報の利用目的</h2>
        <p>収集した情報は、以下の目的でのみ利用されます。</p>
        <ul style={{ listStyleType: "disc", paddingLeft: "20px", marginTop: "10px" }}>
          <li>本サービスの機能提供（RAG技術を用いた検索・回答生成）。</li>
          <li>ユーザー認証およびセッション管理。</li>
          <li>サービスの改善および不具合の修正。</li>
        </ul>
        <div style={{ marginTop: "15px", padding: "15px", backgroundColor: "rgba(255, 165, 0, 0.1)", border: "1px solid rgba(255, 165, 0, 0.3)", borderRadius: "8px" }}>
          <p style={{ fontWeight: "bold", color: "#ff9800", marginBottom: "5px" }}>【重要】AIモデルへのデータ利用について</p>
          <p style={{ fontSize: "0.95rem" }}>
            本サービス自体が独自のAIモデル学習を行うことはありませんが、<strong>AIプロバイダ（Google）の無料枠を利用する場合、入力データ（プロンプトやアップロード内容）がGoogleのモデル改善や品質向上のために利用される可能性があります。</strong>
          </p>
          <p style={{ fontSize: "0.95rem", marginTop: "10px", fontWeight: "bold" }}>
            機密情報や個人を特定できる詳細な情報は、AIへの入力（プロンプト）に含めないでください。
          </p>
        </div>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "15px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>4. 第三者への提供</h2>
        <p>
          本サービスは、以下の場合を除き、ユーザー情報を第三者に提供しません。
        </p>
        <ul style={{ listStyleType: "disc", paddingLeft: "20px", marginTop: "10px" }}>
          <li>
            <strong>LLMプロバイダ (Google Gemini API):</strong> 回答生成のために、関連するテキストデータを送信します。
            <br />
            <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              ※無料枠利用時は、入力データがGoogleによって一定期間保持され、モデル学習に利用される場合があります。
              詳細は<a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary-color)", textDecoration: "underline" }}>Google API Services User Data Policy</a>をご確認ください。
            </span>
          </li>
          <li>法令に基づく場合。</li>
        </ul>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "15px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>5. データの保存と削除</h2>
        <p>
          取得したデータは、アプリケーションデータベース (PostgreSQL / Supabase) に保存されます。
          ユーザーは、本サービスの機能を通じて、いつでも自身のデータを削除することができます。
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "15px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>6. Google API Services User Data Policyへの準拠</h2>
        <p>
          本サービスによるGoogle APIから受け取った情報の使用および他のアプリへの転送は、
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary-color)", textDecoration: "underline" }}>Google API Services User Data Policy</a>
          （Limited Use要件を含む）に準拠します。
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "15px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>7. お問い合わせ</h2>
        <p>
          本プライバシーポリシーに関するお問い合わせは、開発者までご連絡ください。
        </p>
      </section>
    </div>
  );
}
