"use client";

import ProfileMenu from "./profile-menu";
import { useEffect, useState } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";
import { auth } from "@/src/lib/firebase";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{user: any, providers: string[], subscription: any} | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    async function fetchData() {
        if (!user) return;
        try {
            const idToken = await user.getIdToken();
            const res = await fetch("/api/user/profile", {
                headers: { "Authorization": `Bearer ${idToken}` }
            });
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setFetching(false);
        }
    }
    if (user) {
        fetchData();
    }
  }, [user]);

  if (loading || fetching || !data) {
    return <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>Loading...</div>;
  }

  return (
    <div className="container" style={{ paddingTop: "20px", paddingBottom: "40px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "40px" }}>設定</h1>
      <ProfileMenu user={data.user} providers={data.providers} subscription={data.subscription} />
    </div>
  );
}
