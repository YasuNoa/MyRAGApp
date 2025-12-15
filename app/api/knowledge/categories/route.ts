import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/src/lib/auth-check";
import { prisma } from "@/src/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch all documents with tags
        const documents = await prisma.document.findMany({
            where: {
                userId: user.uid,
            },
            select: {
                tags: true,
            },
        });

        // Flatten and deduplicate tags
        const allTags = documents.flatMap((doc) => doc.tags);
        const uniqueTags = Array.from(new Set(allTags)).filter((t) => t && t.trim() !== "");

        return NextResponse.json({ tags: uniqueTags });
    } catch (error) {
        console.error("Error fetching categories:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
