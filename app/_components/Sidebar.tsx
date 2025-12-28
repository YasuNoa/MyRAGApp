import { useState, useEffect } from "react";
import { Trash2, FileText, Database, MessageSquare, Settings, PlusCircle, ChevronRight, ChevronLeft, HelpCircle, MessageSquarePlus, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useKnowledge } from "@/app/_context/KnowledgeContext";
import { useSidebar } from "@/app/_context/SidebarContext";
import { useChat } from "@/app/_context/ChatContext";
import { useAuth } from "@/src/context/AuthContext";
import InviteModal from "./InviteModal";
import { Gift } from "lucide-react";

type Document = {
  id: string;
  title: string;
  source: string;
  createdAt: string;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { refreshTrigger, triggerRefresh } = useKnowledge();
  const { isOpen, toggleSidebar, closeSidebar } = useSidebar();
  const { clearChat } = useChat();
  const { user, dbUser, fetchWithAuth } = useAuth();
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const handleMobileClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      closeSidebar();
    }
  };
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
      const res = await fetchWithAuth("/api/knowledge/list");
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
      const res = await fetchWithAuth("/api/knowledge/delete", {
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
    { href: "/note", label: "授業ノート", icon: <FileText size={20} /> },
    { href: "/knowledge/list", label: "学習済みデータ", icon: <Database size={20} /> },
    { href: "#invite", label: "友達招待", icon: <Gift size={20} color="#fbbf24" /> },
    { href: "/usage", label: "使い方", icon: <HelpCircle size={20} /> },
    { href: "/feedback", label: "お問い合わせ", icon: <MessageSquarePlus size={20} /> },
    { href: "/pricing", label: "アップグレード", icon: <Sparkles size={20} color="#fbbf24" /> },
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

        {/* New Chat Button */}
        <div style={{ padding: "20px 10px 0 10px" }}>
            <button
                onClick={() => {
                    clearChat();
                    router.push("/dashboard");
                    handleMobileClick();
                }}
                className="neo-button"
                style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 15px",
                    borderRadius: "8px",
                    backgroundColor: "transparent",
                    color: "#4285f4",
                    border: "1px solid rgba(66, 133, 244, 0.3)",
                    cursor: "pointer",
                    fontSize: "1rem",
                    transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(66, 133, 244, 0.1)"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
                <PlusCircle size={20} />
                <span>新しいチャット</span>
            </button>
        </div>

        {/* メインナビゲーション */}
        <nav style={{ padding: "10px 10px 20px 10px" }}>
          {navItems.map((item) => (
            <Link
              onClick={(e) => {
                if (item.href === "#invite") {
                    e.preventDefault();
                    setIsInviteOpen(true);
                    return;
                }
                handleMobileClick();
              }}
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

        <div style={{ borderBottom: "1px solid var(--border-color)", margin: "10px 0" }}></div>

        {/* Recently Chat History */}
        <div style={{ padding: "10px 10px 0 10px" }}>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "5px", paddingLeft: "10px" }}>最近のチャット</div>
            <ChatHistoryList />
        </div>

        <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} userId={dbUser?.id || ""} />

      </aside>
    </>
  );
}

function ChatHistoryList() {
    const { loadThread, threadId } = useChat();
    const [threads, setThreads] = useState<{id: string, title: string}[]>([]);
    const { refreshTrigger } = useKnowledge();
    const { fetchWithAuth } = useAuth(); // Add useAuth

    useEffect(() => {
        fetchThreads();
    }, [threadId]);

    const fetchThreads = async () => {
        try {
            const res = await fetchWithAuth("/api/thread");
            if (res.ok) {
                const data = await res.json();
                setThreads(data.threads);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {threads.map(thread => (
                <button
                    key={thread.id}
                    onClick={() => loadThread(thread.id)}
                    style={{
                        textAlign: "left",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: threadId === thread.id ? "rgba(66, 133, 244, 0.1)" : "transparent",
                        color: threadId === thread.id ? "var(--primary-color)" : "var(--text-color)",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "13px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}
                >
                    <MessageSquare size={14} style={{ minWidth: "14px" }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{thread.title}</span>
                </button>
            ))}
        </div>
    );
}
