import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/src/lib/auth-check";
import { prisma } from "@/src/lib/prisma";

export async function GET(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const documents = await prisma.document.findMany({
            where: {
                userId: user.uid,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({ documents });
    } catch (error) {
        console.error("Error fetching documents:", error);
        return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }
}
