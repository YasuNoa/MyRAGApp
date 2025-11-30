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
      <div className="container" style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
          <div style={{ padding: "12px", borderRadius: "50%", backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Database size={24} />
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "var(--text-color)", margin: 0 }}>
            学習済みデータ一覧
          </h1>
        </div>

        <div className="neo-card" style={{ padding: "24px" }}>
          {isLoading ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "32px 0" }}>読み込み中...</p>
          ) : documents.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "32px 0" }}>学習済みのデータはありません</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    alignItems: "center",
                    gap: "16px",
                    padding: "16px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    transition: "background-color 0.2s"
                  }}
                >
                  <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "rgba(55, 65, 81, 0.5)", color: "#d1d5db", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileText size={20} />
                  </div>
                  
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontWeight: "500", color: "#e5e7eb", margin: "0 0 4px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.title}</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "12px", color: "#9ca3af" }}>
                      <span style={{ backgroundColor: "#374151", padding: "2px 8px", borderRadius: "9999px", whiteSpace: "nowrap" }}>
                        {doc.source === "google-drive" ? "Google Drive" : doc.source === "voice_memo" ? "Voice Memo" : "手動アップロード"}
                      </span>
                      <span style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      {doc.tags && doc.tags.map(tag => (
                        <span key={tag} style={{ backgroundColor: "rgba(59, 130, 246, 0.2)", color: "#93c5fd", padding: "2px 8px", borderRadius: "9999px", whiteSpace: "nowrap" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    style={{
                      padding: "8px",
                      color: "#6b7280",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "color 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#f87171"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "#6b7280"}
                    title="削除"
                  >
                    {deletingId === doc.id ? (
                      <span style={{ display: "inline-block", width: "16px", height: "16px", border: "2px solid currentColor", borderRightColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></span>
                    ) : (
                      <Trash2 size={20} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <style jsx>{`
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `}</style>
      </div>
    </LayoutWrapper>
  );
}
