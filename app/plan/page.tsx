import Link from "next/link";
import PlansSection from "@/app/_components/PlansSection";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";

export default async function PlanPage() {
  const session = await auth();
  let subscription = null;

  if (session?.user?.id) {
    subscription = await prisma.userSubscription.findUnique({
      where: { userId: session.user.id },
      select: { plan: true },
    });
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column",
      backgroundColor: "#000000",
      color: "#ffffff",
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Simple Header */}
      <header style={{ 
        padding: "20px 40px", 
        display: "flex", 
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ fontSize: "24px", fontWeight: "bold", background: "linear-gradient(to right, #8ab4f8, #c58af9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            じぶんAI
          </div>
        </Link>
        <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/login" style={{ textDecoration: "none" }}>
                <button className="neo-button" style={{ 
                    padding: "8px 20px", 
                    fontSize: "14px",
                    background: "transparent",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.2)",
                    fontWeight: "bold"
                }}>
                    ログイン
                </button>
            </Link>
            <Link href="/register" style={{ textDecoration: "none" }}>
                <button className="neo-button" style={{ 
                    padding: "8px 20px", 
                    fontSize: "14px",
                    background: "white",
                    color: "black",
                    border: "none",
                    fontWeight: "bold"
                }}>
                    新規登録
                </button>
            </Link>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <PlansSection subscription={subscription} />
      </main>

      <footer style={{ 
        padding: "40px 20px", 
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        textAlign: "center",
        color: "#6b7280",
        fontSize: "12px",
        backgroundColor: "black"
      }}>
        <div>© 2025 じぶんAI</div>
      </footer>
    </div>
  );
}
