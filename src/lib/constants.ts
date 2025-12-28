
// アプリケーション全体で使用する定数定義

// 招待キャンペーンの終了日時 (JST)
// この日時を過ぎると、招待リンクを踏んでも無効、特典も付与されません
export const REFERRAL_CAMPAIGN_END_DATE = new Date("2026-01-31T23:59:59+09:00"); // 一旦2026年1月末として仮置き

// 招待特典の無料期間 (RevenueCat側の設定と合わせる必要があるため、あくまで参考値としてコメント記載)
// Promotional Offer ID: referral_reward_1month
