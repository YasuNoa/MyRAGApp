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

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // Initialize Web Speech API
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = "ja-JP";

                recognitionRef.current.onresult = (event: any) => {
                    let finalTranscript = "";
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        }
                    }
                    setTranscript((prev) => prev + finalTranscript);
                };
                
                recognitionRef.current.onend = () => {
                    if (isRecording) {
                        recognitionRef.current.start();
                    }
                };
            }
        }
    }, [isRecording]);

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
            setFinalResult(null);
            setError(null);
            setTags([]);

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
                    document: data.document
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

    const handleImport = async () => {
        if (!finalResult?.document?.id) return;
        setIsSaving(true);
        try {
            const res = await fetch("/api/knowledge/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: finalResult.document.id,
                    tags: tags,
                    title: `Voice Memo ${new Date().toLocaleString()}` // Optional: Allow title edit?
                }),
            });

            if (res.ok) {
                router.push("/knowledge/list");
            } else {
                throw new Error("Failed to update tags");
            }
        } catch (err) {
            console.error(err);
            setError("保存に失敗しました");
            setIsSaving(false);
        }
    };

    const handleCancel = async () => {
        if (!finalResult?.document?.id) return;
        if (!confirm("本当に削除しますか？\nこの操作は取り消せません。")) return;

        try {
            await fetch("/api/knowledge/delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: finalResult.document.id }),
            });
            setFinalResult(null);
            setTranscript("");
        } catch (err) {
            console.error(err);
            setError("削除に失敗しました");
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-5xl h-full flex flex-col">
            <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-400" />
                授業ノート (Voice Memo)
            </h1>

            {error && (
                <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-2 border border-red-500/20">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
                
                {/* Left: Recording & Preview */}
                <div className="flex flex-col gap-6 bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-sm">
                    <div className="flex justify-center py-8">
                        {!isRecording ? (
                            <button
                                onClick={startRecording}
                                disabled={isProcessing || !!finalResult}
                                className="flex flex-col items-center justify-center w-32 h-32 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Mic className="w-10 h-10 mb-2" />
                                <span className="text-sm font-bold tracking-wider">START</span>
                            </button>
                        ) : (
                            <button
                                onClick={stopRecording}
                                className="flex flex-col items-center justify-center w-32 h-32 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg animate-pulse"
                            >
                                <Square className="w-10 h-10 mb-2 fill-current" />
                                <span className="text-sm font-bold tracking-wider">STOP</span>
                            </button>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col gap-2">
                        <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Real-time Transcript</h3>
                        <div className="flex-1 bg-zinc-950 p-6 rounded-xl border border-zinc-800 overflow-y-auto min-h-[200px]">
                            <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono text-sm">
                                {transcript || (isRecording ? "聞き取っています..." : "録音を開始するとここに文字が表示されます。")}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Result & Actions */}
                <div className="flex flex-col gap-6 bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-sm relative overflow-hidden">
                    {isProcessing ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 z-10 gap-6">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 text-blue-500 animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-white mb-1">AI解析中...</p>
                                <p className="text-sm text-zinc-400">Gemini 2.0 Flash が文字起こしと要約を生成しています</p>
                            </div>
                        </div>
                    ) : null}

                    {finalResult ? (
                        <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
                            {/* Summary */}
                            <div className="bg-blue-500/5 p-6 rounded-xl border border-blue-500/20">
                                <h3 className="text-blue-400 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                    AI Summary
                                </h3>
                                <div className="prose prose-invert prose-sm max-w-none text-zinc-300">
                                    <ReactMarkdown>{finalResult.summary}</ReactMarkdown>
                                </div>
                            </div>

                            {/* Transcript (Collapsible or Scrollable) */}
                            <div className="bg-zinc-900/50 p-6 rounded-xl border border-white/5">
                                <h3 className="text-zinc-500 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <FileText className="w-4 h-4" />
                                    Transcript
                                </h3>
                                <div className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto pr-2">
                                    {finalResult.transcript}
                                </div>
                            </div>

                            {/* Tag Input */}
                            <div className="bg-zinc-800/50 p-6 rounded-xl border border-white/5">
                                <h3 className="text-zinc-400 font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Tag className="w-4 h-4" />
                                    Tags
                                </h3>
                                <TagInput tags={tags} onChange={setTags} placeholder="タグを追加 (例: 数学, 重要)" />
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-4 mt-auto pt-4">
                                <button
                                    onClick={handleCancel}
                                    className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-zinc-400 bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-all"
                                >
                                    <X className="w-5 h-5" />
                                    取り消し
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={isSaving}
                                    className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    インポート (保存)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-4 border-2 border-dashed border-zinc-800 rounded-xl">
                            <FileText className="w-12 h-12 opacity-20" />
                            <p>録音結果がここに表示されます</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
