"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const errorParam = searchParams?.get("error");

  if (errorParam === "EmailRequired" && !error) {
    setError("LINEログインでメールアドレスが取得できませんでした。LINEアプリの設定でメールアドレスの提供を許可してください。");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("ログインに失敗しました。メールアドレスかパスワードが違います。");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError("エラーが発生しました");
    } finally {
      setIsLoading(false);
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
        <h1 style={{ textAlign: "center", fontSize: "1.8rem", marginBottom: "30px" }}>ログイン</h1>
        
        {/* LINE Login Button */}
        <form
          action={async () => {
            await signIn("line");
          }}
          style={{ marginBottom: "20px" }}
        >
          <button
            type="submit"
            className="neo-button"
            style={{
              width: "100%",
              backgroundColor: "#06C755", // LINE Green
              color: "white",
              fontWeight: "bold",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
            }}
          >
            LINEでログイン
          </button>
        </form>


        <div style={{ display: "flex", alignItems: "center", margin: "20px 0" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-color)" }}></div>
          <span style={{ padding: "0 10px", color: "var(--text-secondary)", fontSize: "12px" }}>または</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-color)" }}></div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "var(--text-secondary)", fontSize: "14px" }}>メールアドレス</label>
            <input
              type="email"
              className="neo-input"
              style={{ width: "100%", boxSizing: "border-box" }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "var(--text-secondary)", fontSize: "14px" }}>パスワード</label>
            <input
              type="password"
              className="neo-input"
              style={{ width: "100%", boxSizing: "border-box" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
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
            {isLoading ? "確認中..." : "ログイン"}
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "14px" }}>
          <a href="/register" style={{ color: "var(--primary-color)", textDecoration: "none" }}>
            アカウントをお持ちでない方はこちら
          </a>
        </div>
      </div>
    </div>
  );
}
