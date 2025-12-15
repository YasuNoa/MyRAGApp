import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/src/lib/auth-check";

export async function POST(req: NextRequest) {
    try {
        // 1. Auth Check
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = user.uid;

        // 2. Parse Request
        const { query, tags, threadId } = await req.json();
        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        console.log(`[Ask Proxy] Forwarding to Python: ${query}, Thread: ${threadId}`);

        // 3. Forward to Python Backend
        // We do NOT fetch plan here anymore. Backend handles it (defaults to checking DB).
        const pythonUrl = process.env.PYTHON_BACKEND_URL || "http://backend:8000";
        const response = await fetch(`${pythonUrl}/ask`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query,
                userId,
                threadId,
                tags: tags || [],
                // userPlan is omitted, backend handles it
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Ask Proxy] Backend Error: ${response.status} ${errorText}`);
            try {
                const errorJson = JSON.parse(errorText);
                return NextResponse.json(errorJson, { status: response.status });
            } catch {
                return NextResponse.json({ error: "Backend failed", details: errorText }, { status: response.status });
            }
        }

        const result = await response.json();
        return NextResponse.json(result);

    } catch (e: any) {
        console.error("[Ask Proxy] Error:", e);
        return NextResponse.json({ error: "Internal Server Error", details: e.message }, { status: 500 });
    }
}


