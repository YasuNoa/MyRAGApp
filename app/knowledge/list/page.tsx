"use client";

import { useState, useEffect, useMemo } from "react";
import { useKnowledge } from "@/app/_context/KnowledgeContext";
import LayoutWrapper from "@/app/_components/LayoutWrapper";
import { FileText, Trash2, Database, Filter, Edit2, X, Check, Loader2 } from "lucide-react";
import TagInput from "@/app/_components/TagInput";

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

  // Filters
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");

  // Editing
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const startEditing = (doc: Document) => {
    setEditingDoc(doc);
    setEditTags(doc.tags || []);
  };

  const cancelEditing = () => {
    setEditingDoc(null);
    setEditTags([]);
  };

  const handleUpdateTags = async () => {
    if (!editingDoc) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/knowledge/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingDoc.id,
          tags: editTags,
          title: editingDoc.title // Keep title same for now
        }),
      });

      if (res.ok) {
        // Update local state
        setDocuments(documents.map(doc => 
          doc.id === editingDoc.id ? { ...doc, tags: editTags } : doc
        ));
        triggerRefresh();
        cancelEditing();
        alert("タグを保存しました");
      } else {
        alert("更新に失敗しました");
      }
    } catch (error) {
      console.error("Failed to update tags:", error);
      alert("更新に失敗しました");
    } finally {
      setIsUpdating(false);
    }
  };

  // Unique tags for filter dropdown
  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    documents.forEach(doc => {
      if (doc.tags) {
        doc.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      let matchSource = selectedSource === "all" || doc.source === selectedSource;
      // Handle legacy "drive" source
      if (selectedSource === "google-drive" && doc.source === "drive") {
        matchSource = true;
      }
      
      const matchTag = selectedTag === "all" || (doc.tags && doc.tags.includes(selectedTag));
      return matchSource && matchTag;
    });
  }, [documents, selectedSource, selectedTag]);

  return (
    <LayoutWrapper>
      <div className="container" style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "12px", borderRadius: "50%", backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Database size={24} />
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "var(--text-color)", margin: 0 }}>
              学習済みデータ一覧
            </h1>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(255, 255, 255, 0.05)", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <Filter size={16} style={{ color: "var(--text-secondary)" }} />
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "var(--text-color)",
                  outline: "none",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                <option value="all" style={{ color: "black" }}>すべてのソース</option>
                <option value="manual" style={{ color: "black" }}>手動アップロード</option>
                <option value="google-drive" style={{ color: "black" }}>Google Drive</option>
                <option value="voice_memo" style={{ color: "black" }}>授業ノート (Voice Memo)</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(255, 255, 255, 0.05)", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <Filter size={16} style={{ color: "var(--text-secondary)" }} />
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "var(--text-color)",
                  outline: "none",
                  fontSize: "14px",
                  cursor: "pointer",
                  maxWidth: "150px"
                }}
              >
                <option value="all" style={{ color: "black" }}>すべてのタグ</option>
                {uniqueTags.map(tag => (
                  <option key={tag} value={tag} style={{ color: "black" }}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="neo-card" style={{ padding: "24px" }}>
          {isLoading ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "32px 0" }}>読み込み中...</p>
          ) : filteredDocuments.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "32px 0" }}>
              {documents.length === 0 ? "学習済みのデータはありません" : "条件に一致するデータはありません"}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto auto",
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
                        {(doc.source === "google-drive" || doc.source === "drive") ? "Google Drive" : doc.source === "voice_memo" ? "Voice Memo" : "手動アップロード"}
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
                    onClick={() => startEditing(doc)}
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
                    onMouseEnter={(e) => e.currentTarget.style.color = "#60a5fa"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "#6b7280"}
                    title="タグを編集"
                  >
                    <Edit2 size={20} />
                  </button>
                  
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

        {/* Edit Modal */}
        {editingDoc && (
          <div style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "20px"
          }}>
            <div style={{
              backgroundColor: "#1f2937",
              borderRadius: "16px",
              padding: "24px",
              width: "100%",
              maxWidth: "500px",
              border: "1px solid var(--border-color)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "white" }}>タグの編集</h2>
                <button onClick={cancelEditing} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}>
                  <X size={24} />
                </button>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <p style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "8px" }}>ドキュメント名</p>
                <p style={{ color: "white", fontWeight: "500" }}>{editingDoc.title}</p>
              </div>

              <div style={{ marginBottom: "32px" }}>
                <p style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "8px" }}>タグ</p>
                <TagInput tags={editTags} onChange={setEditTags} placeholder="タグを追加..." />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  onClick={cancelEditing}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    backgroundColor: "transparent",
                    color: "#d1d5db",
                    border: "1px solid #374151",
                    cursor: "pointer",
                    fontWeight: "500"
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUpdateTags}
                  disabled={isUpdating}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    backgroundColor: "#2563eb",
                    color: "white",
                    border: "none",
                    cursor: isUpdating ? "not-allowed" : "pointer",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    opacity: isUpdating ? 0.7 : 1
                  }}
                >
                  {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  保存する
                </button>
              </div>
            </div>
          </div>
        )}

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
