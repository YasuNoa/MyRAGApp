"use client";

import GoogleDriveImport from "./GoogleDriveImport";
import ManualAdd from "./ManualAdd";

export default function KnowledgeManager() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      {/* 手動入力フォーム */}
      <ManualAdd onSave={async (text, tags) => {
        // We need to access userId here. But KnowledgeManager is a client component.
        // We can use useSession or pass userId from props.
        // But wait, KnowledgeService is client-side wrapper calling API?
        // No, KnowledgeService uses prisma which is server-side.
        // So KnowledgeService cannot be imported in client component directly if it uses prisma.
        // Ah, KnowledgeService uses `prisma` from `@/src/lib/prisma`.
        // If `src/lib/prisma` is server-only, this will fail.
        // `ManualAdd` calls `onSave`.
        // We should call an API route from here, not KnowledgeService directly.
        // The previous implementation of ManualAdd called `fetch("/api/add")`.
        // So ManualAdd should handle the API call itself or we pass a handler that calls API.
        // Let's check `app/api/add/route.ts`.
        
        // Actually, ManualAdd in my previous edit (Step 2691) calls `onSave`.
        // So KnowledgeManager needs to define `onSave`.
        // But KnowledgeManager is client component.
        // It should call `/api/add`.
        
        const res = await fetch("/api/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, tags }),
        });
        if (!res.ok) throw new Error("Failed to save");
      }} />

      {/* Google Drive インポート */}
      <GoogleDriveImport />
    </div>
  );
}
