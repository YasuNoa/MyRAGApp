"use client";

import { useSession } from "next-auth/react";
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

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* サイドバー: ログイン時のみ表示 */}
      {isAuthenticated && <Sidebar />}

      {/* メインコンテンツエリア */}
      <main
        style={{
          flex: 1,
          marginLeft: isAuthenticated && isOpen ? "280px" : "0", // ログイン時かつOpen時のみマージン
          padding: "40px",
          maxWidth: "100%",
          transition: "margin-left 0.3s ease", // スムーズなアニメーション
        }}
      >
        {children}
      </main>
    </div>
  );
}
