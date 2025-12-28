
import { REFERRAL_CAMPAIGN_END_DATE } from "@/src/lib/constants";

const REVENUECAT_SECRET_KEY = process.env.REVENUECAT_SECRET_KEY || "sk_gMlJifwmHuPPcvweJXyXxqPJWdhjm"; // TODO: Use env
// プロモーショナルオファー（署名）の付与ではなく、"Promotional Entitlement" (無料期間の直接付与) を行う
// API: POST https://api.revenuecat.com/v1/subscribers/{app_user_id}/entitlements/{entitlement_identifier}/promotional

export class RevenueCatService {

    /**
     * 指定したユーザーに無料期間（Entitlement）を付与する
     * @param userId ユーザーID (App User ID)
     * @param entitlementId 付与するエンタイトルメントID (例: "standard")
     * @param duration 期間 (例: "monthly")
     */
    static async grantPromotionalEntitlement(userId: String, entitlementId: string = "standard", duration: string = "monthly") {
        const url = `https://api.revenuecat.com/v1/subscribers/${userId}/entitlements/${entitlementId}/promotional`;

        console.log(`[RevenueCat] Granting promotional entitlement to ${userId}`);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${REVENUECAT_SECRET_KEY}`
            },
            body: JSON.stringify({
                duration: duration, // "daily", "weekly", "monthly", "3_month", "6_month", "annual", "lifetime"
                // start_time_ms: Date.now() // start immediately
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[RevenueCat] Failed to grant entitlement: ${response.status} ${errorText}`);
            throw new Error(`RevenueCat API Error: ${errorText}`);
        }

        const data = await response.json();
        console.log(`[RevenueCat] Successfully granted entitlement for ${userId}`, data);
        return data;
    }
}
