
import { REFERRAL_CAMPAIGN_END_DATE } from "@/src/lib/constants";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

// 招待リンクLanding Page
// URL: /invite/[referrerId]
// 役割:
// 1. キャンペーン有効期限のチェック
// 2. ブラウザ経由の場合、Cookie/LocalStorageに招待IDを保存させる（ためのクライアントコンポーネントへの誘導）
// 3. アプリストアへの誘導 または Web版ログインへの誘導

export default async function InvitePage({ params }: { params: Promise<{ referrerId: string }> }) {
    const { referrerId } = await params;

    // キャンペーン期限切れチェック
    const now = new Date();
    if (now > REFERRAL_CAMPAIGN_END_DATE) {
        return (
            <div style={{ padding: "40px", textAlign: "center", color: "white" }}>
                <h1>キャンペーンは終了しました</h1>
                <p>残念ながら、この招待リンクの有効期限は切れています。</p>
                <Link href="/" style={{ textDecoration: "underline", color: "#88ccff" }}>トップページへ戻る</Link>
            </div>
        );
    }
    
    // Server Component上でCookieをセットするのは難しい（レスポンスヘッダを直接いじれない）ため、
    // "use client" なコンポーネントか、Middlewareで処理するのが一般的ですが、
    // ここでは簡易的に「招待ID保存用API」を叩くスクリプトを含むクライアントコンポーネントを表示するか、
    // クエリパラメータ付きで登録ページにリダイレクトするのが定石です。
    
    // 今回はシンプルに:
    // 「アプリをお持ちの方はこちら（Universal Linkで起動失敗した人向け）」と
    // 「Webで始める（登録ページへ招待ID付きで遷移）」を表示します。

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-900 to-black text-white">
            <div className="max-w-md w-full bg-gray-800 p-8 rounded-2xl shadow-xl text-center border border-gray-700">
                <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-green-400 uppercase bg-green-400/10 rounded-full">
                    招待キャンペーン中
                </span>
                <h1 className="text-2xl font-bold mb-4">
                     じぶんAIへようこそ！
                </h1>
                <p className="text-gray-400 mb-8">
                    あなたへの招待が届いています。<br/>
                    今すぐ始めると、<strong>1ヶ月無料特典</strong>を受け取れます。
                </p>

                {/* iOSアプリ起動ボタン (Universal Linkが効かなかった場合の手動起動用) */}
                {/* 実際はApp Storeへのリンクなどが望ましい */}
                <a 
                    href={`https://apps.apple.com/app/idYOUR_APP_ID`} // TODO: 実際のApp Store URLを入れる
                    className="block w-full py-3 mb-4 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
                >
                    App Storeでアプリを入れる
                </a>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-gray-800 text-gray-400">または</span>
                    </div>
                </div>

                {/* Web版登録へ誘導 (クエリパラメータでreferrerIdを渡す) */}
                {/* 登録画面側でこのクエリパラメータを見てCookie等に保存する実装が必要 */}
                <Link 
                    href={`/login?referrer=${referrerId}`}
                    className="block w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors"
                >
                    Webで始める
                </Link>

                <p className="mt-6 text-xs text-gray-500">
                    キャンペーン期限: {REFERRAL_CAMPAIGN_END_DATE.toLocaleDateString()} まで
                </p>
            </div>
        </div>
    );
}
