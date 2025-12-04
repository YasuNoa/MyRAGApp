import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, MessageSquare, Smartphone, Zap, Shield, Brain } from "lucide-react";

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
          <Link href="/register" style={{ textDecoration: "none" }}>
            <button className="neo-button secondary" style={{ 
              padding: "8px 20px", 
              fontSize: "14px",
              background: "rgba(255, 255, 255, 0.1)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.2)"
            }}>
              新規登録
            </button>
          </Link>
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
          ✨ あなただけの専属AIパートナー
        </div>

        <h1 style={{ 
          fontSize: "clamp(2.5rem, 5vw, 4.5rem)", 
          marginBottom: "30px", 
          maxWidth: "900px",
          lineHeight: "1.1",
          fontWeight: "800",
          letterSpacing: "-0.02em"
        }}>
          私だけのAIが、<br/>
          <span style={{ 
            background: "linear-gradient(to right, #8ab4f8, #c58af9)", 
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent" 
          }}>すべての知識を整理する。</span>
        </h1>
        
        <p style={{ 
          fontSize: "clamp(1rem, 2vw, 1.25rem)", 
          color: "#9ca3af", 
          maxWidth: "700px", 
          marginBottom: "50px",
          lineHeight: "1.8"
        }}>
          授業ノート、資料、録音データ。あらゆる情報を「じぶんAI」に預ければ、<br className="hidden md:block"/>
          いつでも瞬時に引き出せます。もう、情報の海で迷うことはありません。
        </p>

        <Link href="/register" style={{ textDecoration: "none" }}>
          <button className="neo-button" style={{ 
            padding: "18px 48px", 
            fontSize: "18px", 
            display: "flex", 
            alignItems: "center", 
            gap: "12px",
            background: "linear-gradient(135deg, #4285F4, #C58AF9)",
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
              title: "あらゆるデータを知識に", 
              desc: "PDF、画像、音声データ。形式を問わずアップロードするだけで、AIが自動で学習・整理します。" 
            },
            { 
              icon: <Brain size={32} color="#c58af9" />, 
              title: "文脈を理解するAI", 
              desc: "単なるキーワード検索ではありません。あなたの意図を深く理解し、膨大な知識から最適な回答を生成します。" 
            },
            { 
              icon: <Smartphone size={32} color="#06C755" />, 
              title: "LINEでいつでもどこでも", 
              desc: "使い慣れたLINEアプリから、いつでも自分の「第二の脳」にアクセス。PCを開く必要さえありません。" 
            }
          ].map((feature, i) => (
            <div key={i} style={{ 
              textAlign: "left", 
              padding: "40px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "24px",
              backdropFilter: "blur(10px)",
              transition: "transform 0.3s, background 0.3s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
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
      {/* Temporary Legal Links for Google Verification */}
      <div style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.8)",
        padding: "10px 15px",
        borderRadius: "8px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        display: "flex",
        gap: "15px",
        fontSize: "12px",
        backdropFilter: "blur(4px)"
      }}>
        <Link href="/terms" style={{ color: "#e5e7eb", textDecoration: "none" }}>利用規約</Link>
        <Link href="/privacy" style={{ color: "#e5e7eb", textDecoration: "none" }}>プライバシーポリシー</Link>
      </div>
    </div>
  );
}
