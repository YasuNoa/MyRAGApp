"use client";

import { SessionProvider } from "next-auth/react";
import { KnowledgeProvider } from "@/app/_context/KnowledgeContext";
import { SidebarProvider } from "@/app/_context/SidebarContext";
import { ChatProvider } from "@/app/_context/ChatContext";
import { NoteProvider } from "@/app/_context/NoteContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <KnowledgeProvider>
        <SidebarProvider>
          <ChatProvider>
            <NoteProvider>
              {children}
            </NoteProvider>
          </ChatProvider>
        </SidebarProvider>
      </KnowledgeProvider>
    </SessionProvider>
  );
}
