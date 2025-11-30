"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Save, Loader2, FileText, AlertCircle, Check, X, Tag } from "lucide-react";
import ReactMarkdown from "react-markdown";
import TagInput from "@/app/_components/TagInput";
import { useRouter } from "next/navigation";

export default function NotePage() {
    const router = useRouter();
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState(""); // Real-time preview
    const [finalResult, setFinalResult] = useState<{ 
        transcript: string; 
        summary: string; 
        document: any; // Draft document
    } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tags, setTags] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recognitionRef = useRef<any>(null);

    const finalTranscriptRef = useRef(""); // Store committed final transcript

    const isRecordingRef = useRef(false); // Track recording state for event handlers

    useEffect(() => {
        isRecordingRef.current = isRecording;
    }, [isRecording]);

    useEffect(() => {
        // Initialize Web Speech API
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = "ja-JP";

                recognition.onresult = (event: any) => {
                    let interimTranscript = "";
                    let newFinal = "";

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            newFinal += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }
                    
                    if (newFinal) {
                        finalTranscriptRef.current += newFinal;
                    }
                    
                    setTranscript(finalTranscriptRef.current + interimTranscript);
                };
                
                recognition.onend = () => {
                    // Only restart if we are still supposed to be recording
                    if (isRecordingRef.current) {
                        console.log("Speech recognition ended, restarting...");
                        try {
                            recognition.start();
                        } catch (e) {
                            console.error("Failed to restart recognition:", e);
                        }
                    }
                };

                recognitionRef.current = recognition;
            }
        }
        
        // Cleanup
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.onend = null; // Prevent restart loop
                recognitionRef.current.stop();
            }
        };
    }, []); // Initialize once on mount

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
            if (recognitionRef.current) recognitionRef.current.start();

            setIsRecording(true);
            setTranscript("");
            finalTranscriptRef.current = ""; // Reset final transcript
            setFinalResult(null);
            setError(null);
            setTags([]);
            setSelectedFile(null);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("マイクへのアクセスが許可されていません。");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recognitionRef.current) recognitionRef.current.stop();

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                await processAudio(audioBlob);
            };
        }
    };

    const processAudio = async (audioBlob: Blob) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append("file", audioBlob, "voice_memo.webm");

            const response = await fetch("/api/voice/process", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Failed to process audio");

            const data = await response.json();
            if (data.success && data.result) {
                setFinalResult({
                    transcript: data.result.transcript,
                    summary: data.result.summary,
                    document: null // No document created yet
                });
            } else {
                throw new Error(data.error || "Unknown error");
            }

        } catch (err: any) {
            console.error("Processing error:", err);
            setError(err.message || "処理中にエラーが発生しました。");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!finalResult) return;
        setIsSaving(true);
        try {
            // 1. Save Voice Memo (Create Document & Embed)
            const res = await fetch("/api/voice/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    transcript: finalResult.transcript,
                    summary: finalResult.summary,
                    tags: tags,
                    title: `Voice Memo ${new Date().toLocaleString()}`
                }),
            });

            if (!res.ok) throw new Error("Failed to save voice memo");
            
            // 2. Upload File (if selected)
            if (selectedFile) {
                const formData = new FormData();
                formData.append("file", selectedFile);
                formData.append("tags", JSON.stringify(tags)); // Use same tags

                const uploadRes = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                if (!uploadRes.ok) throw new Error("Failed to upload attached file");
            }

            router.push("/knowledge/list");
        } catch (err) {
            console.error(err);
            setError("保存に失敗しました");
            setIsSaving(false);
        }
    };

    const handleCancel = async () => {
        if (!finalResult) return;
        if (!confirm("本当に削除しますか？\nこの操作は取り消せません。")) return;

        // No need to delete from DB as it wasn't saved yet
        setFinalResult(null);
        setTranscript("");
        setSelectedFile(null);
        setTags([]);
    };

    return (
        <div className="container" style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto", height: "100%", display: "flex", flexDirection: "column" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px", color: "var(--primary-color)" }}>
                <FileText size={24} />
                授業ノート (Voice Memo)
            </h1>

            {error && (
                <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "16px", borderRadius: "12px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", minHeight: 0 }}>
                
                {/* Left: Recording & Preview */}
                <div className="neo-card" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                        {!isRecording ? (
                            <button
                                onClick={startRecording}
                                disabled={isProcessing || !!finalResult}
                                style={{
                                    width: "128px",
                                    height: "128px",
                                    borderRadius: "50%",
                                    backgroundColor: "#2563eb", // Blue-600
                                    color: "white",
                                    border: "none",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: isProcessing || !!finalResult ? "not-allowed" : "pointer",
                                    opacity: isProcessing || !!finalResult ? 0.5 : 1,
                                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                    transition: "all 0.2s"
                                }}
                            >
                                <Mic size={40} style={{ marginBottom: "8px" }} />
                                <span style={{ fontSize: "14px", fontWeight: "bold", letterSpacing: "0.05em" }}>START</span>
                            </button>
                        ) : (
                            <button
                                onClick={stopRecording}
                                style={{
                                    width: "128px",
                                    height: "128px",
                                    borderRadius: "50%",
                                    backgroundColor: "#dc2626", // Red-600
                                    color: "white",
                                    border: "none",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                                }}
                            >
                                <Square size={40} style={{ marginBottom: "8px", fill: "currentColor" }} />
                                <span style={{ fontSize: "14px", fontWeight: "bold", letterSpacing: "0.05em" }}>STOP</span>
                            </button>
                        )}
                    </div>

                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                        <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", fontWeight: "bold" }}>Real-time Transcript</h3>
                        <div style={{ flex: 1, backgroundColor: "#000000", padding: "24px", borderRadius: "12px", border: "1px solid var(--border-color)", overflowY: "auto", minHeight: "200px" }}>
                            <p style={{ color: "var(--text-color)", whiteSpace: "pre-wrap", lineHeight: "1.6", fontFamily: "monospace", fontSize: "14px", margin: 0 }}>
                                {transcript || (isRecording ? "聞き取っています..." : "録音を開始するとここに文字が表示されます。")}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Result & Actions */}
                <div className="neo-card" style={{ display: "flex", flexDirection: "column", gap: "24px", position: "relative", overflow: "hidden" }}>
                    {isProcessing ? (
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(19, 19, 20, 0.9)", zIndex: 10, gap: "24px" }}>
                            <Loader2 size={48} className="animate-spin" style={{ color: "var(--primary-color)" }} />
                            <div style={{ textAlign: "center" }}>
                                <p style={{ fontSize: "18px", fontWeight: "bold", color: "white", marginBottom: "4px" }}>AI解析中...</p>
                                <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Gemini 2.0 Flash が文字起こしと要約を生成しています</p>
                            </div>
                        </div>
                    ) : null}

                    {finalResult ? (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto" }}>
                            {/* Summary */}
                            <div style={{ flex: 1, backgroundColor: "rgba(138, 180, 248, 0.1)", padding: "24px", borderRadius: "12px", border: "1px solid rgba(138, 180, 248, 0.2)", overflowY: "auto" }}>
                                <h3 style={{ color: "var(--primary-color)", fontWeight: "bold", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--primary-color)" }}></span>
                                    AI Summary
                                </h3>
                                <div style={{ color: "var(--text-color)", fontSize: "14px", lineHeight: "1.6" }}>
                                    <ReactMarkdown>{finalResult.summary}</ReactMarkdown>
                                </div>
                            </div>

                            {/* Tag Input */}
                            <div style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", padding: "24px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                                <h3 style={{ color: "var(--text-secondary)", fontWeight: "bold", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    <Tag size={16} />
                                    Tags
                                </h3>
                                <TagInput tags={tags} onChange={setTags} placeholder="タグを追加 (例: 数学, 重要)" />
                            </div>

                            {/* File Upload (New) */}
                            <div style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", padding: "24px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                                <h3 style={{ color: "var(--text-secondary)", fontWeight: "bold", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    <FileText size={16} />
                                    Related Material
                                </h3>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileSelect} 
                                        style={{ display: "none" }} 
                                        accept=".pdf,.txt,.md"
                                    />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            padding: "8px 16px",
                                            borderRadius: "8px",
                                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                                            color: "var(--text-color)",
                                            border: "1px solid var(--border-color)",
                                            cursor: "pointer",
                                            fontSize: "14px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px"
                                        }}
                                    >
                                        <FileText size={16} />
                                        {selectedFile ? "変更" : "資料を追加 (PDF/Text)"}
                                    </button>
                                    {selectedFile && (
                                        <span style={{ fontSize: "14px", color: "var(--text-color)" }}>
                                            {selectedFile.name}
                                        </span>
                                    )}
                                    {selectedFile && (
                                        <button 
                                            onClick={() => setSelectedFile(null)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "var(--text-secondary)",
                                                cursor: "pointer",
                                                padding: "4px"
                                            }}
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "auto", paddingTop: "16px" }}>
                                <button
                                    onClick={handleCancel}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                        padding: "16px",
                                        borderRadius: "12px",
                                        fontWeight: "bold",
                                        color: "var(--text-secondary)",
                                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                                        border: "none",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    <X size={20} />
                                    取り消し
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={isSaving}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                        padding: "16px",
                                        borderRadius: "12px",
                                        fontWeight: "bold",
                                        backgroundColor: "#2563eb",
                                        color: "white",
                                        border: "none",
                                        cursor: isSaving ? "not-allowed" : "pointer",
                                        opacity: isSaving ? 0.5 : 1,
                                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                                    インポート (保存)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", border: "2px dashed var(--border-color)", borderRadius: "12px", color: "var(--text-secondary)" }}>
                            <FileText size={48} style={{ opacity: 0.2 }} />
                            <p>録音結果がここに表示されます</p>
                        </div>
                    )}
                </div>
            </div>
            <style jsx>{`
                @media (max-width: 768px) {
                    div[style*="grid-template-columns"] {
                        grid-template-columns: 1fr !important;
                    }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
