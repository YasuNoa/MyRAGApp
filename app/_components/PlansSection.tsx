"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

export default function PlansSection({ id, subscription }: { id?: string, subscription?: any }) {
  const [interval, setInterval] = useState<"month" | "year">("month");

  const PLANS = [
    {
      name: "Free",
      price: "¥0",
      period: "/月",
      description: "まずはここから。じぶんAIの便利さを体験。",
      features: [
        "チャット: 1日10回まで",
        "音声解析: 1日5回 (20分制限)",
        "資料保存: 10ファイル",
        "外部検索性能: 低"
      ],
      buttonText: "無料で始める",
      buttonHref: "/register",
      color: "#ffffff",
      highlight: false
    },
    {
      name: "Standard",
      price: interval === "month" ? "¥980" : "¥5,800",
      baseMonthlyPrice: 980,
      period: interval === "month" ? "/月" : "/年",
      description: "一番人気。スタバ１杯分/月で制限を気にせず楽し放題。",
      features: [
        "チャット: 1日100回 (ほぼ無制限)",
        "音声解析: 月30時間 (授業一コマ分)",
        "資料保存: 200ファイル (授業資料2年分)",
        "外部検索性能: 高め"
      ],
      buttonText: "Standardで始める",
      buttonHref: "/register?plan=STANDARD",
      color: "#4ade80", // Green like Spotify Premium
      highlight: true
    },
    {
      name: "Premium",
      price: interval === "month" ? "¥2,980" : "¥19,800",
      baseMonthlyPrice: 2980,
      period: interval === "month" ? "/月" : "/年",
      description: "就活の面接の内容の記録、卒論の内容も全部記憶。", 
      features: [
        "チャット: 1日200回 (実質無制限)",
        "音声解析: 月100時間 (実質無制限)",
        "資料保存: 1000ファイル (実質無制限)",
        "外部検索性能: 最高",
        "最優先サポート"
      ],
      buttonText: "Premiumで始める",
      buttonHref: "/register?plan=PREMIUM",
      color: "#a78bfa",
      highlight: false
    }
  ];

  return (
    <div id={id} style={{ 
      padding: "80px 20px", 
      width: "100%", 
      maxWidth: "1200px", 
      margin: "0 auto",
      textAlign: "center"
    }}>
      <h2 style={{ 
        fontSize: "2.5rem", 
        fontWeight: "bold", 
        marginBottom: "20px" 
      }}>
        あなたに合ったプランを。
      </h2>
      <p style={{ color: "#9ca3af", marginBottom: "40px" }}>
        いつでも変更・キャンセル可能です。
      </p>

      {/* Toggle */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "15px", marginBottom: "50px" }}>
        <span style={{ color: interval === "month" ? "white" : "#6b7280", fontWeight: "bold" }}>月払い</span>
        <div 
          onClick={() => setInterval(prev => prev === "month" ? "year" : "month")}
          style={{ 
            width: "56px", 
            height: "32px", 
            background: "#374151", 
            borderRadius: "20px", 
            position: "relative",
            cursor: "pointer",
            transition: "background 0.3s"
          }}
        >
          <div style={{
            width: "26px",
            height: "26px",
            background: "white",
            borderRadius: "50%",
            position: "absolute",
            top: "3px",
            left: interval === "month" ? "3px" : "27px",
            transition: "all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)"
          }} />
        </div>
        <span style={{ color: interval === "year" ? "white" : "#6b7280", fontWeight: "bold" }}>
          年払い <span style={{ color: "#fcd34d", fontSize: "0.9em" }}>(最大50%OFF)</span>
        </span>
      </div>

      {/* Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
        gap: "25px", 
        alignItems: "start",
        marginBottom: "40px" 
      }}>
        {PLANS.map((plan, i) => {
            // Calculate monthly price
            let displayPrice = plan.price;
            let subPrice = "";
            let period = plan.period;
            let comparisonPrice = null;

            if (interval === "year" && plan.name !== "Free") {
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

            // Define description gradient logic
            let descStyle: React.CSSProperties = { 
                color: "#9ca3af", 
                fontSize: "0.9rem", 
                marginBottom: "20px", 
                height: "50px", 
                display: "flex",
                alignItems: "center" 
            };
            
            if(plan.name === "Standard") {
                descStyle = {
                    ...descStyle,
                    background: "linear-gradient(to right, #6ee7b7, #3b82f6)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    WebkitTextFillColor: "transparent",
                    fontWeight: "bold"
                };
            } else if(plan.name === "Premium") {
                descStyle = {
                    ...descStyle,
                    background: "linear-gradient(to right, #a78bfa, #f472b6)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    WebkitTextFillColor: "transparent",
                    fontWeight: "bold"
                };
            }

            // Identify current plan
            const currentPlanName = subscription?.plan || "FREE";
            const isCurrentPlan = plan.name.toUpperCase() === currentPlanName;

            return (
          <div key={i} style={{ 
            background: plan.highlight ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.03)", 
            border: isCurrentPlan ? `2px solid #3b82f6` : (plan.highlight ? `2px solid ${plan.color}` : "1px solid rgba(255, 255, 255, 0.1)"),
            borderRadius: "24px",
            padding: "30px", 
            textAlign: "left",
            position: "relative",
            transform: plan.highlight ? "scale(1.02)" : "scale(1)",
            transition: "transform 0.3s",
            display: "flex",
            flexDirection: "column",
            height: "100%"
          }}>
            {plan.highlight && !isCurrentPlan && (
              <div style={{
                position: "absolute",
                top: "-12px",
                left: "50%",
                transform: "translateX(-50%)",
                background: plan.color,
                color: "black",
                padding: "3px 12px", 
                borderRadius: "12px",
                fontSize: "0.8rem",
                fontWeight: "bold"
              }}>
                おすすめ
              </div>
            )}
             
            {isCurrentPlan && (
              <div style={{
                position: "absolute",
                top: "-12px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "#3b82f6",
                color: "white",
                padding: "3px 12px", 
                borderRadius: "12px",
                fontSize: "0.8rem",
                fontWeight: "bold"
              }}>
                利用中
              </div>
            )}

            <h3 style={{ fontSize: "1.4rem", fontWeight: "bold", marginBottom: "8px" }}>{plan.name}</h3>
            
            <p style={descStyle}>
                {plan.name === "Standard" ? "一番人気。スタバ１杯分/月で制限を気にせず楽し放題。" : plan.description}
            </p>
            
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
                  color: "white",
                  lineHeight: "1.1"
              }}>
                <span style={comparisonPrice ? {
                    background: "linear-gradient(to right, #fbbf24, #f59e0b)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                } : { color: "white" }}>
                    {displayPrice}
                </span>
                <span style={{ fontSize: "0.9rem", color: "#6b7280", marginLeft: "4px" }}>{period}</span>
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

            {isCurrentPlan ? (
                <button className="neo-button" style={{ 
                    width: "100%", 
                    padding: "12px", 
                    borderRadius: "30px", 
                    border: "none",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "rgba(255, 255, 255, 0.5)",
                    fontWeight: "bold",
                    marginBottom: "20px", 
                    cursor: "not-allowed"
                }} disabled>
                    利用中
                </button>
            ) : (
                <Link href={plan.buttonHref} style={{ textDecoration: "none", width: "100%" }}>
                <button className="neo-button" style={{ 
                    width: "100%", 
                    padding: "12px", 
                    borderRadius: "30px", 
                    border: "none",
                    background: plan.highlight ? plan.color : "rgba(255, 255, 255, 0.1)",
                    color: plan.highlight ? "black" : "white",
                    fontWeight: "bold",
                    marginBottom: "20px", 
                    cursor: "pointer",
                    transition: "all 0.2s"
                }}
                onMouseOver={(e) => {
                    if(!plan.highlight) e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                }}
                onMouseOut={(e) => {
                    if(!plan.highlight) e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                }}
                >
                    {plan.buttonText}
                </button>
                </Link>
            )}

            <ul style={{ listStyle: "none", padding: 0, flex: 1 }}>
              {plan.features.map((feature, j) => {
                  let prefix = feature;
                  let highlight = "";
                  let suffix = "";
                  let gradientStyle = {};
                  let hasHighlight = false;

                  if (feature.includes("実質無制限")) {
                      const parts = feature.split("(実質無制限)");
                      prefix = parts[0];
                      highlight = "(実質無制限)";
                      suffix = parts[1] || "";
                      gradientStyle = {
                        background: "linear-gradient(to right, #a78bfa, #f472b6)", 
                        WebkitBackgroundClip: "text", 
                        backgroundClip: "text",
                        color: "transparent",
                        WebkitTextFillColor: "transparent",
                        fontWeight: "bold",
                        marginLeft: "4px",
                        display: "inline-block"
                      };
                      hasHighlight = true;
                  } else if (feature.includes("最高")) {
                      const parts = feature.split("最高");
                      prefix = parts[0];
                      highlight = "最高";
                      suffix = parts[1] || "";
                      gradientStyle = {
                        background: "linear-gradient(to right, #f472b6, #fbbf24)", 
                        WebkitBackgroundClip: "text", 
                        backgroundClip: "text",
                        color: "transparent",
                        WebkitTextFillColor: "transparent",
                        fontWeight: "bold",
                        display: "inline-block"
                      };
                      hasHighlight = true;
                  } else if (plan.name === "Standard") {
                      // Check for Standard features highlights
                      // Previous logic: target numbers.
                      // New logic: target text inside parentheses OR "高め"

                      // First check for parentheses
                      const match = feature.match(/\(([^)]+)\)/); // Matches ( ... )
                      
                      if (match) {
                          // Highlight the content including parens or just content?
                          // User said: "In the parens". Let's highlight the whole ( ... ) block.
                          const target = match[0];
                          const parts = feature.split(target);
                          prefix = parts[0];
                          highlight = target;
                          suffix = parts[1] || ""; // Handle case where parens are at end
                          
                          gradientStyle = {
                              background: "linear-gradient(to right, #6ee7b7, #3b82f6)", 
                              WebkitBackgroundClip: "text", 
                              backgroundClip: "text",
                              color: "transparent",
                              WebkitTextFillColor: "transparent",
                              fontWeight: "bold",
                              display: "inline-block"
                          };
                          hasHighlight = true;
                      } else if (feature.includes("高め")) {
                           // "高め" doesn't have parens, so check explicitly
                          const target = "高め";
                          const parts = feature.split(target);
                          prefix = parts[0];
                          highlight = target;
                          suffix = parts[1] || "";
                          
                          gradientStyle = {
                              background: "linear-gradient(to right, #6ee7b7, #3b82f6)", 
                              WebkitBackgroundClip: "text", 
                              backgroundClip: "text",
                              color: "transparent",
                              WebkitTextFillColor: "transparent",
                              fontWeight: "bold",
                              display: "inline-block"
                          };
                          hasHighlight = true;
                      }
                  }

                  return (
                    <li key={j} style={{ display: "flex", alignItems: "start", gap: "10px", marginBottom: "15px", color: "#e5e7eb", fontSize: "0.95rem" }}>
                      <Check size={18} color={plan.color} style={{ marginTop: "3px", flexShrink: 0 }} />
                      <span>
                          {hasHighlight ? (
                            <>
                                {prefix}
                                <span style={gradientStyle}>{highlight}</span>
                                {suffix}
                            </>
                          ) : (
                              feature
                          )}
                      </span>
                    </li>
                  )
              })}
            </ul>
             
            {
                /* Bottom monthly calculation removed as requested */
                /* {(plan.name === "Standard" || plan.name === "Premium") && interval === "year" && (
                    <div style={{ marginTop: "20px", fontSize: "0.8rem", color: "#fcd34d", textAlign: "center" }}>
                        月額換算: ¥{Math.floor(parseInt(plan.price.replace(/[^\d]/g, "")) / 12).toLocaleString()}
                    </div>
                )} */
            }

            {plan.name === "Premium" && (
                <div style={{ marginTop: "20px", paddingTop: "15px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "0.75rem", color: "#9ca3af", lineHeight: "1.4" }}>
                    ※ サーバー保護のためチャット、音声解析、資料保存に上限（実質無制限）を設けています。
                </div>
            )}
          </div>
        )})}
      </div>
    </div>
  );
}
