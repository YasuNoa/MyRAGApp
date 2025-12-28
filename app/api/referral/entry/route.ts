
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/src/lib/auth-check";
import { prisma } from "@/src/lib/prisma";
import { REFERRAL_CAMPAIGN_END_DATE } from "@/src/lib/constants";

// iOSアプリが Universal Link で起動した時に叩くAPI
// POST /api/referral/entry
// Body: { referrerId: string }
// userId is derived from the auth token
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { referrerId } = body;

        // 0. Auth Check
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = user.uid; // DB User ID (CUID)

        if (!referrerId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        if (referrerId === userId) {
            return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
        }

        // 1. キャンペーン期間チェック
        const now = new Date();
        if (now > REFERRAL_CAMPAIGN_END_DATE) {
            return NextResponse.json({
                success: false,
                error: "CAMPAIGN_ENDED",
                message: "キャンペーン期間外です"
            });
        }

        // 2. 重複チェック: すでに招待されているか？
        const existingReferral = await prisma.referral.findUnique({
            where: { refereeId: userId }
        });

        if (existingReferral) {
            // すでに登録済みなら、それはそれでOK（重複登録はしないがエラーにはしないのが通例）
            return NextResponse.json({
                success: true,
                status: "ALREADY_REGISTERED",
                message: "既に招待が適用されています"
            });
        }

        // 3. Referralレコード作成
        await prisma.referral.create({
            data: {
                referrerId: referrerId,
                refereeId: userId,
                status: "PENDING", // 音声処理などの条件達成待ち
            }
        });

        return NextResponse.json({
            success: true,
            status: "CREATED",
            message: "招待特典のエントリーが完了しました"
        });

    } catch (error) {
        console.error("Referral Entry Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
