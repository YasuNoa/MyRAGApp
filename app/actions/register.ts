"use server";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function registerUser(formData: FormData) {
    const name = formData.get("name") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!name || !phoneNumber || !email || !password) {
        return { error: "全ての項目を入力してください" };
    }

    try {
        // ユーザーの重複チェック (電話番号)
        const existingUserByPhone = await prisma.user.findUnique({
            where: { phoneNumber },
        });

        if (existingUserByPhone) {
            return { error: "この電話番号は既に登録されています" };
        }

        // ユーザーの重複チェック (メールアドレス)
        const existingUserByEmail = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUserByEmail) {
            return { error: "このメールアドレスは既に登録されています" };
        }

        // パスワードのハッシュ化
        const hashedPassword = await bcrypt.hash(password, 10);

        // ユーザー作成
        await prisma.user.create({
            data: {
                name,
                phoneNumber,
                email,
                password: hashedPassword,
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Registration error:", error);
        return { error: "登録中にエラーが発生しました" };
    }
}
