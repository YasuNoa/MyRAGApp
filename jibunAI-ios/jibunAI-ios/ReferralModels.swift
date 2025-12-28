
import Foundation

// MARK: - Referral API Models

struct ReferralEligibilityRequest: Codable {
    let userId: String
}

struct ReferralEligibilityResponse: Codable {
    let isEligible: Bool
    let promotionalOfferId: String? // 対象の場合、RevenueCatで使うオファーID
    let reason: String? // 対象外の理由
}

struct ReferralEntryRequest: Codable {
    let referrerId: String
    let userId: String
}

struct ReferralEntryResponse: Codable {
    let success: Bool
    let status: String?
    let message: String?
}
