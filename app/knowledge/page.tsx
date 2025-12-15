import KnowledgeManager from "./_components/KnowledgeManager";

export default async function KnowledgePage() {

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ marginBottom: "30px", textAlign: "center" }}>知識ベース管理</h1>
      <KnowledgeManager />
    </div>
  );
}
