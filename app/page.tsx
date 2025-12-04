"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useChat } from "@/app/_context/ChatContext";
import { PlusCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import LandingPage from "@/app/_components/LandingPage";

export default function Home() {
  const { data: session, status, update } = useSession();
  const aiName = (session?.user as any)?.aiName || "じぶんAI";
  
  console.log("Current session status:", status); // Debug log
  
  const [tags, setTags] = useState<string[]>([]);
  const { 
    messages, setMessages, 
    input, setInput, 
    isLoading, setIsLoading, 
    selectedTag, setSelectedTag,
    clearChat,
    threadId, setThreadId
  } = useChat();

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch("/api/knowledge/categories");
        if (res.ok) {
          const data = await res.json();
          setTags(data.tags);
        }
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      }
    };
    fetchTags();
  }, []);

  if (status === "loading") {
      return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#000", color: "#fff" }}>Loading...</div>;
  }

  if (status === "unauthenticated") {
      return <LandingPage />;
  }

  const handleSubmit = async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    const userMessage = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: userMessage.content,
          tags: selectedTag ? [selectedTag] : [],
          threadId: threadId // Pass current threadId
        }),
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        const botMessage = { role: "assistant", content: data.answer || "エラーが発生しました" };
        setMessages((prev) => [...prev, botMessage]);
        
        // Update threadId if a new one was created
        if (data.threadId && data.threadId !== threadId) {
            setThreadId(data.threadId);
        }
      } else {
        const text = await res.text();
        setMessages((prev) => [...prev, { role: "assistant", content: "サーバーエラー: " + text }]);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "通信エラーが発生しました" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "40px", position: "relative" }}>
      {/* New Chat Button */}
      <button
        onClick={clearChat}
        style={{
          position: "absolute",
          top: "0",
          right: "0",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid var(--border-color)",
          borderRadius: "20px",
          padding: "8px 16px",
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontSize: "14px",
          transition: "all 0.2s",
        }}
        onMouseOver={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
        onMouseOut={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
      >
        <PlusCircle size={16} />
        <span>New Chat</span>
      </button>

      {/* タイトル (メッセージがない時のみ表示) */}
      {messages.length === 0 && (
        <div style={{ textAlign: "center", marginBottom: "40px", paddingTop: "40px" }}>
          <h1 
            onClick={clearChat}
            style={{ 
              margin: "0 0 10px 0", 
              fontSize: "2.5rem", 
              background: "linear-gradient(to right, #8ab4f8, #c58af9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              cursor: "pointer",
              display: "inline-block",
              transition: "opacity 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = "0.8"}
            onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
          >
            じぶんAI
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>あなたのためのAIアシスタント</p>
        </div>
      )}
      
      {/* チャット履歴 */}
      <div style={{ 
        minHeight: "400px", 
        marginBottom: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "24px"
      }}>
        {/* ... (Empty state) */}
        {messages.map((msg, index) => (
          <div key={index} style={{ 
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            <div style={{ 
              maxWidth: "80%",
              padding: "16px 20px",
              borderRadius: "18px",
              backgroundColor: msg.role === "user" ? "#303134" : "transparent",
              color: "var(--text-color)",
              lineHeight: "1.6"
            }}>
              <div style={{ 
                fontSize: "12px", 
                marginBottom: "4px", 
                color: "var(--text-secondary)",
                fontWeight: "bold"
              }}>
                {msg.role === "assistant" ? `🤖 ${aiName}` : "あなた"}
              </div>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({node, ...props}) => <p style={{margin: 0, marginBottom: '0.5em'}} {...props} />,
                  ul: ({node, ...props}) => <ul style={{margin: 0, paddingLeft: '1.5em', marginBottom: '0.5em'}} {...props} />,
                  ol: ({node, ...props}) => <ol style={{margin: 0, paddingLeft: '1.5em', marginBottom: '0.5em'}} {...props} />,
                  li: ({node, ...props}) => <li style={{marginBottom: '0.25em'}} {...props} />,
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ color: "var(--text-secondary)", marginLeft: "20px", fontSize: "14px" }}>
            考え中...
          </div>
        )}
      </div>

      {/* Prompt Chips */}
      {messages.length === 0 && (
        <div style={{
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          marginBottom: "20px",
          flexWrap: "wrap"
        }}>
          {[
            { label: "テストに出そうな所は？", prompt: "この録音データの中で、先生が『重要』『テストに出す』『ここ覚えておいて』と言及した箇所をリストアップして" },
            { label: "授業を3行で要約して", prompt: "登録した講義ファイルの要点を3つの箇条書きでまとめて" },
            { label: "出てきた専門用語の解説して", prompt: "登録したファイルの聞き慣れない単語をピックアップして解説して" }
          ].map((chip, i) => (
            <button
              key={i}
              onClick={() => handleSubmit(undefined, chip.prompt)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                backgroundColor: "rgba(138, 180, 248, 0.1)",
                color: "#8ab4f8",
                border: "1px solid rgba(138, 180, 248, 0.3)",
                cursor: "pointer",
                fontSize: "13px",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(138, 180, 248, 0.2)"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "rgba(138, 180, 248, 0.1)"}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* 入力フォーム */}
      <div style={{
        position: "sticky",
        bottom: "20px",
        backgroundColor: "var(--surface-color)",
        padding: "8px",
        borderRadius: "30px",
        border: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        margin: "0 10px",
        gap: "8px"
      }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "10px", color: "var(--text-secondary)", paddingLeft: "4px" }}>カテゴリ</span>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              style={{
                backgroundColor: "transparent",
                color: "var(--text-secondary)",
                border: "none",
                outline: "none",
                fontSize: "14px",
                padding: "0 8px",
                cursor: "pointer",
                maxWidth: "100px",
                textOverflow: "ellipsis"
              }}
            >
              <option value="" style={{ color: "black" }}>すべて</option>
              {tags.map(tag => (
                <option key={tag} value={tag} style={{ color: "black" }}>{tag}</option>
              ))}
            </select>
          </div>
        <div style={{ width: "1px", height: "24px", backgroundColor: "var(--border-color)" }}></div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="メッセージを入力..."
          style={{ 
            flex: 1, 
            backgroundColor: "transparent", 
            border: "none", 
            color: "var(--text-color)",
            padding: "10px 8px",
            fontSize: "16px",
            outline: "none",
            minWidth: 0,
            resize: "none",
            height: "44px",
            lineHeight: "24px",
            maxHeight: "200px",
            overflowY: "auto"
          }}
          disabled={isLoading}
        />
        <button 
          onClick={handleSubmit}
          disabled={isLoading || !input.trim()}
          style={{
            backgroundColor: input.trim() ? "var(--primary-color)" : "#3c4043",
            color: input.trim() ? "#202124" : "#9aa0a6",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: input.trim() ? "pointer" : "default",
            transition: "all 0.2s"
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
