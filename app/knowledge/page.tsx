import { auth } from "@/auth";
import GoogleDriveImport from "./_components/GoogleDriveImport";
import KnowledgeList from "./_components/KnowledgeList";
import ManualAdd from "./_components/ManualAdd";

export default async function KnowledgePage() {
  const session = await auth();

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ marginBottom: "30px", textAlign: "center" }}>知識ベース管理</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
        {/* 手動入力フォーム */}
        <ManualAdd />

        {/* Google Drive インポート */}
        <GoogleDriveImport />

        {/* 学習済みデータ一覧 */}
        <KnowledgeList />
      </div>
    </div>
  );
}
