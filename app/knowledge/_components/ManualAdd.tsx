"use client";

import { useState, useRef } from "react";
import { useKnowledge } from "@/app/_context/KnowledgeContext";

import TagInput from "@/app/_components/TagInput";

export default function ManualAdd() {
  const { triggerRefresh } = useKnowledge();
  const [mode, setMode] = useState<"text" | "file">("text");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage("保存中...");

    try {
      if (mode === "text") {
        if (!text.trim()) {
          setMessage("テキストを入力してください");
          setIsLoading(false);
          return;
        }
        const res = await fetch("/api/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, tags }),
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        if (files.length === 0) {
          setMessage("ファイルを選択してください");
          setIsLoading(false);
          return;
        }

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setMessage(`アップロード中 (${i + 1}/${files.length}): ${file.name}...`);
          
          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("tags", JSON.stringify(tags));
            const res = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });
            if (!res.ok) throw new Error(await res.text());
            successCount++;
          } catch (e) {
            console.error(`Failed to upload ${file.name}:`, e);
            failCount++;
          }
        }

        if (failCount > 0) {
          setMessage(`完了: ${successCount}件成功, ${failCount}件失敗`);
        } else {
          setMessage(`成功！${successCount}件のファイルを保存しました。`);
        }
      }

      if (mode === "text") {
         setMessage("成功！知識を覚えました。");
      }
      
      setText("");
      setFiles([]);
      setTags([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      triggerRefresh();
    } catch (error) {
      console.error(error);
      setMessage("エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="neo-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <h3 style={{ margin: 0 }}>知識を手動で追加</h3>
        <div style={{ display: "flex", gap: "5px", backgroundColor: "var(--input-bg)", padding: "4px", borderRadius: "20px" }}>
          <button
            onClick={() => setMode("text")}
            style={{
              padding: "4px 12px",
              borderRadius: "16px",
              border: "none",
              fontSize: "12px",
              cursor: "pointer",
              backgroundColor: mode === "text" ? "var(--primary-color)" : "transparent",
              color: mode === "text" ? "white" : "var(--text-secondary)",
              fontWeight: mode === "text" ? "bold" : "normal",
            }}
          >
            テキスト
          </button>
          <button
            onClick={() => setMode("file")}
            style={{
              padding: "4px 12px",
              borderRadius: "16px",
              border: "none",
              fontSize: "12px",
              cursor: "pointer",
              backgroundColor: mode === "file" ? "var(--primary-color)" : "transparent",
              color: mode === "file" ? "white" : "var(--text-secondary)",
              fontWeight: mode === "file" ? "bold" : "normal",
            }}
          >
            ファイル
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", color: "var(--text-secondary)" }}>タグ (任意)</label>
        <TagInput tags={tags} onChange={setTags} placeholder="タグを入力 (Enterで追加)" />
      </div>

      {mode === "text" ? (
        <textarea
          className="neo-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ここにAIに覚えさせたい知識を入力してください..."
          style={{
            width: "100%",
            height: "150px",
            padding: "15px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--input-bg)",
            color: "var(--text-primary)",
            marginBottom: "15px",
            resize: "vertical",
          }}
          disabled={isLoading}
        />
      ) : (
        <div style={{ 
          marginBottom: "15px", 
          border: "2px dashed var(--border-color)", 
          borderRadius: "var(--radius)",
          padding: "20px",
          textAlign: "center",
          cursor: "pointer",
          backgroundColor: "var(--input-bg)"
        }} onClick={() => fileInputRef.current?.click()}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files) {
                setFiles(Array.from(e.target.files));
              }
            }}
            style={{ display: "none" }}
            multiple
            accept=".pdf,.txt,.md,.csv,.pptx,.docx,.xlsx,.jpg,.jpeg,.png,.webp,.mp3,.wav,.m4a,.webm"
          />
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>📄</div>
          <div style={{ 
            fontWeight: "bold", 
            color: "white",
            backgroundColor: "#4285f4", // Google Blue
            padding: "8px 24px",
            borderRadius: "50px",
            display: "inline-block",
            marginBottom: "8px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
          }}>
            {files.length > 0 ? `${files.length}個のファイルを選択中` : "ファイルを選択"}
          </div>
          {files.length > 0 && (
            <div style={{ fontSize: "12px", color: "var(--text-primary)", marginBottom: "8px", textAlign: "left", display: "inline-block" }}>
              <ul style={{ margin: 0, paddingLeft: "20px" }}>
                {files.map((f, i) => (
                  <li key={i}>{f.name}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            PDF, Office, Image, Text, CSV, Audio
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        <button
          onClick={handleSave}
          className="neo-button"
          disabled={isLoading}
          style={{ width: "100%" }}
        >
          {isLoading ? "保存中..." : "保存する"}
        </button>
      </div>
      {message && (
        <div style={{
          marginTop: "10px",
          padding: "10px",
          borderRadius: "var(--radius)",
          backgroundColor: message.includes("エラー") ? "rgba(255, 107, 107, 0.1)" : "rgba(138, 180, 248, 0.1)",
          color: message.includes("エラー") ? "#ff6b6b" : "#8ab4f8",
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
