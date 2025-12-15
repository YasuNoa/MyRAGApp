import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/src/lib/auth-check";
import { listDriveFiles } from "@/src/lib/google-drive";
import { prisma } from "@/src/lib/prisma";

export async function GET(req: NextRequest) {
    const authResult = await verifyAuth(req);

    if (!authResult || !authResult.uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Retrieve Google Access Token from Account table
    const account = await prisma.account.findFirst({
        where: {
            userId: authResult.uid,
            provider: "google" // Assuming we store it as 'google'
        },
        select: { access_token: true, refresh_token: true }
    });

    const accessToken = account?.access_token;

    if (!accessToken) {
        return NextResponse.json(
            { error: "No access token found. Please sign in with Google or Link Google Account." },
            { status: 401 }
        );
    }

    try {
        const files = await listDriveFiles(accessToken);
        return NextResponse.json({ files });
    } catch (error) {
        console.error("API Error listing Drive files:", error);
        return NextResponse.json(
            { error: "Failed to list files from Google Drive" },
            { status: 500 }
        );
    }
}
