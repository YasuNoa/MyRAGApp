import type { Metadata } from "next";

// アプリケーション全体のメタデータ（タイトルや説明）を定義します。
// これにより、SEO対策やブラウザのタブに表示されるタイトルが設定されます。
export const metadata: Metadata = {
  title: "じぶんAI",
  description: "LINE Bot & Web Chat Application",
};

import "./globals.css"; // グローバルスタイルをインポート

import { KnowledgeProvider } from "./_context/KnowledgeContext";
import { SidebarProvider } from "./_context/SidebarContext";
import LayoutWrapper from "./_components/LayoutWrapper";

// RootLayoutコンポーネント
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <KnowledgeProvider>
          <SidebarProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </SidebarProvider>
        </KnowledgeProvider>
      </body>
    </html>
  );
}
