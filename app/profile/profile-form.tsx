"use client";

import { updateProfile } from "@/app/actions/profile";
import { useState } from "react";

export default function ProfileForm({ user }: { user: any }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage("");
    setError("");
    
    const result = await updateProfile(formData);
    
    if (result.error) {
      setError(result.error);
    } else {
      setMessage(result.success || "更新しました");
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto" }}>
      <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>
            メールアドレス
          </label>
          <input 
            type="email" 
            name="email" 
            defaultValue={user.email || ""} 
            placeholder="example@email.com"
            className="neo-input"
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>
            新しいパスワード
          </label>
          <input 
            type="password" 
            name="password" 
            placeholder="6文字以上"
            className="neo-input"
            style={{ width: "100%", boxSizing: "border-box" }}
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
