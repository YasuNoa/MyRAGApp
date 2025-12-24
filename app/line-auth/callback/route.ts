import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    // URLクエリパラメータから認証コード等を取得
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    // iOSアプリへのリダイレクトURL (URL Scheme)
    // バックエンド側 (Python) と同じロジックです。
    // スキーム: com.yasu.jibunAI-ios://line-callback

    if (!code || !state) {
        return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
    }

    const iosSchemeUrl = `com.yasu.jibunAI-ios://line-callback?code=${code}&state=${state}`;

    // リダイレクト実行
    return NextResponse.redirect(iosSchemeUrl);
}
