"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/app/_context/SidebarContext";
import Sidebar from "./Sidebar";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar();
  const { status } = useSession();

  // If loading, you might want to show a spinner or keep layout stable
  // For now, we treat "loading" as potentially authenticated to avoid flicker, 
  // or you can treat it as unauthenticated. 
  // Let's default to showing sidebar only if authenticated.
  const isAuthenticated = status === "authenticated";
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const showSidebar = isAuthenticated && !isLoginPage;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* サイドバー: ログイン時のみ表示 */}
      {showSidebar && <Sidebar />}

      {/* メインコンテンツエリア */}
      <main
        style={{
          flex: 1,
          marginLeft: showSidebar && isOpen ? "280px" : "0", // ログイン時かつOpen時のみマージン
          padding: "40px",
          maxWidth: "100%",
          transition: "margin-left 0.3s ease", // スムーズなアニメーション
        }}
      >
        {children}
      </main>

      {/* 固定フッターリンク (利用規約・PP) */}
      <div style={{
        position: "fixed",
        bottom: "10px",
        right: "20px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "4px",
        fontSize: "10px",
        color: "var(--text-secondary)",
        opacity: 0.5,
        pointerEvents: "none", // クリックは可能にするため、子要素でautoに戻す必要があるが、全体を薄くする意図ならこれでOK。ただしリンククリックさせたいならこれは不要か。
        // 背景削除
      }}>
        <a href="/terms" style={{ color: "inherit", textDecoration: "none", pointerEvents: "auto" }}>利用規約</a>
        <a href="/privacy" style={{ color: "inherit", textDecoration: "none", pointerEvents: "auto" }}>プライバシーポリシー</a>
      </div>
    </div>
  );
}
