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

        // Check Chat Limits -> Delegated to Python Backend
        // If limit exceeded, Python will return 403.

        // リクエストボディ取得
        const { query, tags, threadId } = await req.json();
        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        console.log(`[検索中] 質問: ${query}, タグ: ${tags}, ThreadID: ${threadId}`);

        // 0. Thread Handling
        let currentThreadId = threadId;
        if (!currentThreadId) {
            // Create new thread
            // Generate title from query (simple truncation for now, could use AI later)
            const title = query.length > 30 ? query.substring(0, 30) + "..." : query;
            const thread = await prisma.thread.create({
                data: {
                    userId,
                    title,
                },
            });
            currentThreadId = thread.id;
        } else {
            // Verify thread ownership and update timestamp
            const thread = await prisma.thread.findUnique({
                where: { id: currentThreadId },
            });
            if (!thread || thread.userId !== userId) {
                // If invalid thread, create a new one (or error? Creating new is safer for UX)
                const title = query.length > 30 ? query.substring(0, 30) + "..." : query;
                const newThread = await prisma.thread.create({
                    data: {
                        userId,
                        title,
                    },
                });
                currentThreadId = newThread.id;
            } else {
                await prisma.thread.update({
                    where: { id: currentThreadId },
                    data: { updatedAt: new Date() },
                });
            }
        }

        // 1. ユーザーのメッセージをDBに保存
        await prisma.message.create({
            data: {
                content: query,
                role: "user",
                userId: userId,
                threadId: currentThreadId,
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
                threadId: currentThreadId,
            },
        });

        console.log(`[回答] ${answer}`);
        return NextResponse.json({ answer, sources, threadId: currentThreadId });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: "Failed to get answer", details: e.message }, { status: 500 });
    }
}


