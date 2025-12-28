
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { REFERRAL_CAMPAIGN_END_DATE } from "@/src/lib/constants";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        // 1. キャンペーン期間チェック
        const now = new Date();
        if (now > REFERRAL_CAMPAIGN_END_DATE) {
            return NextResponse.json({
                isEligible: false,
                reason: "CAMPAIGN_ENDED"
            });
        }

        // 2. 招待ステータスチェック
        // - 招待されていること
        // - ステータスが完了していること（＝音声処理などを実施済み）
        const referral = await prisma.referral.findFirst({
            where: {
                refereeId: userId,
            }
        });

        if (!referral) {
            return NextResponse.json({
                isEligible: false,
                reason: "NOT_REFERRED"
            });
        }

        if (referral.status !== "COMPLETED") {
            return NextResponse.json({
                isEligible: false,
                reason: "REQUIREMENTS_NOT_MET"
            });
        }

        // 3. 既存課金チェック
        // すでにSTANDARD以上のプランに入っている場合は対象外（アップグレードなら対象にする手もあるが一旦除外）
        const subscription = await prisma.userSubscription.findUnique({
            where: { userId }
        });

        if (subscription && (subscription.plan === "STANDARD" || subscription.plan === "PREMIUM")) {
            return NextResponse.json({
                isEligible: false,
                reason: "ALREADY_SUBSCRIBED"
            });
        }

        // すべてOKなら対象
        return NextResponse.json({
            isEligible: true,
            promotionalOfferId: "referral_reward_1month" // iOS側でこれを使って決済する
        });

    } catch (error) {
        console.error("Check Eligibility Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
