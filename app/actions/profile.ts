"use server";

import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "ログインしてください" };
    }

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    const aiName = formData.get("aiName") as string;

    if (!email && !password && !name && !aiName) {
        return { error: "変更内容を入力してください" };
    }

    const updateData: any = {};

    if (name) {
        updateData.name = name;
    }

    if (aiName) {
        // Fetch current metadata to merge
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { metadata: true }
        });

        const currentMetadata = (currentUser?.metadata as Record<string, any>) || {};
        updateData.metadata = {
            ...currentMetadata,
            aiName: aiName
        };
    }

    if (email) {
        // Check if user already has an email
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (currentUser?.email) {
            // If email is already set, do not allow update
            // (Unless we implement a specific email change flow later)
        } else {
            // Check if email is already taken by another user
            const existingUser = await prisma.user.findUnique({
                where: { email },
            });
            if (existingUser && existingUser.id !== session.user.id) {
                return { error: "このメールアドレスは既に使用されています" };
            }
            updateData.email = email;
        }
    }

    if (password) {
        if (password.length < 6) {
            return { error: "パスワードは6文字以上で入力してください" };
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        updateData.password = hashedPassword;
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
        });
        revalidatePath("/profile");
        let successMessage = "プロフィールを更新しました";
        if (updateData.name) {
            successMessage = "名前を更新しました";
        } else if (updateData.password && !updateData.email) {
            successMessage = "パスワードを更新しました";
        } else if (updateData.email && !updateData.password) {
            successMessage = "メールアドレスを更新しました";
        }

        return { success: successMessage };
    } catch (error) {
        console.error("Profile update error:", error);
        return { error: "エラーが発生しました" };
    }
}
