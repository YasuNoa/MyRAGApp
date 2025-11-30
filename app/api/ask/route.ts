import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        // 認証チェック
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;

        // リクエストボディ取得
        const { query, tags } = await req.json();
        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        console.log(`[検索中] 質問: ${query}, タグ: ${tags}`);

        // 1. ユーザーのメッセージをDBに保存
        await prisma.message.create({
            data: {
                content: query,
                role: "user",
                userId: userId,
            },
        });

        // 2. Pythonバックエンドに問い合わせ
        const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://backend:8000";
        const response = await fetch(`${pythonUrl}/query`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: query,
                userId: userId,
                tags: tags || [], // Pass tags to backend
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Ask] Python Backend Error: ${response.status} ${errorText}`);
            throw new Error(`Python Backend failed: ${errorText}`);
        }

        const result = await response.json();
        const answer = result.answer;
        const sources = result.sources;

        // 3. AIの回答をDBに保存
        await prisma.message.create({
            data: {
                content: answer,
                role: "assistant",
                userId: userId,
            },
        });

        console.log(`[回答] ${answer}`);
        return NextResponse.json({ answer, sources });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: "Failed to get answer", details: e.message }, { status: 500 });
    }
}
