"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/src/lib/firebase";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear any session storage if needed
      sessionStorage.clear(); 
      router.push("/");
    } catch (e) {
      console.error("Logout failed:", e);
      // Force redirect anyway
      window.location.href = "/";
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", // Flexbox for centering
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "var(--background)", // Utilize theme variables if available, else fallback
      color: "var(--text-primary)",
      padding: "20px",
      textAlign: "center"
    }}>
      <div className="neo-card" style={{
        maxWidth: "500px",
        width: "100%",
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        border: "1px solid var(--border-color)", // Consistent with other cards
        borderRadius: "24px" // Rounded corners
      }}>
        <div style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          backgroundColor: "#fee2e2", // Light red bg
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#ef4444", // Red icon
          marginBottom: "10px"
        }}>
          <AlertTriangle size={40} />
        </div>

        <h2 style={{ fontSize: "1.8rem", fontWeight: "bold" }}>
          エラーが発生しました
        </h2>

        <div style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
          <p style={{ marginBottom: "15px" }}>
            予期せぬエラーが発生しました。
          </p>
          <p style={{ 
            backgroundColor: "rgba(255, 255, 255, 0.05)", 
            padding: "15px", 
            borderRadius: "12px", 
            fontSize: "0.9rem",
            border: "1px dashed var(--border-color)"
          }}>
            <strong>ヒント:</strong><br/>
            1つのブラウザで複数のアカウントに同時にログインすることはできません。<br/>
            もし別のアカウントでログインしたい場合は、一度ログアウトするか、シークレットウィンドウをご利用ください。
          </p>
        </div>

        <div style={{ display: "flex", gap: "15px", marginTop: "10px", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => reset()}
            className="neo-button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 24px",
              backgroundColor: "var(--surface-color)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)"
            }}
          >
            <RefreshCw size={18} />
            再試行
          </button>

          <button
            onClick={handleLogout}
            className="neo-button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 24px",
              backgroundColor: "#fee2e2", // Light red for danger action
              border: "1px solid #fca5a5",
              color: "#ef4444" 
            }}
          >
            <LogOut size={18} />
            ログアウト
          </button>

          <Link href="/" style={{ textDecoration: "none" }}>
            <button
              className="neo-button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                backgroundColor: "var(--primary-color)",
                color: "black", // Assuming primary color is bright
                border: "none",
                fontWeight: "bold"
              }}
            >
              <Home size={18} />
              トップへ戻る
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
