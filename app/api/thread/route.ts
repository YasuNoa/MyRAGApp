import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/src/lib/auth-check";
import { prisma } from "@/src/lib/prisma";

// GET: List threads for the current user
export async function GET(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const threads = await prisma.thread.findMany({
            where: { userId: user.uid },
            orderBy: { updatedAt: "desc" },
            take: 50, // Limit to recent 50 threads
        });

        return NextResponse.json({ threads });
    } catch (error) {
        console.error("Failed to fetch threads:", error);
        return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
    }
}
