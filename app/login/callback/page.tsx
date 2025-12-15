"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/src/lib/firebase";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const processLogin = async () => {
      const token = searchParams.get("token");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        setStatus("error");
        setErrorMessage("ログインプロセスでエラーが発生しました。");
        return;
      }

      if (!token) {
        setStatus("error");
        setErrorMessage("トークンが見つかりません。");
        return;
      }

      try {
        // 1. Sign in with Custom Token
        const userCredential = await signInWithCustomToken(auth, token);
        const user = userCredential.user;

        // 2. Sync with Backend
        const idToken = await user.getIdToken();
        const res = await fetch("/api/auth/sync", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${idToken}`
          }
        });

        if (res.ok) {
          setStatus("success");
          router.push("/dashboard"); // Redirect to dashboard
        } else {
          const data = await res.json();
          if (res.status === 400 && data.error === "Email required for sync") {
            setErrorMessage("LINEでメールアドレスを許可または設定してください");
          } else {
            setErrorMessage("アカウントの同期に失敗しました。");
          }
          setStatus("error");
        }

      } catch (e: any) {
        console.error(e);
        setErrorMessage("ログイン処理中にエラーが発生しました: " + e.message);
        setStatus("error");
      }
    };

    processLogin();
  }, [router, searchParams]);

  if (status === "loading" || status === "success") {
    return (
      <div style={{ textAlign: "center" }}>
        <h2 style={{ marginBottom: "16px" }}>ログイン処理中...</h2>
        <div style={{ 
          width: "40px", 
          height: "40px", 
          border: "4px solid #f3f3f3", 
          borderTop: "4px solid var(--primary-color)", 
          borderRadius: "50%", 
          animation: "spin 1s linear infinite",
          margin: "0 auto"
        }}></div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
        <div style={{ 
            color: "#ff6b6b", 
            fontSize: "16px", 
            fontWeight: "bold",
            marginBottom: "24px", 
            padding: "20px", 
            backgroundColor: "rgba(255, 107, 107, 0.1)", 
            borderRadius: "12px",
            border: "1px solid rgba(255, 107, 107, 0.3)"
        }}>
            {errorMessage}
        </div>

        <button
            onClick={() => router.push("/login")}
            className="neo-button"
            style={{
                width: "100%",
                padding: "12px 24px",
                backgroundColor: "var(--foreground)",
                color: "var(--background)",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer"
            }}
        >
            ログイン画面に戻る
        </button>
    </div>
  );
}

export default function LoginCallbackPage() {
  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center",
      backgroundColor: "var(--bg-color)",
      padding: "20px"
    }}>
      <div className="neo-card" style={{ width: "100%", maxWidth: "400px", border: "1px solid var(--border-color)", padding: "40px" }}>
        <Suspense fallback={<div>Loading...</div>}>
            <CallbackContent />
        </Suspense>
      </div>
    </div>
  );
}
