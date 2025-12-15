"use client";

import { useState } from "react";
import ProfileForm from "./profile-form";
import NameForm from "./name-form";
import AiNameForm from "./ai-name-form";
import { ChevronDown, ChevronUp, LogOut, MessageSquare, Settings, Slack, User, Globe, FileText, ChevronRight, CreditCard } from "lucide-react";
import { auth } from "@/src/lib/firebase";

export default function ProfileMenu({ user, providers = [], subscription }: { user: any, providers?: string[], subscription?: any }) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAiProfileOpen, setIsAiProfileOpen] = useState(false);

  const handleLinkLine = () => {
    // signIn("line", { callbackUrl: "/profile" });
    alert("この機能は現在メンテナンス中です");
  };

  const handleLinkGoogle = () => {
    // signIn("google", { callbackUrl: "/profile" });
    alert("この機能は現在メンテナンス中です");
  };

  return (
    <div className="neo-card" style={{ width: "100%", maxWidth: "600px", margin: "0 auto", padding: "0", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ 
        padding: "32px", 
        textAlign: "center", 
        borderBottom: "1px solid var(--border-color)",
        backgroundColor: "rgba(255, 255, 255, 0.02)"
      }}>
        {user.image ? (
          <img 
            src={user.image} 
            alt="Profile" 
            style={{ width: "80px", height: "80px", borderRadius: "50%", marginBottom: "16px", border: "2px solid var(--border-color)" }} 
          />
        ) : (
          <div style={{ 
            width: "80px", 
            height: "80px", 
            borderRadius: "50%", 
            backgroundColor: "var(--surface-color)", 
            margin: "0 auto 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid var(--border-color)"
          }}>
            <span style={{ fontSize: "32px" }}>👤</span>
          </div>
        )}
        <h2 style={{ margin: 0, fontSize: "1.5rem" }}>{user.name}</h2>
        {/* Email is hidden as requested */}
      </div>

      {/* Menu List */}
      <div style={{ display: "flex", flexDirection: "column" }}>

        {/* Current Plan Item */}
        <div style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ 
            padding: "20px 24px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <CreditCard size={20} color="var(--primary-color)" />
              <span>現在のプラン</span>
            </div>
            <span style={{ fontWeight: "bold", fontSize: "16px", color: "var(--text-color)" }}>
              {subscription?.plan || "FREE"} プラン
            </span>
          </div>
        </div>
        
        {/* Profile Settings Item (Name) */}
        <div style={{ borderBottom: "1px solid var(--border-color)" }}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            style={{ 
              width: "100%", 
              padding: "20px 24px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              background: "none",
              border: "none",
              color: "var(--text-color)",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <User size={20} color="var(--primary-color)" />
              <span>プロフィール設定（名前）</span>
            </div>
            {isProfileOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {/* Collapsible Content */}
          {isProfileOpen && (
            <div style={{ padding: "0 24px 24px 24px", animation: "fadeIn 0.2s ease-in-out" }}>
              <div style={{ 
                backgroundColor: "rgba(0,0,0,0.2)", 
                borderRadius: "8px", 
                padding: "20px" 
              }}>
                <NameForm user={user} />
              </div>
            </div>
          )}
        </div>

        {/* Account Settings Item (Email/Password) */}
        <div style={{ borderBottom: "1px solid var(--border-color)" }}>
          <button 
            onClick={() => setIsAccountOpen(!isAccountOpen)}
            style={{ 
              width: "100%", 
              padding: "20px 24px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              background: "none",
              border: "none",
              color: "var(--text-color)",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Settings size={20} color="var(--primary-color)" />
              <span>アカウント設定（メール・パスワード）</span>
            </div>
            {isAccountOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {/* Collapsible Content */}
          {isAccountOpen && (
            <div style={{ padding: "0 24px 24px 24px", animation: "fadeIn 0.2s ease-in-out" }}>
              <div style={{ 
                backgroundColor: "rgba(0,0,0,0.2)", 
                borderRadius: "8px", 
                padding: "20px" 
              }}>
                <ProfileForm user={user} />
              </div>
            </div>
          )}
        </div>

        {/* AI Name Settings Item */}
        <div style={{ borderBottom: "1px solid var(--border-color)" }}>
          <button 
            onClick={() => setIsAiProfileOpen(!isAiProfileOpen)}
            style={{ 
              width: "100%", 
              padding: "20px 24px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              background: "none",
              border: "none",
              color: "var(--text-color)",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "20px" }}>🤖</span>
              <span>AIの設定（名前変更）</span>
            </div>
            {isAiProfileOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {/* Collapsible Content */}
          {isAiProfileOpen && (
            <div style={{ padding: "0 24px 24px 24px", animation: "fadeIn 0.2s ease-in-out" }}>
              <div style={{ 
                backgroundColor: "rgba(0,0,0,0.2)", 
                borderRadius: "8px", 
                padding: "20px" 
              }}>
                <AiNameForm user={user} />
              </div>
            </div>
          )}
        </div>

        {/* Slack Integration Item (UI Only) */}
        <div style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ 
            padding: "20px 24px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Slack size={20} color="#E01E5A" />
              <span>Slack連携(開発中)</span>
            </div>
            <button className="neo-button secondary" style={{ fontSize: "12px", padding: "6px 16px" }}>
              連携する
            </button>
          </div>
        </div>

        {/* LINE Integration Item */}
        <div style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ 
            padding: "20px 24px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <MessageSquare size={20} color="#06C755" />
              <span>LINE連携</span>
            </div>
            {providers.includes("line") ? (
              <span style={{ fontSize: "12px", color: "var(--primary-color)", fontWeight: "bold" }}>
                連携済み
              </span>
            ) : (
              <button 
                onClick={() => handleLinkLine()}
                className="neo-button secondary" 
                style={{ fontSize: "12px", padding: "6px 16px" }}
              >
                連携する
              </button>
            )}
          </div>
        </div>

        {/* Google Integration Item */}
        <div style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ 
            padding: "20px 24px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Globe size={20} color="#4285F4" />
              <span>Google連携</span>
            </div>
            {providers.includes("google") ? (
              <span style={{ fontSize: "12px", color: "var(--primary-color)", fontWeight: "bold" }}>
                連携済み
              </span>
            ) : (
              <button 
                onClick={() => handleLinkGoogle()}
                className="neo-button secondary" 
                style={{ fontSize: "12px", padding: "6px 16px" }}
              >
                連携する
              </button>
            )}
          </div>
        </div>

        {/* Terms of Service */}
        <div style={{ borderBottom: "1px solid var(--border-color)" }}>
          <a href="/terms" style={{ textDecoration: "none" }}>
            <div style={{ 
              padding: "20px 24px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              color: "var(--text-color)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <FileText size={20} color="var(--text-secondary)" />
                <span>利用規約</span>
              </div>
              <ChevronRight size={16} color="var(--text-secondary)" />
            </div>
          </a>
        </div>

        {/* Privacy Policy */}
        <div style={{ borderBottom: "1px solid var(--border-color)" }}>
          <a href="/privacy" style={{ textDecoration: "none" }}>
            <div style={{ 
              padding: "20px 24px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              color: "var(--text-color)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <FileText size={20} color="var(--text-secondary)" />
                <span>プライバシーポリシー</span>
              </div>
              <ChevronRight size={16} color="var(--text-secondary)" />
            </div>
          </a>
        </div>

        {/* Logout Item */}
        <div>
          <button 
            onClick={() => {
              if (window.confirm("ログアウトしますか？")) {
                auth.signOut().then(() => {
                  window.location.href = "/";
                });
              }
            }}
            style={{ 
              width: "100%", 
              padding: "20px 24px", 
              display: "flex", 
              alignItems: "center", 
              gap: "12px",
              background: "none",
              border: "none",
              color: "#ff6b6b", // Red color for logout
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            <LogOut size={20} />
            <span>ログアウト</span>
          </button>
        </div>

      </div>
      
      {/* Copyright Footer */}
      <div style={{ 
        padding: "20px", 
        textAlign: "center", 
        fontSize: "12px", 
        color: "var(--text-secondary)",
        borderTop: "1px solid var(--border-color)",
        backgroundColor: "rgba(0, 0, 0, 0.02)"
      }}>
        © 2025 じぶんAI
      </div>
    </div>
  );
}
