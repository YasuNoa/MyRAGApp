"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import LayoutWrapper from "@/app/_components/LayoutWrapper";
import TagInput from "@/app/_components/TagInput";

export default function NotesPage() {
  const { data: session } = useSession();
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchNotes();
  }, [session]);

  const fetchNotes = async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch("/api/knowledge/list");
      if (res.ok) {
        const data = await res.json();
        setNotes(data.documents);
      }
    } catch (error) {
      console.error("Failed to fetch notes", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage("文字起こし中... (これには時間がかかります)");

    try {
      // 1. Transcribe Audio
      const formData = new FormData();
      formData.append("file", file);
      
      const transcribeRes = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://localhost:8000"}/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!transcribeRes.ok) {
        throw new Error("Transcription failed");
      }

      const transcribeData = await transcribeRes.json();
      const transcript = transcribeData.transcript;

      setMessage("文字起こし完了。保存中...");

      // 2. Save as Note
      const saveRes = await fetch("/api/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: transcript,
          tags: tags.length > 0 ? tags : ["Class Note"], // Use tags
        }),
      });

      if (saveRes.ok) {
        setMessage("保存完了！");
        fetchNotes();
        setTags([]);
      } else {
        throw new Error("Failed to save note");
      }

    } catch (error) {
      console.error(error);
      setMessage("エラーが発生しました");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <LayoutWrapper>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          Class Notes & Transcription
        </h1>

        {/* Upload Section */}
        <div className="neo-card mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">新しいノートを作成</h2>
          
          <div className="mb-4">
            <label className="block mb-2 font-bold">タグ</label>
            <TagInput tags={tags} onChange={setTags} placeholder="例: 数学, 物理, ゼミ" />
          </div>

          <div className="flex items-center gap-4">
            <label className="neo-button cursor-pointer">
              <span>🎤 音声ファイルをアップロードして文字起こし</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
            {isUploading && <span className="animate-pulse text-accent">{message}</span>}
          </div>
          {!isUploading && message && <p className="mt-2 text-green-400">{message}</p>}
        </div>

        {/* Notes List */}
        <div className="grid gap-4">
          {isLoading ? (
            <p>Loading notes...</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="neo-card p-4 hover:bg-white/5 transition-colors cursor-pointer">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{note.title}</h3>
                    <div className="flex gap-2 mt-2 text-sm text-gray-400">
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      {note.tags && note.tags.map((tag: string, index: number) => (
                        <span 
                          key={index}
                          style={{
                            fontSize: "10px",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            backgroundColor: "rgba(66, 133, 244, 0.1)",
                            color: "var(--primary-color)",
                            border: "1px solid rgba(66, 133, 244, 0.2)"
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      <span className="bg-gray-700 px-2 py-0.5 rounded-full text-xs">
                        {note.source}
                      </span>
                    </div>
                  </div>
                  {/* Actions like Edit/Delete could go here */}
                </div>
                {/* Preview of content if available */}
                {note.content && (
                  <p className="mt-3 text-gray-300 line-clamp-3 text-sm">
                    {note.content}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </LayoutWrapper>
  );
}
