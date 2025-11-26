import { auth } from "@/auth";
import ProfileMenu from "./profile-menu";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="container" style={{ paddingTop: "20px", paddingBottom: "40px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "40px" }}>設定</h1>
      <ProfileMenu user={session.user} />
    </div>
  );
}
