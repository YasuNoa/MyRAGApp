import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, MessageSquare, Smartphone, Zap, Shield, Brain, Mic, Search, Folder } from "lucide-react";
import PlansSection from "./PlansSection";

export default function LandingPage() {
  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column",
      backgroundColor: "#000000", // Deep black background
      color: "#ffffff",
      fontFamily: "'Inter', sans-serif",
      overflowX: "hidden"
    }}>
      {/* Background Gradients */}
      <div style={{
        position: "fixed",
        top: "-20%",
        left: "-10%",
        width: "60%",
        height: "60%",
        background: "radial-gradient(circle, rgba(66, 133, 244, 0.15) 0%, rgba(0,0,0,0) 70%)",
        filter: "blur(80px)",
        zIndex: 0,
        pointerEvents: "none"
      }}></div>
      <div style={{
        position: "fixed",
        bottom: "-20%",
        right: "-10%",
        width: "60%",
        height: "60%",
        background: "radial-gradient(circle, rgba(197, 138, 249, 0.15) 0%, rgba(0,0,0,0) 70%)",
        filter: "blur(80px)",
        zIndex: 0,
        pointerEvents: "none"
      }}></div>

      {/* Header */}
      <header style={{ 
        padding: "20px 40px", 
        display: "grid", 
        gridTemplateColumns: "1fr auto 1fr", // 3 columns: Left, Center, Right
        alignItems: "center",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        backgroundColor: "rgba(0, 0, 0, 0.5)"
      }}>
        {/* Left: Logo */}
        <div style={{ fontSize: "24px", fontWeight: "bold", background: "linear-gradient(to right, #8ab4f8, #c58af9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          じぶんAI
        </div>

        {/* Center: Navigation */}
        <nav style={{ display: "flex", gap: "10px" }} className="hidden md:flex">
          {[
            { href: "#features", label: "機能" },
            { href: "#plan", label: "料金プラン" },
            { href: "#how-to-use", label: "使い方" },
            { href: "#use-cases", label: "活用シーン" }
          ].map((link) => (
            <a 
              key={link.href}
              href={link.href} 
              style={{ 
                color: "#e5e7eb", 
                textDecoration: "none", 
                fontSize: "14px", 
                fontWeight: "500", 
                padding: "8px 16px",
                borderRadius: "20px",
                transition: "all 0.2s"
              }} 
              className="hover:bg-white/10 hover:text-white"
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.color = "white";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#e5e7eb";
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right: Buttons */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <button className="neo-button" style={{ 
              padding: "8px 20px", 
              fontSize: "14px",
              background: "white",
              color: "black",
              border: "none",
              fontWeight: "bold"
            }}>
              ログイン
            </button>
          </Link>
          <Link href="/register" style={{ textDecoration: "none" }}>
            <button className="neo-button secondary" style={{ 
              padding: "8px 20px", 
              fontSize: "14px",
              background: "linear-gradient(135deg, #0061ff, #60efff)",
              color: "white",
              border: "none",
              fontWeight: "bold"
            }}>
              新規登録
            </button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        padding: "80px 20px",
        textAlign: "center",
        zIndex: 1,
        position: "relative"
      }}>
        <div style={{
          display: "inline-block",
          padding: "6px 16px",
          borderRadius: "20px",
          background: "rgba(66, 133, 244, 0.1)",
          border: "1px solid rgba(66, 133, 244, 0.3)",
          color: "#8ab4f8",
          fontSize: "14px",
          marginBottom: "30px",
          fontWeight: "500"
        }}>
          ✨ じぶんAIはあなた専用にカスタマイズされたパートナーになります。
        </div>

        <h1 style={{ 
          fontSize: "clamp(2.5rem, 5vw, 4.5rem)", 
          marginBottom: "30px", 
          maxWidth: "900px",
          lineHeight: "1.1",
          fontWeight: "800",
          letterSpacing: "-0.02em"
        }}>
          大丈夫、<br/>
          <span style={{ 
            background: "linear-gradient(to right, #8ab4f8, #c58af9)", 
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent" 
          }}>授業中寝てても。</span>
        </h1>
        
        <p style={{ 
          fontSize: "clamp(1rem, 2vw, 1.25rem)", 
          color: "#9ca3af", 
          maxWidth: "700px", 
          marginBottom: "50px",
          lineHeight: "1.8"
        }}>
          授業ノート、資料、録音データ。あらゆる情報を「じぶんAI」に預ければ、<br className="hidden md:block"/>
         授業やミィーティングの内容を、全て再現できます。
        </p>

        <Link href="/register" style={{ textDecoration: "none" }}>
          <button className="neo-button" style={{ 
            padding: "18px 48px", 
            fontSize: "18px", 
            display: "flex", 
            alignItems: "center", 
            gap: "12px",
            background: "linear-gradient(135deg, #8AB4F8, #E9D5FF)", // Lighter gradient
            color: "white",
            border: "none",
            borderRadius: "30px",
            fontWeight: "bold",
            boxShadow: "0 10px 30px rgba(66, 133, 244, 0.3)",
            transition: "transform 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            無料で始める <ArrowRight size={20} />
          </button>
        </Link>

        {/* Feature Cards */}
        <div id="features" style={{ 
          marginTop: "120px", 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
          gap: "30px",
          width: "100%",
          maxWidth: "1200px",
          padding: "0 20px",
          scrollMarginTop: "100px" // Adjust for sticky header
        }}>
          {[
            { 
              icon: <FileText size={32} color="#8ab4f8" />, 
              title: "授業ノート", 
              desc: "授業のメモや板書を、きれいに整理して保存。もうノートを無くすことはありません。" 
            },
            { 
              icon: <Mic size={32} color="#ff8a80" />, 
              title: "音声記録＆要約", 
              desc: "先生の話を録音するだけ。AIが自動で文字起こしして、大事なポイントを要約します。" 
            },
            { 
              icon: <MessageSquare size={32} color="#c58af9" />, 
              title: "AIチャット", 
              desc: "「あの時なんて言ってた？」と聞くだけ。AIがあなたの過去の全記録から答えを見つけ出します。" 
            },
            { 
              icon: <Search size={32} color="#fcd34d" />, 
              title: "ネット検索連携", 
              desc: "教科書に載っていない最新情報も、AIがインターネットから調べて補足説明してくれます。" 
            },
            { 
              icon: <Folder size={32} color="#4ade80" />, 
              title: "資料一括管理", 
              desc: "配布されたプリントやPDFもまとめて管理。画像の中の文字まで検索できます。" 
            },
            { 
              icon: <Smartphone size={32} color="#a78bfa" />, 
              title: "どこでも復習", 
              desc: "スマホやLINEからいつでもアクセス。通学時間や寝る前のスキマ時間を有効活用できます。" 
            }
          ].map((feature, i) => (
            <div key={i} style={{ 
              textAlign: "left", 
              padding: "40px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.2)", // Increased visibility
              borderRadius: "24px",
              backdropFilter: "blur(10px)",
              transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)", // Smoother transition
              cursor: "pointer", // Indicate interactivity
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-10px)"; // More movement
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.6)"; // Stronger white border
              e.currentTarget.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.4)"; // Deep shadow for floating effect
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
              e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
            }}
            // Add touch events for mobile responsiveness if needed, though hover usually covers tap on many devices
            onTouchStart={(e) => {
               e.currentTarget.style.transform = "scale(0.98)";
            }}
            onTouchEnd={(e) => {
               e.currentTarget.style.transform = "scale(1)";
            }}
            >
              <div style={{ 
                width: "60px", 
                height: "60px", 
                borderRadius: "16px", 
                background: "rgba(255, 255, 255, 0.05)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                marginBottom: "20px"
              }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: "1.4rem", marginBottom: "15px", fontWeight: "bold" }}>{feature.title}</h3>
              <p style={{ color: "#9ca3af", fontSize: "1rem", lineHeight: "1.6" }}>{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* How to Use Section */}
        <div id="how-to-use" style={{ marginTop: "150px", width: "100%", maxWidth: "1000px", scrollMarginTop: "100px" }}>
          <h2 style={{ fontSize: "2.5rem", marginBottom: "60px", fontWeight: "bold" }}>
            使い方はとてもシンプル
          </h2>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
            gap: "40px",
            textAlign: "center"
          }}>
            {[
              { step: "01", title: "資料をアップロード", desc: "PDF、画像、音声など、学習させたいデータをドラッグ＆ドロップ。" },
              { step: "02", title: "AIに質問", desc: "「この資料の要点は？」「テストに出そうな場所は？」など、自由に質問。" },
              { step: "03", title: "理解を深める", desc: "AIがあなたの知識ベースから的確に回答。学習や仕事が加速します。" }
            ].map((item, i) => (
              <div key={i} style={{ position: "relative" }}>
                <div style={{ 
                  fontSize: "4rem", 
                  fontWeight: "900", 
                  color: "rgba(255, 255, 255, 0.05)", 
                  position: "absolute", 
                  top: "-30px", 
                  left: "50%", 
                  transform: "translateX(-50%)",
                  zIndex: 0
                }}>
                  {item.step}
                </div>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "15px" }}>{item.title}</h3>
                  <p style={{ color: "#9ca3af", lineHeight: "1.6" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plans Section */}
        <div style={{ marginTop: "150px", width: "100%" }}>
            <PlansSection id="plan" />
        </div>

        {/* Use Cases */}
        <div id="use-cases" style={{ marginTop: "150px", width: "100%", maxWidth: "1000px", scrollMarginTop: "100px" }}>
          <h2 style={{ fontSize: "2.5rem", marginBottom: "60px", fontWeight: "bold" }}>
            こんなシーンで活躍します
          </h2>
          <div style={{ display: "grid", gap: "20px" }}>
            {[
              { title: "テスト勉強を効率化", desc: "「先生が『重要』と言っていた箇所は？」と聞くだけで、録音データから該当箇所をリストアップ。" },
              { title: "資料作成の時間を短縮", desc: "過去の膨大な資料から必要な情報を一瞬で抽出。リサーチ時間を大幅に削減します。" },
              { title: "アイデア出しの壁打ち", desc: "自分の知識ベースを元に、AIと対話しながら新しいアイデアを広げることができます。" }
            ].map((useCase, i) => (
              <div key={i} style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "20px",
                padding: "30px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "16px"
              }}>
                <CheckCircle2 size={24} color="#8ab4f8" style={{ flexShrink: 0 }} />
                <div style={{ textAlign: "left" }}>
                  <h4 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "5px" }}>{useCase.title}</h4>
                  <p style={{ color: "#9ca3af", margin: 0 }}>{useCase.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div style={{ 
          marginTop: "150px", 
          marginBottom: "50px",
          padding: "60px",
          background: "linear-gradient(135deg, rgba(66, 133, 244, 0.1), rgba(197, 138, 249, 0.1))",
          borderRadius: "30px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          width: "100%",
          maxWidth: "800px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <h2 style={{ fontSize: "2rem", marginBottom: "20px", fontWeight: "bold" }}>
            あなたの知識を、AIにインストールしよう。
          </h2>
          <p style={{ color: "#9ca3af", marginBottom: "40px", fontSize: "1.1rem" }}>
            まずは無料で、その便利さを体験してください。
          </p>
          <Link href="/register" style={{ textDecoration: "none" }}>
            <button className="neo-button" style={{ 
              padding: "16px 40px", 
              fontSize: "16px", 
              background: "white",
              color: "black",
              border: "none",
              borderRadius: "30px",
              fontWeight: "bold",
              cursor: "pointer"
            }}>
              今すぐ無料で始める
            </button>
          </Link>
        </div>

      </main>

      {/* Footer */}
      <footer style={{ 
        padding: "40px 20px", 
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        textAlign: "center",
        color: "#6b7280",
        fontSize: "12px",
        zIndex: 1,
        backgroundColor: "black"
      }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "30px", marginBottom: "20px" }}>
          <Link href="/terms" style={{ color: "inherit", textDecoration: "none" }}>利用規約</Link>
          <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>プライバシーポリシー</Link>
        </div>
        <div>© 2025 じぶんAI</div>
      </footer>

    </div>
  );
}
