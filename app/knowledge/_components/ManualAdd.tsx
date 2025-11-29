"use client";

import { useState } from "react";

export default function ManualAdd({ onSuccess }: { onSuccess?: () => void }) {
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
        if (onSuccess) onSuccess();
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
    <div className="neo-card">
      <h3>テキストを手動で追加</h3>
      <textarea
        className="neo-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="ここにAIに覚えさせたい知識を入力してください..."
        style={{
          width: "100%",
          height: "150px",
          padding: "15px",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border-color)",
          backgroundColor: "var(--input-bg)",
          color: "var(--text-primary)",
          marginBottom: "15px",
          resize: "vertical",
        }}
        disabled={isLoading}
      />
      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        <button
          onClick={handleSave}
          className="neo-button"
          disabled={isLoading}
          style={{ width: "100%" }}
        >
          {isLoading ? "保存中..." : "保存する"}
        </button>
      </div>
      {message && (
        <div style={{
          marginTop: "10px",
          padding: "10px",
          borderRadius: "var(--radius)",
          backgroundColor: message.includes("エラー") ? "rgba(255, 107, 107, 0.1)" : "rgba(138, 180, 248, 0.1)",
          color: message.includes("エラー") ? "#ff6b6b" : "#8ab4f8",
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
