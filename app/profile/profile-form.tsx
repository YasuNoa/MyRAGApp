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
    <div className="neo-card" style={{ maxWidth: "500px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        {user.image && (
          <img 
            src={user.image} 
            alt="Profile" 
            style={{ width: "80px", height: "80px", borderRadius: "50%", marginBottom: "16px" }} 
          />
        )}
        <h2 style={{ margin: 0 }}>{user.name}</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          {user.email || "メールアドレス未設定"}
        </p>
      </div>

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
