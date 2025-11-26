import type { Metadata } from "next";

// アプリケーション全体のメタデータ（タイトルや説明）を定義します。
// これにより、SEO対策やブラウザのタブに表示されるタイトルが設定されます。
export const metadata: Metadata = {
  title: "じぶんAI",
  description: "LINE Bot & Web Chat Application",
};

import "./globals.css"; // グローバルスタイルをインポート

// RootLayoutコンポーネント
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        {/* ナビゲーションヘッダー */}
        <nav style={{ 
          padding: "16px 24px", 
          borderBottom: "1px solid var(--border-color)", 
          display: "flex", 
          alignItems: "center",
          gap: "24px",
          backgroundColor: "var(--bg-color)",
          marginBottom: "40px"
        }}>
          <div style={{ fontWeight: "bold", fontSize: "20px", marginRight: "auto", color: "var(--text-color)" }}>じぶんAI</div>
          <a href="/" className="neo-nav-link">チャット</a>
          <a href="/knowledge" className="neo-nav-link">知識登録</a>
          <a href="/profile" className="neo-nav-link">設定</a>
        </nav>
        
        {/* children には、各ページのコンテンツ（page.tsxなど）が差し込まれます */}
        <main style={{ padding: "0 20px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
