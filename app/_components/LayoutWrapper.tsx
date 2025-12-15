"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSidebar } from "@/app/_context/SidebarContext";
import Sidebar from "./Sidebar";
import { useAuth } from "@/src/context/AuthContext";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar();
  const { user, loading } = useAuth();

  // If loading, you might want to show a spinner or keep layout stable
  // For now, we treat "loading" as potentially authenticated to avoid flicker, 
  // or you can treat it as unauthenticated. 
  // Let's default to showing sidebar only if authenticated.
  const isAuthenticated = !!user;
  // Note: loading check might be needed if we want to prevent flash of login screen, 
  // but here we just toggle sidebar.

  const pathname = usePathname();
  const router = useRouter();
  
  // Public paths (prefix match)
  const publicPaths = ["/", "/login", "/register", "/terms", "/privacy"];
  
  // Check if current path starts with any public path
  // Note: "/" matches everything, so we need to handle root specifically or be careful.
  // Actually, "/" startsWith "/" is always true. 
  // Better logic: strict match for root, prefix for others?
  // Or just specific list. User said "startsWith for /terms/v2".
  // Let's use a smarter check.
  const isPublicPath = publicPaths.some(path => {
    if (path === "/") return pathname === "/"; // Strict match for root to avoid matching /dashboard
    return pathname.startsWith(path);
  });

  // Sidebar logic: Show if authenticated AND NOT on a public path
  // (Guard below handles redirect, so if we are here and logged in and not public, show sidebar)
  const showSidebar = !!user && !isPublicPath;

  useEffect(() => {
    // Auth Guard
    if (!loading && !user && !isPublicPath) {
        router.push("/login");
    }
  }, [user, loading, pathname, isPublicPath, router]);

  if (loading || (!user && !isPublicPath)) {
      return (
        <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "black", color: "white" }}>
            Loading...
        </div>
      );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar: Show only when logged in and on protected routes */}
      {showSidebar && <Sidebar />}

      {/* Main Content Area */}
      <main
        style={{
            flex: 1,
            // Sidebar is fixed (280px), so we add margin-left to push content
            marginLeft: showSidebar && isOpen ? "280px" : "0", 
            // Dashboard and public pages might handle their own padding/layout
            padding: (pathname === "/dashboard" || isPublicPath) ? "0" : "40px",
            // Smooth transition for sidebar toggle
            transition: "margin-left 0.3s ease",
            // Dashboard needs fixed height, others auto
            height: pathname === "/dashboard" ? "100vh" : "auto",
            overflow: pathname === "/dashboard" ? "hidden" : "visible",
            maxWidth: "100%",
            boxSizing: "border-box" 
        }}
      >
        {children}
      </main>
    </div>
  );
}
