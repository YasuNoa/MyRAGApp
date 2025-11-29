"use client";

import { useState, useEffect } from "react";
import { Trash2, FileText, Database } from "lucide-react";

type Document = {
  id: string;
  title: string;
  source: string;
  createdAt: string;
};

export default function KnowledgeList({ refreshTrigger }: { refreshTrigger?: number }) {
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

  if (isLoading) return <div>読み込み中...</div>;

  return (
    <div className="neo-card" style={{ marginTop: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          <Database size={20} />
          学習済みデータ一覧
        </h3>
        <button onClick={fetchDocuments} className="neo-button" style={{ padding: "5px 10px", fontSize: "12px" }}>
          更新
        </button>
      </div>

      {documents.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", textAlign: "center" }}>
          まだ学習データがありません。
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius)",
                backgroundColor: "var(--bg-color)",
              }}
            >
              <div style={{ marginRight: "12px" }}>
                <FileText size={24} color="var(--primary-color)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold" }}>{doc.title}</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  {new Date(doc.createdAt).toLocaleString()} • {doc.source}
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={deletingId === doc.id}
                className="neo-button"
                style={{
                  padding: "8px",
                  color: "#EA4335",
                  borderColor: "#EA4335",
                  backgroundColor: "transparent",
                }}
                title="削除"
              >
                {deletingId === doc.id ? "..." : <Trash2 size={16} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
