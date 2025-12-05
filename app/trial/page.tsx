"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { MessageSquare, Mic, ArrowRight, Lock, StopCircle, Loader2, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function TrialPage() {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  // Chat State
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatRemaining, setChatRemaining] = useState(2);

  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSummary, setVoiceSummary] = useState<string | null>(null);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [voiceRemaining, setVoiceRemaining] = useState(1);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // --- Chat Logic ---
  const handleSendMessage = async () => {
    if (!input.trim() || isChatLoading) return;
    if (chatRemaining <= 0) {
      setShowRegisterModal(true);
      return;
    }

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/trial/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (res.status === 403) {
        setShowRegisterModal(true);
        setIsChatLoading(false);
        return;
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      setChatRemaining(data.remaining);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- Voice Logic ---
  const startRecording = async () => {
    if (voiceRemaining <= 0) {
      setShowRegisterModal(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop tracks immediately to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        if (chunksRef.current.length === 0) {
          console.error("No audio chunks recorded");
          setIsVoiceLoading(false);
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await uploadAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Auto stop after 30s
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          stopRecording();
        }
      }, 30000);

    } catch (error) {
      console.error("Microphone access denied:", error);
      alert("マイクへのアクセスを許可してください");
      setIsVoiceLoading(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      setIsVoiceLoading(true); // Show loading immediately to prevent flash
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadAudio = async (audioBlob: Blob) => {
    setIsVoiceLoading(true);
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    try {
      const res = await fetch("/api/trial/voice", {
        method: "POST",
        body: formData,
      });

      if (res.status === 403) {
        setShowRegisterModal(true);
        setIsVoiceLoading(false);
        return;
      }

      const data = await res.json();
      setVoiceSummary(data.summary);
      setVoiceRemaining(data.remaining);
    } catch (error) {
      console.error("Voice upload error:", error);
    } finally {
      setIsVoiceLoading(false);
    }
  };

  return (
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      backgroundColor: "#000000", 
      color: "#ffffff",
      fontFamily: "'Inter', sans-serif",
      overflow: "hidden",
      position: "relative"
    }}>
      {/* Background Gradients */}
      <div style={{
        position: "fixed",
        top: "-20%",
        left: "-10%",
        width: "60%",
        height: "60%",
        background: "radial-gradient(circle, rgba(66, 133, 244, 0.15) 0%, rgba(0,0,0,0) 70%)",
        filter: "blur(80px)",
        zIndex: 0,
        pointerEvents: "none"
      }}></div>
      <div style={{
        position: "fixed",
        bottom: "-20%",
        right: "-10%",
        width: "60%",
        height: "60%",
        background: "radial-gradient(circle, rgba(197, 138, 249, 0.15) 0%, rgba(0,0,0,0) 70%)",
        filter: "blur(80px)",
        zIndex: 0,
        pointerEvents: "none"
      }}></div>

      {/* Header */}
      <header style={{ 
        padding: "15px 30px", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 10
      }}>
        <div style={{ fontSize: "20px", fontWeight: "bold", background: "linear-gradient(to right, #8ab4f8, #c58af9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          じぶんAI <span style={{ fontSize: "12px", color: "#888", marginLeft: "10px", fontWeight: "normal" }}>体験版</span>
        </div>
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <Link href="/" style={{ color: "#aaa", textDecoration: "none", fontSize: "14px", display: "flex", alignItems: "center", transition: "color 0.2s" }} className="hover:text-white">
            <span style={{ marginRight: "5px" }}>トップへ戻る</span>
          </Link>
          <Link href="/login">
            <button className="neo-button" style={{ 
              padding: "8px 20px", 
              fontSize: "14px",
              background: "white",
              color: "black",
              border: "none",
              borderRadius: "20px",
              fontWeight: "bold"
            }}>ログイン</button>
          </Link>
          <Link href="/register">
            <button className="neo-button" style={{ 
              padding: "8px 20px", 
              fontSize: "14px",
              background: "linear-gradient(135deg, #0061ff, #60efff)",
              color: "white",
              border: "none",
              borderRadius: "20px",
              fontWeight: "bold"
            }}>新規登録</button>
          </Link>
        </div>
      </header>

      {/* Main Content - Split View */}
      {/* Main Content - Split View */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", flexDirection: "row", zIndex: 1, padding: "50px", gap: "40px", maxWidth: "1200px", width: "100%", margin: "0 auto" }} className="trial-container">
        <style dangerouslySetInnerHTML={{__html: `
          @media (max-width: 768px) {
            .trial-container { flexDirection: column !important; padding: 20px !important; gap: 20px !important; }
            .voice-area { border-top: none !important; }
          }
        `}} />
        
        {/* Left: Chat Area */}
        <div style={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "column", 
          position: "relative", 
          background: "rgba(20, 20, 20, 0.6)", 
          backdropFilter: "blur(20px)",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)",
          overflow: "hidden"
        }}>
          <div style={{ padding: "20px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", alignItems: "center", gap: "10px" }}>
            <MessageSquare size={18} color="#4285F4" />
            <span style={{ fontWeight: "bold" }}>AIチャット</span>
            <span style={{ fontSize: "12px", color: "#888", marginLeft: "auto", background: "rgba(255, 255, 255, 0.1)", padding: "2px 8px", borderRadius: "10px" }}>残り{chatRemaining}回</span>
          </div>
          
          <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
            {messages.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#666", gap: "10px" }}>
                <MessageSquare size={40} color="#333" />
                <p>AIに質問してみましょう</p>
                <p style={{ fontSize: "12px", color: "#444" }}>例: 「効果的な勉強法は？」「アイデア出しを手伝って」</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} style={{ 
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  padding: "12px 18px",
                  borderRadius: "16px",
                  borderTopRightRadius: msg.role === "user" ? "4px" : "16px",
                  borderTopLeftRadius: msg.role === "user" ? "16px" : "4px",
                  backgroundColor: msg.role === "user" ? "#4285F4" : "rgba(255, 255, 255, 0.1)",
                  color: "#fff",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ))
            )}
            {isChatLoading && (
              <div style={{ alignSelf: "flex-start", padding: "10px", color: "#888" }}>
                <Loader2 size={16} className="animate-spin" />
              </div>
            )}
          </div>

          <div style={{ padding: "20px", borderTop: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(0, 0, 0, 0.2)" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="AIに質問する..." 
                disabled={isChatLoading || chatRemaining <= 0}
                style={{ 
                  flex: 1, 
                  padding: "12px 16px", 
                  borderRadius: "12px", 
                  border: "1px solid rgba(255, 255, 255, 0.1)", 
                  backgroundColor: "rgba(255, 255, 255, 0.05)", 
                  color: "#fff",
                  outline: "none",
                  transition: "border-color 0.2s"
                }} 
                className="focus:border-blue-500"
              />
              <button 
                onClick={handleSendMessage}
                disabled={isChatLoading || chatRemaining <= 0}
                className="neo-button" 
                style={{ 
                  padding: "12px", 
                  opacity: (isChatLoading || chatRemaining <= 0) ? 0.5 : 1,
                  background: "linear-gradient(135deg, #4285F4, #8ab4f8)",
                  border: "none",
                  borderRadius: "12px",
                  color: "white",
                  cursor: "pointer"
                }}
              >
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Voice Memo Area */}
        <div className="voice-area" style={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "column", 
          background: "rgba(20, 20, 20, 0.6)", 
          backdropFilter: "blur(20px)",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)",
          overflow: "hidden"
        }}>
          <div style={{ padding: "20px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", alignItems: "center", gap: "10px" }}>
            <Mic size={18} color="#C58AF9" />
            <span style={{ fontWeight: "bold" }}>音声メモ</span>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", padding: "20px" }}>
            
            {voiceSummary ? (
              <div style={{ 
                width: "100%", 
                maxWidth: "400px", 
                padding: "24px", 
                backgroundColor: "rgba(255, 255, 255, 0.05)", 
                borderRadius: "20px", 
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)"
              }}>
                <h3 style={{ marginBottom: "15px", color: "#C58AF9", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Zap size={16} /> 要約結果
                </h3>
                <div style={{ fontSize: "14px", lineHeight: "1.8", color: "#e5e7eb" }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{voiceSummary}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <>
                <div 
                  onClick={isRecording ? stopRecording : startRecording}
                  style={{ 
                    width: "140px", 
                    height: "140px", 
                    borderRadius: "50%", 
                    backgroundColor: isRecording ? "rgba(255, 59, 48, 0.1)" : "rgba(66, 133, 244, 0.1)", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    cursor: "pointer",
                    border: isRecording ? "2px solid #FF3B30" : "1px solid #4285F4",
                    transition: "all 0.3s",
                    animation: isRecording ? "pulse 2s infinite" : "none",
                    boxShadow: isRecording ? "0 0 30px rgba(255, 59, 48, 0.3)" : "0 0 20px rgba(66, 133, 244, 0.2)"
                  }}
                  className="hover:bg-blue-500/20"
                >
                  {isVoiceLoading ? (
                    <Loader2 size={48} color="#4285F4" className="animate-spin" />
                  ) : isRecording ? (
                    <StopCircle size={48} color="#FF3B30" />
                  ) : (
                    <Mic size={48} color="#4285F4" />
                  )}
                </div>
                <p style={{ color: "#aaa", fontSize: "16px", fontWeight: "500" }}>
                  {isVoiceLoading ? "AIが解析中..." : isRecording ? "録音中... (タップで停止)" : "タップして録音を開始"}
                </p>
                {!isRecording && !isVoiceLoading && (
                  <p style={{ fontSize: "13px", color: "#666" }}>「今日の出来事」を30秒で話してみよう</p>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Registration Modal (Overlay) */}
      {showRegisterModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(5px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div className="neo-card" style={{ 
            maxWidth: "400px", 
            textAlign: "center", 
            padding: "40px",
            background: "rgba(20, 20, 20, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "24px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
          }}>
            <div style={{ 
              width: "60px", 
              height: "60px", 
              borderRadius: "50%", 
              background: "rgba(66, 133, 244, 0.1)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              margin: "0 auto 20px" 
            }}>
              <Lock size={30} color="#8ab4f8" />
            </div>
            <h2 style={{ marginBottom: "10px", fontSize: "20px", fontWeight: "bold" }}>体験版の制限に達しました</h2>
            <p style={{ color: "#aaa", marginBottom: "30px", lineHeight: "1.6" }}>
              続きを利用するには、無料アカウント登録を行ってください。<br/>
              今の会話履歴は引き継がれます。
            </p>
            <Link href="/register">
              <button className="neo-button" style={{ 
                width: "100%", 
                padding: "14px", 
                background: "linear-gradient(135deg, #4285F4, #C58AF9)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontWeight: "bold",
                fontSize: "16px",
                cursor: "pointer"
              }}>
                無料で登録して続ける
              </button>
            </Link>
            <button 
              onClick={() => setShowRegisterModal(false)}
              style={{ marginTop: "20px", background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "14px" }}
              className="hover:text-white transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(197, 138, 249, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(197, 138, 249, 0); }
          100% { box-shadow: 0 0 0 0 rgba(197, 138, 249, 0); }
        }
        .hover\\:text-white:hover { color: white !important; }
        .hover\\:bg-white\\/5:hover { background-color: rgba(255, 255, 255, 0.05) !important; }
        .focus\\:border-blue-500:focus { border-color: #4285F4 !important; }
      `}} />
    </div>
  );
}
