import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/src/lib/auth-check";
import { prisma } from "@/src/lib/prisma";
import { PythonBackendService } from "@/src/services/python-backend";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    const authResult = await verifyAuth(req);

    if (!authResult || !authResult.uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authResult.uid; // This is the CUID

    try {
        const body = await req.json();
        const { transcript, summary, tags, title } = body;

        if (!transcript) {
            return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
        }

        console.log(`[Voice Save] Proxying save request for user: ${userId}`);

        // Forward to Python Backend
        const result = await PythonBackendService.saveVoiceMemo({
            userId: userId,
            transcript: transcript,
            summary: summary || "",
            title: title || `Voice Memo ${new Date().toLocaleString()}`,
            tags: tags || []
        });

        return NextResponse.json({ success: true, id: result.id, status: result.status });

    } catch (error: any) {
        console.error("[Voice Save] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
