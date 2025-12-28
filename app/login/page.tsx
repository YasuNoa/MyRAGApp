"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/src/lib/firebase";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Save referrerId from URL to SessionStorage
  useEffect(() => {
      const referrer = searchParams.get("referrer");
      if (referrer) {
          sessionStorage.setItem("pendingReferrerId", referrer);
          console.log("Saved referrer:", referrer);
      }
  }, [searchParams]);

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/drive.file"); // For Google Drive Integration

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // 1. Check for Pending Referral
      const pendingReferrerId = sessionStorage.getItem("pendingReferrerId");
      if (pendingReferrerId) {
          try {
              // Call Referral Entry API
              await fetch("/api/referral/entry", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                      referrerId: pendingReferrerId,
                      userId: user.uid
                  })
              });
              // Clear after use
              sessionStorage.removeItem("pendingReferrerId");
              console.log("Referral entry processed.");
          } catch (refError) {
              console.error("Failed to process referral:", refError);
              // Continue login even if referral fails
          }
      }

      // 2. Sync with Backend
      const idToken = await user.getIdToken();
      const res = await fetch("/api/auth/sync", {
          method: "POST",
          headers: {
              "Authorization": `Bearer ${idToken}`
          }
      });

      if (res.ok) {
          router.push("/dashboard");
      } else {
          setError("アカウントの同期に失敗しました。");
      }
    } catch (err: any) {
      console.error(err);
      setError("Googleログインに失敗しました: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle LINE Login (Custom Flow)
  const handleLineLogin = () => {
    setIsLoading(true);
    // Redirect to our backend logic which handles LINE OAuth
    window.location.href = "/api/auth/line/login";
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
        
        {error && (
            <div style={{ 
                color: "#ff6b6b", 
                fontSize: "14px", 
                textAlign: "left", 
                marginBottom: "20px", 
                padding: "10px", 
                backgroundColor: "rgba(255, 107, 107, 0.1)", 
                borderRadius: "8px",
                border: "1px solid rgba(255, 107, 107, 0.3)"
            }}>
              {error}
            </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {/* LINE Login Button */}
          <button
            onClick={handleLineLogin}
            disabled={isLoading}
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
              height: "44px",
              cursor: isLoading ? "wait" : "pointer",
              opacity: isLoading ? 0.7 : 1
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 5.86 2 10.62C2 14.75 5.56 18.24 10.4 19.09L9.85 21.05C9.76 21.41 10.15 21.7 10.46 21.5L14.7 19.1C14.7 19.1 14.7 19.1 14.71 19.1C19.26 18.39 22 14.83 22 10.62C22 5.86 17.52 2 12 2Z" fill="white"/>
            </svg>
            LINEでログイン
          </button>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="neo-button"
            style={{
              width: "100%",
              backgroundColor: "#FFFFFF",
              color: "#1f1f1f",
              fontWeight: "500",
              border: "1px solid #747775",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              height: "44px",
              fontFamily: "'Roboto', arial, sans-serif",
              cursor: isLoading ? "wait" : "pointer",
              opacity: isLoading ? 0.7 : 1
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Googleでログイン
          </button>
        </div>

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "14px", display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "left", lineHeight: "1.5" }}>
            ※セキュリティのため、1つのブラウザで複数のアカウントに同時にログインすることはできません。
          </div>
        </div>
      </div>

      {/* Legal Links Footer */}
      <div style={{
        position: "fixed",
        bottom: "10px",
        right: "20px",
        fontSize: "12px",
        color: "var(--text-secondary)",
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        alignItems: "flex-end",
        zIndex: 50
      }}>
        <a href="/terms" style={{ color: "inherit", textDecoration: "none" }}>利用規約</a>
        <a href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>プライバシーポリシー</a>
        <span style={{ opacity: 0.7 }}>© 2025 じぶんAI</span>
      </div>
    </div>
  );
}
