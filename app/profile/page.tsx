import { auth } from "@/auth";
import ProfileMenu from "./profile-menu";
import { redirect } from "next/navigation";

import { prisma } from "@/src/lib/prisma";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // 連携済みのアカウントを取得
  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { provider: true },
  });

  const providers = accounts.map((account) => account.provider);

  return (
    <div className="container" style={{ paddingTop: "20px", paddingBottom: "40px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "40px" }}>設定</h1>
      <ProfileMenu user={session.user} providers={providers} />
    </div>
  );
}
