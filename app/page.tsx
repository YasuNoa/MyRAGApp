"use client";

import { useState, useEffect } from "react";
import { useChat } from "@/app/_context/ChatContext";
import { PlusCircle } from "lucide-react";

export default function Home() {
  const [tags, setTags] = useState<string[]>([]);
  const { 
    messages, setMessages, 
    input, setInput, 
    isLoading, setIsLoading, 
    selectedTag, setSelectedTag,
    clearChat
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: userMessage.content,
          tags: selectedTag ? [selectedTag] : [] 
        }),
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        const botMessage = { role: "assistant", content: data.answer || "エラーが発生しました" };
        setMessages((prev) => [...prev, botMessage]);
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
      {/* New Chat Button (Top Right) */}
      <button
        onClick={clearChat}
        style={{
          position: "absolute",
          top: "0",
          right: "0",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 12px",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "20px",
          cursor: "pointer",
          fontSize: "12px",
          transition: "all 0.2s"
        }}
      >
        <PlusCircle size={14} />
        新規チャット
      </button>

      <div style={{ textAlign: "center", marginBottom: "40px", paddingTop: "40px" }}>
        <h1 style={{ 
          margin: "0 0 10px 0", 
          fontSize: "2.5rem", 
          background: "linear-gradient(to right, #8ab4f8, #c58af9)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          じぶんAI
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>あなたのためのAIアシスタント</p>
      </div>
      
      {/* チャット履歴 */}
      <div style={{ 
        minHeight: "400px", 
        marginBottom: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "24px"
      }}>
        {messages.length === 0 && (
          <div style={{ 
            textAlign: "center", 
            marginTop: "80px", 
            color: "var(--text-secondary)",
            padding: "40px",
            border: "1px dashed var(--border-color)",
            borderRadius: "var(--radius)"
          }}>
            <p>何でも聞いてください。</p>
          </div>
        )}
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
                {msg.role === "assistant" ? "🤖 博士" : "あなた"}
              </div>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ color: "var(--text-secondary)", marginLeft: "20px", fontSize: "14px" }}>
            考え中...
          </div>
        )}
      </div>

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
