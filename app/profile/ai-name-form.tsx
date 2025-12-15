"use client";

import { auth } from "@/src/lib/firebase";
import { useState, useEffect } from "react";

export default function AiNameForm({ user }: { user: any }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Get initial AI name from metadata
  const initialAiName = (user.metadata as any)?.aiName || "じぶんAI";
  
  const [name, setName] = useState(initialAiName);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const formData = new FormData(e.currentTarget);
    const aiName = formData.get("aiName") as string;

    try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) {
            setError("認証エラー: ログインし直してください");
            setLoading(false);
            return;
        }

        const res = await fetch("/api/user/profile", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${idToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ aiName })
        });

        const result = await res.json();

        if (!res.ok) {
            setError(result.error);
        } else {
            setMessage(result.message || "AIの名前を更新しました");
            // Reload to reflect changes globally
            window.location.reload(); 
        }
    } catch (err: any) {
        console.error(err);
        setError("更新中にエラーが発生しました");
    } finally {
        setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>
            AIの名前
          </label>
          <input 
            type="text" 
            name="aiName" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="じぶんAI"
            className="neo-input"
            style={{ width: "100%", boxSizing: "border-box" }}
            required
          />
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            チャット画面で表示されるAIの名前です。
          </p>
        </div>

        {error && <p style={{ color: "#ff6b6b", fontSize: "14px" }}>{error}</p>}
        {message && <p style={{ color: "#4ade80", fontSize: "14px" }}>{message}</p>}

        <button type="submit" className="neo-button" disabled={loading}>
          {loading ? "更新中..." : "保存する"}
        </button>
      </form>
    </div>
  );
}
