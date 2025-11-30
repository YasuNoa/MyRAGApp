"use client";

import { SessionProvider } from "next-auth/react";
import { KnowledgeProvider } from "@/app/_context/KnowledgeContext";
import { SidebarProvider } from "@/app/_context/SidebarContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <KnowledgeProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </KnowledgeProvider>
    </SessionProvider>
  );
}
