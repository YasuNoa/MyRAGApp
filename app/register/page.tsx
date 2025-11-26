"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "../actions/register";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await registerUser(formData);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      // 登録成功したらログイン画面へ
      router.push("/login?registered=true");
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center",
      backgroundColor: "var(--bg-color)",
      padding: "20px"
    }}>
      <div className="neo-card" style={{ width: "100%", maxWidth: "400px", border: "1px solid var(--border-color)" }}>
        <h1 style={{ textAlign: "center", fontSize: "1.8rem", marginBottom: "30px" }}>新規登録</h1>
        
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "var(--text-secondary)", fontSize: "14px" }}>お名前</label>
            <input
              name="name"
              type="text"
              className="neo-input"
              style={{ width: "100%", boxSizing: "border-box" }}
              placeholder="山田 太郎"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "var(--text-secondary)", fontSize: "14px" }}>電話番号</label>
            <input
              name="phoneNumber"
              type="tel"
              className="neo-input"
              style={{ width: "100%", boxSizing: "border-box" }}
              placeholder="09012345678"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "var(--text-secondary)", fontSize: "14px" }}>メールアドレス</label>
            <input
              name="email"
              type="email"
              className="neo-input"
              style={{ width: "100%", boxSizing: "border-box" }}
              placeholder="test@example.com"
              required
            />
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "var(--text-secondary)", fontSize: "14px" }}>パスワード</label>
            <input
              name="password"
              type="password"
              className="neo-input"
              style={{ width: "100%", boxSizing: "border-box" }}
              placeholder="password"
              required
            />
          </div>

          {error && (
            <div style={{ color: "#ff6b6b", fontSize: "14px", textAlign: "center" }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="neo-button"
            style={{ marginTop: "10px", width: "100%" }}
            disabled={isLoading}
          >
            {isLoading ? "登録中..." : "登録する"}
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "14px" }}>
          <a href="/login" style={{ color: "var(--primary-color)", textDecoration: "none" }}>
            すでにアカウントをお持ちの方はこちら
          </a>
        </div>
      </div>
    </div>
  );
}
