"use client";

import { useSidebar } from "@/app/_context/SidebarContext";
import Sidebar from "./Sidebar";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツエリア */}
      <main
        style={{
          flex: 1,
          marginLeft: isOpen ? "280px" : "0", // サイドバーの開閉に合わせてマージン調整
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
