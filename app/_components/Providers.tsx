"use client";

import { KnowledgeProvider } from "@/app/_context/KnowledgeContext";
import { SidebarProvider } from "@/app/_context/SidebarContext";
import { ChatProvider } from "@/app/_context/ChatContext";
import { NoteProvider } from "@/app/_context/NoteContext";
import { AuthProvider } from "@/src/context/AuthContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <KnowledgeProvider>
        <SidebarProvider>
          <ChatProvider>
            <NoteProvider>
              {children}
            </NoteProvider>
          </ChatProvider>
        </SidebarProvider>
      </KnowledgeProvider>
    </AuthProvider>
  );
}
