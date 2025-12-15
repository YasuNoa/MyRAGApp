"use client";

import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/src/lib/firebase";
import useDrivePicker from "react-google-drive-picker";
import { useKnowledge } from "@/app/_context/KnowledgeContext";
import { useAuth } from "@/src/context/AuthContext";
import TagInput from "@/app/_components/TagInput";

export default function GoogleDriveImport() {
  const { user, googleAccessToken, setGoogleAccessToken, fetchWithAuth } = useAuth();
  const { triggerRefresh } = useKnowledge();
  const [openPicker] = useDrivePicker();
  
  const [importing, setImporting] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const handleAuth = async () => {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/drive.readonly");
      try {
          const result = await signInWithPopup(auth, provider);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const token = credential?.accessToken;
          if (token) setGoogleAccessToken(token);
      } catch (error) {
          console.error("Google Auth Error:", error);
          alert("Google認証に失敗しました");
      }
  };

  const handleOpenPicker = () => {
    if (!googleAccessToken) {
      handleAuth();
      return;
    }

    openPicker({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      developerKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
      viewId: "DOCS",
      token: googleAccessToken,
      showUploadView: true,
      showUploadFolders: true,
      supportDrives: true,
      multiselect: true,
      locale: "ja",
      callbackFunction: (data: any) => {
        if (data.action === "picked") {
          handleImport(data.docs);
        }
      },
    });
  };

  const handleImport = async (docs: any[]) => {
    setImporting(true);
    setProgress(0);
    setMessage("準備中...");
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      setMessage(`インポート中 (${i + 1}/${docs.length}): ${doc.name}...`);
      setProgress(Math.round(((i) / docs.length) * 100));

      try {
        const res = await fetchWithAuth("/api/drive/import", {
          method: "POST",
          headers: { 
              "Content-Type": "application/json",
              "x-google-access-token": googleAccessToken || "" // Pass Google Token for backend to use
          },
          body: JSON.stringify({ 
            fileId: doc.id, 
            mimeType: doc.mimeType, 
            fileName: doc.name, 
            tags: tags 
          }),
        });

        if (!res.ok) throw new Error("Import failed");
        successCount++;
      } catch (err) {
        console.error(err);
        failCount++;
      }
      setProgress(Math.round(((i + 1) / docs.length) * 100));
    }

    setImporting(false);
    
    if (successCount > 0) {
      triggerRefresh();
      alert(`${successCount}件のファイルをインポートしました！${failCount > 0 ? `(${failCount}件失敗)` : ""}`);
    } else if (failCount > 0) {
      alert("インポートに失敗しました");
    }
  };

  if (!user) {
    return (
      <div className="neo-card" style={{ textAlign: "center", padding: "40px" }}>
        <h3>ログインしてください</h3>
        <p style={{ marginBottom: "20px", color: "var(--text-secondary)" }}>
          この機能を使用するにはログインが必要です。
        </p>
      </div>
    );
  }

  if (!googleAccessToken) {
      return (
        <div className="neo-card" style={{ textAlign: "center", padding: "40px" }}>
            <h3>Google Driveと連携する</h3>
            <p style={{ marginBottom: "20px", color: "var(--text-secondary)" }}>
            Google Drive内のPDFやテキストファイルをインポートして、AIに学習させることができます。
            </p>
            <button
            onClick={handleAuth}
            className="neo-button"
            style={{ backgroundColor: "#DB4437", color: "white", border: "none" }}
            >
            Google Driveに接続
            </button>
        </div>
      );
  }

  return (
    <div className="neo-card">
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 12px 0" }}>Google Drive からインポート</h3>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "15px" }}>
          下のボタンを押すとGoogle Driveのファイル選択画面が開きます。<br/>
          インポートしたいファイル（PDF, Googleドキュメント等）を選択してください。
        </p>
        
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", color: "var(--text-secondary)" }}>タグ (任意)</label>
          <TagInput tags={tags} onChange={setTags} placeholder="インポートするファイルに付与するタグ" />
        </div>

        <button 
          onClick={handleOpenPicker} 
          disabled={importing}
          className="neo-button" 
          style={{ 
            width: "100%", 
            padding: "12px", 
            display: "flex", 
            flexDirection: "column",
            alignItems: "center", 
            justifyContent: "center", 
            gap: "10px",
            backgroundColor: importing ? "var(--border-color)" : "var(--primary-color)",
            color: "white",
            position: "relative",
            overflow: "hidden"
          }}
        >
          {importing ? (
            <div style={{ width: "100%", zIndex: 2 }}>
              <div style={{ marginBottom: "4px" }}>{message}</div>
              <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255,255,255,0.3)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ 
                  width: `${progress}%`, 
                  height: "100%", 
                  backgroundColor: "white", 
                  transition: "width 0.3s ease" 
                }} />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" width="20" height="20" />
              <span>Google Driveからファイルを選択</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
