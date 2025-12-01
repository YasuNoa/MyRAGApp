"use client";

import { updateProfile } from "@/app/actions/profile";
import { useState } from "react";

export default function AiNameForm({ user }: { user: any }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Get initial AI name from metadata
  const initialAiName = (user.metadata as any)?.aiName || "じぶんAI";

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage("");
    setError("");
    
    const result = await updateProfile(formData);
    
    if (result.error) {
      setError(result.error);
    } else {
      setMessage("AIの名前を更新しました");
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto" }}>
      <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>
            AIの名前
          </label>
          <input 
            type="text" 
            name="aiName" 
            defaultValue={initialAiName} 
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
