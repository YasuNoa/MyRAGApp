"use client";

import { useState } from "react";

export default function ProfileForm({ user }: { user: any }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false);

  // Email and Password management is now handled by Firebase Auth providers (Google/LINE)
  // or via Firebase Console for email/pass users. 
  // We simply display the current email here.

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>
            メールアドレス
          </label>
          <input 
            type="email" 
            name="email" 
            defaultValue={user.email || ""} 
            readOnly
            className="neo-input"
            style={{ 
              width: "100%", 
              boxSizing: "border-box",
              opacity: 0.7,
              color: "var(--text-secondary)"
            }}
          />
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            ※メールアドレスの変更はサポートにお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
}
