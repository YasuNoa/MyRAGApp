"use client";

import { auth } from "@/src/lib/firebase";
import { useState } from "react";

export default function NameForm({ user }: { user: any }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    
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
            body: JSON.stringify({ name })
        });

        const result = await res.json();

        if (!res.ok) {
            setError(result.error);
        } else {
            setMessage(result.message || "更新しました");
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
            名前
          </label>
          <input 
            type="text" 
            name="name" 
            defaultValue={user.name || ""} 
            placeholder="表示名"
            className="neo-input"
            style={{ width: "100%", boxSizing: "border-box" }}
            required
          />
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
