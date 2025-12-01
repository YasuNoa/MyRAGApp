"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import useDrivePicker from "react-google-drive-picker";
import { useKnowledge } from "@/app/_context/KnowledgeContext";
import TagInput from "@/app/_components/TagInput";

export default function GoogleDriveImport() {
  const { data: session } = useSession();
  const { triggerRefresh } = useKnowledge();
  const [openPicker] = useDrivePicker();
  
  const [importing, setImporting] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  const handleOpenPicker = () => {
    if (!session?.accessToken) {
      alert("Googleアカウントでログインしてください");
      return;
    }

    openPicker({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      developerKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
      viewId: "DOCS",
      token: session.accessToken,
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
    let successCount = 0;
    let failCount = 0;

    for (const doc of docs) {
      try {
        const res = await fetch("/api/drive/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
    }

    setImporting(false);
    
    if (successCount > 0) {
      triggerRefresh();
      alert(`${successCount}件のファイルをインポートしました！${failCount > 0 ? `(${failCount}件失敗)` : ""}`);
    } else if (failCount > 0) {
      alert("インポートに失敗しました");
    }
  };

  if (!session) {
    return (
      <div className="neo-card" style={{ textAlign: "center", padding: "40px" }}>
        <h3>Google Driveと連携する</h3>
        <p style={{ marginBottom: "20px", color: "var(--text-secondary)" }}>
          Google Drive内のPDFやテキストファイルをインポートして、AIに学習させることができます。
        </p>
        <button
          onClick={() => signIn("google")}
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
            alignItems: "center", 
            justifyContent: "center", 
            gap: "10px",
            backgroundColor: importing ? "var(--border-color)" : "var(--primary-color)",
            color: "white"
          }}
        >
          {importing ? (
            <span>インポート中...</span>
          ) : (
            <>
              <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" width="20" height="20" />
              <span>Google Driveからファイルを選択</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
