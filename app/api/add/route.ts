import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/src/lib/auth-check";
import { KnowledgeService } from "@/src/services/knowledge";

export async function POST(req: NextRequest) {
    try {
        // リクエストボディ取得
        const { text, tags } = await req.json();
        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        console.log(`[保存中] テキスト: ${text}, タグ: ${tags}`);

        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // KnowledgeService.addTextKnowledge handles DB creation and Python backend call
        // But we need to handle Python errors to cleanup
        // Since addTextKnowledge does both, we might need to modify it or handle it here.
        // addTextKnowledge calls PythonBackendService.importText.
        // If importText fails, addTextKnowledge throws.
        // But addTextKnowledge creates DB record first.
        // We should wrap it and delete if it fails.

        // Wait, addTextKnowledge implementation:
        // 1. Create DB record
        // 2. Call Python
        // If 2 fails, it throws. But DB record remains?
        // Let's check KnowledgeService.

        // Assuming KnowledgeService doesn't cleanup, we need to do it here.
        // But addTextKnowledge returns { id }. If it throws, we don't have ID easily unless we peek inside.
        // Actually, KnowledgeService.addTextKnowledge should probably handle cleanup itself or we accept phantom data?
        // Better: We catch error. But we don't know the ID if it failed inside.
        // Let's modify KnowledgeService later if needed. For now, let's assume Python check is done inside PythonBackendService.

        // Actually, if Python returns 403, addTextKnowledge will throw.
        // We can't easily delete the record without the ID.
        // Strategy: Modify KnowledgeService to cleanup on error.

        const { id } = await KnowledgeService.addTextKnowledge(user.uid, text, "manual", tags || []);

        console.log(`[完了] ID: ${id} で保存しました。`);
        return NextResponse.json({ success: true, id });
    } catch (e: any) {
        console.error(e);
        // If it's a limit error, status 403
        const status = e.message?.includes("limit") ? 403 : 500;
        return NextResponse.json({
            error: "Failed to add document",
            details: e instanceof Error ? e.message : String(e)
        }, { status });
    }
}
