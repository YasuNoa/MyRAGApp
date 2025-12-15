"use client";

import LandingPage from "@/app/_components/LandingPage";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  // Prevent flash of content if redirected? 
  // Maybe just show LP and let it redirect. 
  // Or return null if user is present to avoid flash.
  // For better UX during redirect:
  if (!loading && user) return null; 

  return <LandingPage />;
}
