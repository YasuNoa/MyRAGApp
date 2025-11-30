import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch all documents with tags
        const documents = await prisma.document.findMany({
            where: {
                userId: session.user.id,
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
