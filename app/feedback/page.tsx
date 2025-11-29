"use client";

import { useState } from "react";
import { submitFeedback } from "@/app/actions/feedback";

export default function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage("");
    setError("");

    const result = await submitFeedback(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setMessage(result.success || "送信しました");
      // フォームをリセットするためにリロードするか、stateで管理するか
      // ここではシンプルにメッセージ表示のみ
      (document.getElementById("feedback-form") as HTMLFormElement).reset();
    }
    setLoading(false);
  }

  return (
    <div className="container" style={{ maxWidth: "600px", margin: "0 auto", paddingTop: "40px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "40px" }}>フィードバック</h1>
      
      <div className="neo-card" style={{ padding: "32px" }}>
        <p style={{ marginBottom: "24px", lineHeight: "1.6" }}>
          アプリに関するご意見・ご要望、バグ報告などをお聞かせください。<br />
          頂いた内容は今後の開発の参考にさせていただきます。
        </p>

        <form id="feedback-form" action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
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
