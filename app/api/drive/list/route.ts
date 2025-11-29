import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listDriveFiles } from "@/src/lib/google-drive";

export async function GET() {
    const session = await auth();

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // @ts-ignore
    const accessToken = session.accessToken as string;

    if (!accessToken) {
        return NextResponse.json(
            { error: "No access token found. Please sign in with Google." },
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
