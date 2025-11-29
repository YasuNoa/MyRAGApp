import { useState, useEffect } from "react";
import { Trash2, FileText, Database, MessageSquare, Settings, PlusCircle, ChevronRight, ChevronLeft, HelpCircle, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useKnowledge } from "@/app/_context/KnowledgeContext";
import { useSidebar } from "@/app/_context/SidebarContext";

type Document = {
  id: string;
  title: string;
  source: string;
  createdAt: string;
};

export default function Sidebar() {
  const pathname = usePathname();
  const { refreshTrigger, triggerRefresh } = useKnowledge();
  const { isOpen, toggleSidebar } = useSidebar();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  const fetchDocuments = async () => {
    // ... (existing fetch logic)
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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    // ... (existing delete logic)
    e.preventDefault();
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

  const navItems = [
    { href: "/", label: "チャット", icon: <MessageSquare size={20} /> },
    { href: "/knowledge", label: "知識登録", icon: <PlusCircle size={20} /> },
    { href: "/usage", label: "使い方", icon: <HelpCircle size={20} /> },
    { href: "/feedback", label: "フィードバック", icon: <MessageSquarePlus size={20} /> },
    { href: "/profile", label: "設定", icon: <Settings size={20} /> },
  ];

  return (
    <>
      {/* トグルボタン (サイドバーが閉じている時用) */}
      {!isOpen && (
        <button
          onClick={toggleSidebar}
          style={{
            position: "fixed",
            left: "20px",
            top: "20px",
            zIndex: 101,
            padding: "8px",
            borderRadius: "50%",
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-color)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
          }}
        >
          <ChevronRight size={20} color="var(--text-color)" />
        </button>
      )}

      <aside style={{
        width: "280px",
        height: "100vh",
        backgroundColor: "var(--bg-color)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 100,
        overflowY: "auto",
        transform: isOpen ? "translateX(0)" : "translateX(-100%)", // スライド開閉
        transition: "transform 0.3s ease", // スムーズなアニメーション
      }}>
        {/* ヘッダー */}
        <div style={{ 
          padding: "20px", 
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ fontWeight: "bold", fontSize: "20px", color: "var(--text-color)" }}>じぶんAI</div>
          <button 
            onClick={toggleSidebar}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: "var(--text-secondary)"
            }}
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* メインナビゲーション */}
        <nav style={{ padding: "20px 10px" }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`neo-nav-link ${pathname === item.href ? "active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 15px",
                marginBottom: "5px",
                borderRadius: "var(--radius)",
                textDecoration: "none",
                color: pathname === item.href ? "var(--primary-color)" : "var(--text-color)",
                backgroundColor: pathname === item.href ? "rgba(66, 133, 244, 0.1)" : "transparent",
                width: "100%", // 横幅いっぱいに広げる
                boxSizing: "border-box", // パディングを含めた幅計算
                cursor: "pointer", // カーソルをポインターにする
              }}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span> {/* ラベル部分も広げる */}
            </Link>
          ))}
        </nav>

        {/* 学習済みデータ一覧 */}
        <div style={{ padding: "20px 10px", borderTop: "1px solid var(--border-color)", flex: 1 }}>
          <h3 style={{ 
            fontSize: "14px", 
            color: "var(--text-secondary)", 
            padding: "0 10px", 
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <Database size={16} />
            学習済みデータ
          </h3>

          {isLoading ? (
            <div style={{ padding: "10px", fontSize: "12px", color: "var(--text-secondary)" }}>読み込み中...</div>
          ) : documents.length === 0 ? (
            <div style={{ padding: "10px", fontSize: "12px", color: "var(--text-secondary)" }}>データがありません</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: "var(--radius)",
                    fontSize: "13px",
                    backgroundColor: "var(--input-bg)",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                    <FileText size={14} color="var(--text-secondary)" style={{ minWidth: "14px" }} />
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {doc.title}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(doc.id, e)}
                    disabled={deletingId === doc.id}
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      padding: "4px",
                      color: "var(--text-secondary)",
                      opacity: 0.6,
                      display: "flex",
                      alignItems: "center"
                    }}
                    title="削除"
                  >
                    {deletingId === doc.id ? "..." : <Trash2 size={12} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
