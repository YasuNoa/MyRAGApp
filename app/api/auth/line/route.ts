import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { lineAccessToken } = body;

        if (!lineAccessToken) {
            return NextResponse.json({ error: "Access token is required" }, { status: 400 });
        }

        // Proxy to Python Backend
        // Default to localhost:8000 if BACKEND_URL not set
        const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
        const proxyUrl = `${backendUrl}/api/auth/line`;

        console.log(`[Next.js Proxy] Forwarding LINE auth to: ${proxyUrl}`);

        const response = await fetch(proxyUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                lineAccessToken: lineAccessToken
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Next.js Proxy] Backend Error: ${response.status} - ${errorText}`);
            try {
                const errorJson = JSON.parse(errorText);
                return NextResponse.json(errorJson, { status: response.status });
            } catch (e) {
                return NextResponse.json({ error: "Backend error", details: errorText }, { status: response.status });
            }
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (e: any) {
        console.error("[Next.js Proxy] Internal Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
