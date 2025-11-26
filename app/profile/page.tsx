import { auth } from "@/auth";
import ProfileForm from "./profile-form";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="container" style={{ paddingTop: "20px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "40px" }}>プロフィール設定</h1>
      <ProfileForm user={session.user} />
    </div>
  );
}
