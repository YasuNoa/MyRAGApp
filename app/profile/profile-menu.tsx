"use client";

import { useState } from "react";
import { logout } from "@/app/actions/auth";
import ProfileForm from "./profile-form";
import { ChevronDown, ChevronUp, LogOut, MessageSquare, Settings, Slack } from "lucide-react";

export default function ProfileMenu({ user }: { user: any }) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);

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
        
        {/* Account Settings Item */}
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

        {/* Logout Item */}
        <div>
          <button 
            onClick={() => {
              if (window.confirm("ログアウトしますか？")) {
                logout();
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
    </div>
  );
}
