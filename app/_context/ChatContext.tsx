"use client";

import { useAuth } from "@/src/context/AuthContext";
import React, { createContext, useContext, useState, ReactNode } from "react";

type Message = {
  role: string;
  content: string;
};

type ChatContextType = {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  selectedTag: string;
  setSelectedTag: React.Dispatch<React.SetStateAction<string>>;
  clearChat: () => void;
  threadId: string | null;
  setThreadId: React.Dispatch<React.SetStateAction<string | null>>;
  loadThread: (id: string) => Promise<void>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { fetchWithAuth } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);

  const clearChat = () => {
    setMessages([]);
    setInput("");
    setIsLoading(false);
    setSelectedTag("");
    setThreadId(null);
  };

  const loadThread = async (id: string) => {
    setIsLoading(true);
    try {
        const res = await fetchWithAuth(`/api/thread/${id}`);
        if (res.ok) {
            const data = await res.json();
            setMessages(data.messages);
            setThreadId(id);
        }
    } catch (e) {
        console.error("Failed to load thread", e);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        setMessages,
        input,
        setInput,
        isLoading,
        setIsLoading,
        selectedTag,
        setSelectedTag,
        clearChat,
        threadId,
        setThreadId,
        loadThread,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
