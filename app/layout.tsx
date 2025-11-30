import type { Metadata } from "next";

// アプリケーション全体のメタデータ（タイトルや説明）を定義します。
// これにより、SEO対策やブラウザのタブに表示されるタイトルが設定されます。
export const metadata: Metadata = {
  title: "じぶんAI",
  description: "LINE Bot & Web Chat Application",
};

import "./globals.css"; // グローバルスタイルをインポート

import Providers from "./_components/Providers";
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
        <Providers>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
