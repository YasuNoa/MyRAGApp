import { useState } from "react";
import { Copy, Check, Gift, X } from "lucide-react";

export default function InviteModal({ isOpen, onClose, userId }: { isOpen: boolean, onClose: () => void, userId: string }) {
  const [copied, setCopied] = useState(false);
  
  if (!isOpen) return null;

  // Ideally use a prop for the domain, but client-side window.location is fine for now
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = `${origin}/invite/${userId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000 // Higher than Sidebar
    }} onClick={onClose}>
        <div style={{
            background: "#1e1e1e",
            padding: "30px",
            borderRadius: "20px",
            width: "90%",
            maxWidth: "500px",
            position: "relative",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
        }} onClick={e => e.stopPropagation()}>
            <button onClick={onClose} style={{ position: "absolute", top: "15px", right: "15px", background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}><X size={24}/></button>
            <div style={{ textAlign: "center", marginBottom: "30px" }}>
                <div style={{ 
                    width: "80px", height: "80px", borderRadius: "20px", background: "rgba(251, 191, 36, 0.1)", 
                    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px auto"
                }}>
                    <Gift size={40} color="#fbbf24" strokeWidth={1.5} />
                </div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "white", marginBottom: "10px" }}>友達を招待しよう</h2>
                <p style={{ color: "#9ca3af", lineHeight: "1.6" }}>
                    あなたの招待リンクから友達が登録すると、<br />
                お互いに <span style={{ color: "#fbbf24", fontWeight: "bold" }}>30日間の無料期間</span> が追加されます！<br />
                <span style={{ fontSize: "0.8em", opacity: 0.8 }}>※キャンペーン中につき増量中 (通常7日)</span>
                </p>
            </div>
            
            <div style={{ 
                display: "flex", 
                gap: "10px", 
                background: "rgba(0,0,0,0.3)", 
                padding: "12px", 
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.1)",
                marginBottom: "30px",
                alignItems: "center"
            }}>
                <input 
                    readOnly 
                    value={inviteUrl} 
                    style={{ 
                        flex: 1, 
                        background: "transparent", 
                        border: "none", 
                        color: "white",
                        outline: "none",
                        fontSize: "0.9rem",
                        fontFamily: "monospace"
                    }}
                />
                <button onClick={handleCopy} style={{ 
                    background: copied ? "rgba(74, 222, 128, 0.1)" : "rgba(66, 133, 244, 0.1)", 
                    border: copied ? "1px solid #4ade80" : "1px solid #4285f4", 
                    borderRadius: "8px", 
                    width: "36px", height: "36px", 
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", 
                    color: copied ? "#4ade80" : "#4285f4",
                    transition: "all 0.2s"
                }}>
                    {copied ? <Check size={18}/> : <Copy size={18}/>}
                </button>
            </div>

            <button onClick={onClose} className="neo-button" style={{ 
                width: "100%", 
                padding: "14px", 
                borderRadius: "12px", 
                border: "none", 
                background: "white", 
                color: "black", 
                fontWeight: "bold", 
                cursor: "pointer",
                fontSize: "1rem"
            }}>
                閉じる
            </button>
        </div>
    </div>
  );
}
