"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/context/AuthContext";

export default function PricingPage() {
  const router = useRouter();
  const { user, fetchWithAuth } = useAuth();
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (plan: string, selectedInterval: "month" | "year" | "one_time") => {
    if (!user) {
      router.push("/login");
      return;
    }

    setLoadingPlan(plan);
    try {
      const res = await fetchWithAuth("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval: selectedInterval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "決済の開始に失敗しました");
        setLoadingPlan(null);
      }
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
      setLoadingPlan(null);
    }
  };

  const PLANS = [
    {
      id: "STANDARD",
      name: "Standard ",
      icon: "",
      price: interval === "month" ? "¥980" : "¥5,800",
      baseMonthlyPrice: 980,
      period: interval === "month" ? "/月" : "/年",
      features: [
        "チャット: 100回 / 日",
        "音声解析: 無制限 (月30時間)",
        "音声1回あたりの上限: 90分",
        "資料保存: 200ファイル",
        "外部検索性能:高め"
      ],
      color: "#4ade80",
      recomended: true,
    },
    {
      id: "PREMIUM",
      name: "Premium ",
      icon: "",
      price: interval === "month" ? "¥2,980" : "¥19,800",
      baseMonthlyPrice: 2980,
      period: interval === "month" ? "/月" : "/年",
      features: [
        "チャット: 200回 / 日",
        "音声解析: 無制限 (月100時間)",
        "音声1回あたりの上限: 3時間",
        "資料保存: 1000ファイル",
        "外部検索性能:最高"
      ],
      color: "#a78bfa",
      recomended: false,
    },
  ];

  return (
    <div style={{ padding: "40px 20px", maxWidth: "1000px", margin: "0 auto", color: "var(--text-primary)" }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "10px", fontWeight: "bold" }}>プランを選択</h1>
        <p style={{ color: "var(--text-secondary)" }}>あなたの大学生活を、AIで加速させよう。</p>
        
        {/* Toggle Switch */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "20px" }}>
          <span style={{ fontWeight: interval === "month" ? "bold" : "normal", color: interval === "month" ? "var(--text-primary)" : "var(--text-secondary)" }}>月払い</span>
          <div 
            onClick={() => setInterval(prev => prev === "month" ? "year" : "month")}
            style={{ 
              width: "50px", 
              height: "28px", 
              backgroundColor: "var(--input-bg)", 
              borderRadius: "20px", 
              position: "relative",
              cursor: "pointer",
              border: "1px solid var(--border-color)"
            }}
          >
            <div style={{
              width: "22px",
              height: "22px",
              backgroundColor: "var(--primary-color)",
              borderRadius: "50%",
              position: "absolute",
              top: "2px",
              left: interval === "month" ? "2px" : "24px",
              transition: "left 0.3s ease"
            }} />
          </div>
          <span style={{ fontWeight: interval === "year" ? "bold" : "normal", color: interval === "year" ? "var(--text-primary)" : "var(--text-secondary)" }}>
            年払い <span style={{ fontSize: "0.8em", color: "#f59e0b" }}>(お得!)</span>
          </span>
        </div>
      </div>

      {/* Plan Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "60px" }}>
        {PLANS.map((plan) => {
            // Price Calculation Logic matching Landing Page
            let displayPrice = plan.price;
            let subPrice = "";
            let period = plan.period;
            let comparisonPrice = null;

            if (interval === "year") {
                const numericPrice = parseInt(plan.price.replace(/[^\d]/g, ""));
                const monthlyEquiv = Math.floor(numericPrice / 12);
                displayPrice = `¥${monthlyEquiv.toLocaleString()}`;
                period = "/月";
                subPrice = `一括払い: ${plan.price}/年`;
                // @ts-ignore
                if(plan.baseMonthlyPrice) {
                    // @ts-ignore
                    comparisonPrice = `¥${plan.baseMonthlyPrice.toLocaleString()}`;
                }
            }

            return (
          <div key={plan.id} className="neo-card" style={{ 
            position: "relative", 
            border: plan.recomended ? `2px solid ${plan.color}` : "1px solid var(--border-color)",
            transform: plan.recomended ? "scale(1.02)" : "none"
          }}>
            {plan.recomended && (
              <div style={{
                position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)",
                backgroundColor: plan.color, color: "black", padding: "4px 12px", borderRadius: "12px",
                fontSize: "12px", fontWeight: "bold"
              }}>
                おすすめ
              </div>
            )}
            <div style={{ fontSize: "3rem", marginBottom: "10px" }}>{plan.icon}</div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "5px" }}>{plan.name}</h2>
            
            <div style={{ 
                marginBottom: "20px", 
                height: "110px", 
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end" 
            }}>
              <div style={{ 
                  textDecoration: "line-through", 
                  textDecorationColor: "#ef4444",
                  textDecorationThickness: "2px",
                  color: "#9ca3af", 
                  fontSize: "1rem", 
                  marginBottom: "-3px",
                  fontWeight: "bold",
                  minHeight: "1.4rem", 
                  opacity: comparisonPrice ? 1 : 0 
              }}>
                  {comparisonPrice || "¥0"}
              </div>
              <div style={{ 
                  fontSize: "2.8rem", 
                  fontWeight: "bold", 
                  color: "var(--text-primary)",
                  lineHeight: "1.1"
              }}>
                <span style={comparisonPrice ? {
                    background: "linear-gradient(to right, #fbbf24, #f59e0b)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                } : { color: "var(--text-primary)" }}>
                    {displayPrice}
                </span>
                <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginLeft: "4px" }}>{period}</span>
              </div>
              {subPrice && (
                  <div style={{ fontSize: "0.8rem", color: "#fbbf24", marginTop: "6px", fontWeight: "bold" }}>
                      {subPrice}
                  </div>
              )}
              {!subPrice && (
                  <div style={{ fontSize: "0.8rem", marginTop: "6px", minHeight: "1.2rem", opacity: 0 }}>
                      -
                  </div>
              )}
            </div>
            
            <ul style={{ listStyle: "none", padding: 0, marginBottom: "20px", textAlign: "left" }}>
              {plan.features.map((f, i) => (
                <li key={i} style={{ marginBottom: "8px", display: "flex", alignItems: "center" }}>
                  <span style={{ color: plan.color, marginRight: "8px" }}>✔</span> {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(plan.id, interval)}
              disabled={!!loadingPlan}
              className="neo-button"
              style={{ 
                width: "100%", 
                backgroundColor: plan.color, 
                color: "black",
                opacity: loadingPlan ? 0.7 : 1,
                transition: "all 0.3s ease",
                border: "none",
                borderRadius: "12px", // Ensuring consistent border radius
                fontWeight: "bold",
                cursor: "pointer"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = `0 10px 25px ${plan.color}80`; // Colored shadow with opacity
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {loadingPlan === plan.id ? "準備中..." : "このプランにする"}
            </button>
          </div>
            )
        })}
      </div>

      {/* Ticket Section */}
      <div className="neo-card" style={{ textAlign: "center", border: "1px dashed var(--border-color)" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "10px" }}>🎟️ 単位救済チケット (90分)</h3>
        <p style={{ color: "var(--text-secondary)", marginBottom: "15px" }}>
            テスト直前なのに枠が足りない…そんな時の救世主。<br/>
            ジュース1本分の価格で、90分間の解析時間をチャージできます。<br/>
            <span style={{ fontSize: "0.9em" }}>※サブスクではありません。有効期限なし。</span>
        </p>
        <button
            onClick={() => handleCheckout("TICKET", "one_time")}
            disabled={!!loadingPlan}
            className="neo-button"
            style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                border: "none",
                color: "white",
                padding: "12px 40px",
                borderRadius: "30px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "1.1rem",
                boxShadow: "0 4px 15px rgba(245, 158, 11, 0.3)",
                transition: "all 0.3s ease",
                marginTop: "10px"
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(245, 158, 11, 0.5)";
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(245, 158, 11, 0.3)";
            }}
        >
            {loadingPlan === "TICKET" ? "準備中..." : "¥99 でチャージする"}
        </button>
      </div>

      <div style={{ marginTop: "40px", textAlign: "center", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
        <a href="/legal/tokusho" style={{ textDecoration: "underline", color: "inherit" }}>特定商取引法に基づく表記</a>
      </div>
    </div>
  );
}
