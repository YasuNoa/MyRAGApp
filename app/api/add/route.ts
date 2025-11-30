import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { KnowledgeService } from "@/src/services/knowledge";

export async function POST(req: NextRequest) {
    try {
        // リクエストボディ取得
        const { text, tags } = await req.json();
        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        console.log(`[保存中] テキスト: ${text}, タグ: ${tags}`);

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // KnowledgeService.addTextKnowledge handles DB creation and Python backend call
        const { id } = await KnowledgeService.addTextKnowledge(session.user.id, text, "manual", tags || []);

        console.log(`[完了] ID: ${id} で保存しました。`);
        return NextResponse.json({ success: true, id });
    } catch (e) {
        console.error(e);
        return NextResponse.json({
            error: "Failed to add document",
            details: e instanceof Error ? e.message : String(e)
        }, { status: 500 });
    }
}
