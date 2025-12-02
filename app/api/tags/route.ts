import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Fetch recent documents to get tags
        // We fetch more than 10 because some might have no tags or duplicate tags
        const docs = await prisma.document.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 50,
            select: {
                tags: true,
            },
        });

        // Flatten tags, remove duplicates, and take top 10
        const allTags = docs.flatMap((doc) => doc.tags);
        // Use Set to remove duplicates, preserving order (most recent first because of doc order)
        const uniqueTags = Array.from(new Set(allTags));
        const recentTags = uniqueTags.slice(0, 10);

        return NextResponse.json({ tags: recentTags });
    } catch (error) {
        console.error("[TAGS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
