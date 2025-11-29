"use client";

import GoogleDriveImport from "./GoogleDriveImport";
import ManualAdd from "./ManualAdd";

export default function KnowledgeManager() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      {/* 手動入力フォーム */}
      <ManualAdd />

      {/* Google Drive インポート */}
      <GoogleDriveImport />
    </div>
  );
}
