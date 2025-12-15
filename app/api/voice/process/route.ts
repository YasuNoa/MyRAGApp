import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/src/lib/auth-check";
import { prisma } from "@/src/lib/prisma";
import { PythonBackendService } from "@/src/services/python-backend";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    const user = await verifyAuth(req);

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        console.log(`[Voice] Processing file: ${file.name}`);

        // 1. Send to Python Backend (Analyze Only)
        // We generate a temporary fileId for tracking, but it won't be saved yet.
        const fileId = uuidv4();

        const result = await PythonBackendService.processVoiceMemo(file, {
            userId: user.uid,
            fileId: fileId,
            tags: ["Voice Memo"]
        });

        return NextResponse.json({ success: true, result: result });

    } catch (error: any) {
        console.error("[Voice] Error:", error);
        // If failed, maybe delete the document? Or keep it as error?
        // For now, keep it.
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
