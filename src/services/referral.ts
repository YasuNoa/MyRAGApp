
import { prisma } from "@/src/lib/prisma";
import { RevenueCatService } from "./revenuecat";

export class ReferralService {

    /**
     * ユーザーのアクション（例: 音声処理）完了時に呼び出す。
     * 招待成立（PENDING -> COMPLETED）を判定し、紹介者に特典を付与する。
     */
    static async completeReferralIfPending(userId: string) {
        try {
            // 1. このユーザーが「招待された(PENDING)」状態か確認
            const referral = await prisma.referral.findUnique({
                where: { refereeId: userId },
            });

            if (!referral) return; // 招待されていない
            if (referral.status !== "PENDING") return; // 既に完了済み or 無効

            console.log(`[Referral] Completing referral for user ${userId} (Referrer: ${referral.referrerId})`);

            // 2. ステータスを完了に更新
            await prisma.referral.update({
                where: { id: referral.id },
                data: { status: "COMPLETED" }
            });

            // 3. 紹介者 (Referrer) に特典（30日無料）を付与
            // Standardプランのエンタイトルメントを付与
            // ※紹介者がFreeプランでもPremiumプランでも、"Standard"の権限が追加される形になる
            // RevenueCat側で積み上げ（Stacking）されるかはプロジェクト設定によるが、通常は期間延長または並行有効になる
            try {
                await RevenueCatService.grantPromotionalEntitlement(
                    referral.referrerId,
                    "standard",
                    "monthly" // 30日分
                );
            } catch (error) {
                console.error(`[Referral] Failed to grant reward to referrer ${referral.referrerId}`, error);
                // 失敗した場合、Referralステータスを戻すか、あるいはリトライキューに入れるべきだが、
                // 一旦はログ出力のみで続行（ユーザー体験を阻害しないため）
            }

        } catch (error) {
            console.error("[Referral] Error in completeReferralIfPending:", error);
        }
    }
}
