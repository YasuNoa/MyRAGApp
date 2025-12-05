import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";

// GET: Fetch messages for a specific thread
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: threadId } = await params;

    try {
        // Verify ownership
        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
        });

        if (!thread || thread.userId !== session.user.id) {
            return NextResponse.json({ error: "Thread not found" }, { status: 404 });
        }

        const messages = await prisma.message.findMany({
            where: { threadId },
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json({ messages });
    } catch (error) {
        console.error("Failed to fetch thread messages:", error);
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
}

// DELETE: Delete a thread
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: threadId } = await params;

    try {
        // Verify ownership
        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
        });

        if (!thread || thread.userId !== session.user.id) {
            return NextResponse.json({ error: "Thread not found" }, { status: 404 });
        }

        await prisma.thread.delete({
            where: { id: threadId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete thread:", error);
        return NextResponse.json({ error: "Failed to delete thread" }, { status: 500 });
    }
}

// PATCH: Update thread title
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: threadId } = await params;
    const { title } = await req.json();

    if (!title) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    try {
        // Verify ownership
        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
        });

        if (!thread || thread.userId !== session.user.id) {
            return NextResponse.json({ error: "Thread not found" }, { status: 404 });
        }

        await prisma.thread.update({
            where: { id: threadId },
            data: { title },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update thread:", error);
        return NextResponse.json({ error: "Failed to update thread" }, { status: 500 });
    }
}
