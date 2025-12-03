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
        gap: "16px",
        fontSize: "12px",
        color: "var(--text-secondary)",
        backgroundColor: "rgba(255, 255, 255, 0.8)", // 読みやすさのため背景追加
        padding: "4px 8px",
        borderRadius: "4px",
        backdropFilter: "blur(4px)"
      }}>
        <a href="/terms" style={{ color: "inherit", textDecoration: "none" }}>利用規約</a>
        <a href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>プライバシーポリシー</a>
      </div>
    </div>
  );
}
