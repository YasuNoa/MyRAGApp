"use client";

import { useState } from "react";

export default function KnowledgePage() {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    if (!text.trim()) {
      setMessage("テキストを入力してください");
      return;
    }

    setIsLoading(true);
    setMessage("保存中...");

    try {
      const res = await fetch("/api/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        setMessage("成功！知識を覚えました。");
        setText("");
      } else {
        const errorData = await res.text();
        setMessage(`エラー: ${errorData}`);
      }
    } catch (error) {
      console.error(error);
      setMessage("通信エラー");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "10px" }}>知識ベース</h1>
        <p style={{ color: "var(--text-secondary)" }}>AIに新しい知識を教えることができます。</p>
      </div>

      <div className="neo-card" style={{ marginBottom: "24px" }}>
        <textarea
          className="neo-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ここに知識を入力してください..."
          style={{ 
            width: "100%", 
            height: "300px", 
            fontSize: "16px",
            resize: "vertical",
            boxSizing: "border-box"
          }}
          disabled={isLoading}
        />
      </div>

      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        <button
          onClick={handleSave}
          className="neo-button"
          disabled={isLoading}
          style={{ flex: 1 }}
        >
          {isLoading ? "保存中..." : "知識を保存"}
        </button>
        
        {message && (
          <div style={{ 
            padding: "10px 20px", 
            borderRadius: "var(--radius)",
            backgroundColor: message.includes("エラー") ? "rgba(255, 107, 107, 0.1)" : "rgba(138, 180, 248, 0.1)",
            color: message.includes("エラー") ? "#ff6b6b" : "#8ab4f8",
            flex: 2
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
