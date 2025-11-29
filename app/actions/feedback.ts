"use server";

import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";
import { revalidatePath } from "next/cache";

export async function submitFeedback(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "ログインしてください" };
    }

    const content = formData.get("content") as string;

    if (!content || content.trim() === "") {
        return { error: "フィードバック内容を入力してください" };
    }

    try {
        await prisma.feedback.create({
            data: {
                userId: session.user.id,
                content: content,
            },
        });

        return { success: "フィードバックを送信しました。ありがとうございます！" };
    } catch (error) {
        console.error("Feedback submission error:", error);
        return { error: "送信中にエラーが発生しました" };
    }
}
