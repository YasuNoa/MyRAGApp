"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { FileText, File } from "lucide-react";
import { useKnowledge } from "@/app/_context/KnowledgeContext";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink: string;
};

export default function GoogleDriveImport() {
  const { triggerRefresh } = useKnowledge();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/drive/list");
      if (res.status === 401) {
        setIsConnected(false);
        setIsLoading(false);
        return;
      }
      
      if (!res.ok) {
        throw new Error("Failed to fetch files");
      }

      const data = await res.json();
      setFiles(data.files || []);
      setIsConnected(true);
    } catch (err) {
      console.error(err);
      setError("ファイル一覧の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (file: DriveFile) => {
    setImportingId(file.id);
    try {
      const res = await fetch("/api/drive/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, mimeType: file.mimeType, fileName: file.name }),
      });

      if (!res.ok) {
        throw new Error("Import failed");
      }

      alert(`「${file.name}」をインポートしました！`);
      triggerRefresh(); // グローバル更新トリガー
    } catch (err) {
      console.error(err);
      alert("インポートに失敗しました");
    } finally {
      setImportingId(null);
    }
  };

  if (isLoading) {
    return <div style={{ padding: "20px", textAlign: "center" }}>GoogleDriveからファイルを読み込み中...</div>;
  }

  if (!isConnected) {
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ margin: 0 }}>Google Drive からインポート</h3>
        <button onClick={fetchFiles} className="neo-button" style={{ padding: "5px 10px", fontSize: "12px" }}>
          更新
        </button>
      </div>

      {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}

      {files.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", textAlign: "center" }}>
          PDFまたはテキストファイルが見つかりませんでした。
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {files.map((file) => (
            <div
              key={file.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius)",
                backgroundColor: "var(--bg-color)",
              }}
            >
              <div style={{ marginRight: "10px", display: "flex", alignItems: "center" }}>
                {file.mimeType.includes("pdf") ? (
                  <FileText size={20} color="#EA4335" />
                ) : (
                  <File size={20} color="#4285F4" />
                )}
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {file.name}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  {file.mimeType.includes("pdf") ? "PDF Document" : "Text File"}
                </div>
              </div>
              <button
                onClick={() => handleImport(file)}
                disabled={importingId === file.id}
                className="neo-button"
                style={{
                  padding: "5px 15px",
                  fontSize: "12px",
                  marginLeft: "10px",
                  opacity: importingId === file.id ? 0.7 : 1,
                }}
              >
                {importingId === file.id ? "..." : "インポート"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
