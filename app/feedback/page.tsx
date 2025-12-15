"use client";

import { useState } from "react";
import { auth } from "@/src/lib/firebase"; // Add import

export default function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const formData = new FormData(e.currentTarget);
    const content = formData.get("content");

    try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) {
            setError("ログインしてください");
            setLoading(false);
            return;
        }

        const res = await fetch("/api/feedback", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${idToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ content })
        });

        const result = await res.json();

        if (!res.ok) {
            setError(result.error || "エラーが発生しました");
        } else {
            setMessage(result.message || "送信しました");
            (document.getElementById("feedback-form") as HTMLFormElement).reset();
        }
    } catch (err: any) {
        console.error(err);
        setError("送信中にエラーが発生しました");
    } finally {
        setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: "600px", margin: "0 auto", paddingTop: "40px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "40px" }}>フィードバック</h1>
      
      <div className="neo-card" style={{ padding: "32px" }}>
        <p style={{ marginBottom: "24px", lineHeight: "1.6" }}>
          アプリに関するご意見・ご要望、バグ報告などをお聞かせください。<br />
          頂いた内容は今後の開発の参考にさせていただきます。
        </p>

        <form id="feedback-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              内容
            </label>
            <textarea
              name="content"
              rows={6}
              placeholder="ここに内容を入力してください..."
              className="neo-input"
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
              required
            />
          </div>

          {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}
          {message && <p style={{ color: "#4ade80" }}>{message}</p>}

          <button type="submit" className="neo-button" disabled={loading}>
            {loading ? "送信中..." : "送信する"}
          </button>
        </form>
      </div>
    </div>
  );
}
