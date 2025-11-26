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

    if (!email && !password) {
        return { error: "変更内容を入力してください" };
    }

    const updateData: any = {};

    if (email) {
        // Check if email is already taken by another user
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser && existingUser.id !== session.user.id) {
            return { error: "このメールアドレスは既に使用されています" };
        }
        updateData.email = email;
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
        return { success: "プロフィールを更新しました" };
    } catch (error) {
        console.error("Profile update error:", error);
        return { error: "エラーが発生しました" };
    }
}
