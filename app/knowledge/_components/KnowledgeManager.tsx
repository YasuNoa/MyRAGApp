"use client";

import { useState } from "react";
import GoogleDriveImport from "./GoogleDriveImport";
import KnowledgeList from "./KnowledgeList";
import ManualAdd from "./ManualAdd";

export default function KnowledgeManager() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      {/* 手動入力フォーム */}
      <ManualAdd onSuccess={handleSuccess} />

      {/* Google Drive インポート */}
      <GoogleDriveImport onSuccess={handleSuccess} />

      {/* 学習済みデータ一覧 */}
      <KnowledgeList refreshTrigger={refreshTrigger} />
    </div>
  );
}
