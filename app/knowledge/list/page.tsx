"use client";

import { useState, useEffect } from "react";
import { useKnowledge } from "@/app/_context/KnowledgeContext";
import LayoutWrapper from "@/app/_components/LayoutWrapper";
import { FileText, Trash2, Database } from "lucide-react";

type Document = {
  id: string;
  title: string;
  source: string;
  createdAt: string;
  tags: string[];
};

export default function KnowledgeListPage() {
  const { refreshTrigger, triggerRefresh } = useKnowledge();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/knowledge/list");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このドキュメントを削除しますか？\n（検索対象から外れます）")) return;

    setDeletingId(id);
    try {
      const res = await fetch("/api/knowledge/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setDocuments(documents.filter((doc) => doc.id !== id));
        triggerRefresh();
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
      alert("削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <LayoutWrapper>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-full bg-blue-500/10 text-blue-400">
            <Database size={24} />
          </div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            学習済みデータ一覧
          </h1>
        </div>

        <div className="neo-card p-6">
          {isLoading ? (
            <p className="text-center text-gray-400 py-8">読み込み中...</p>
          ) : documents.length === 0 ? (
            <p className="text-center text-gray-400 py-8">学習済みのデータはありません</p>
          ) : (
            <div className="flex flex-col gap-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                >
                  <div className="p-2 rounded-lg bg-gray-700/50 text-gray-300">
                    <FileText size={20} />
                  </div>
                  
                  <div className="min-w-0">
                    <h3 className="font-medium truncate text-gray-200">{doc.title}</h3>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-400 mt-1">
                      <span className="bg-gray-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {doc.source === "google-drive" ? "Google Drive" : "手動アップロード"}
                      </span>
                      <span className="whitespace-nowrap">{new Date(doc.createdAt).toLocaleDateString()}</span>
                      {doc.tags && doc.tags.map(tag => (
                        <span key={tag} className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer"
                    title="削除"
                  >
                    {deletingId === doc.id ? (
                      <span className="loading loading-spinner loading-xs">...</span>
                    ) : (
                      <Trash2 size={20} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </LayoutWrapper>
  );
}
