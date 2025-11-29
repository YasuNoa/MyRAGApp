"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type KnowledgeContextType = {
  refreshTrigger: number;
  triggerRefresh: () => void;
};

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(undefined);

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <KnowledgeContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </KnowledgeContext.Provider>
  );
}

export function useKnowledge() {
  const context = useContext(KnowledgeContext);
  if (context === undefined) {
    throw new Error("useKnowledge must be used within a KnowledgeProvider");
  }
  return context;
}
