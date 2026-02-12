//
//  SubscriptionViewModel.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI
import RevenueCat
import FirebaseAuth
import Combine

@MainActor
class SubscriptionViewModel: ObservableObject {
    @Published var isLoading = false // 初期ロード待ち時間をなくす
    @Published var isEligibleForPromo = false
    @Published var promoPackage: Package?
    @Published var promoDiscount: StoreProductDiscount?
    
    // MARK: - Paywall State
    @Published var currentOffering: Offering?
    @Published var isYearly: Bool = false
    @Published var isPurchasing: Bool = false
    
    @Published var showError: Bool = false
    @Published var errorMessage: String = ""
    @Published var showSuccess: Bool = false
    @Published var successMessage: String = ""
    
    // MARK: - Paywall Logic
    
    func fetchOfferings() {
        AppLogger.billing.info("📡 Fetching RevenueCat offerings...")
        isLoading = true
        
        Task {
            do {
                let offerings = try await Purchases.shared.offerings()
                self.isLoading = false
                
                if let current = offerings.current {
                    AppLogger.billing.info("📦 Offerings fetched. Current: \(current.identifier)")
                    self.currentOffering = current
                } else {
                    self.currentOffering = nil
                    AppLogger.billing.warning("⚠️ No current offering configured!")
                    self.errorMessage = "プラン情報が見つかりません (No Current Offering)"
                    self.showError = true
                }
            } catch {
                self.isLoading = false
                AppLogger.billing.error("❌ Error fetching offerings: \(error.localizedDescription)")
                self.errorMessage = "プラン情報の取得エラー: \(error.localizedDescription)"
                self.showError = true
            }
        }
    }
    
    func purchase(package: Package, completion: @escaping () -> Void) {
        AppLogger.billing.info("💰 Purchase started: \(package.identifier)")
        self.isPurchasing = true
        
        Task {
            do {
                let result = try await Purchases.shared.purchase(package: package)
                self.isPurchasing = false
                
                if !result.userCancelled {
                    AppLogger.billing.info("✅ Purchase success")
                    completion()
                } else {
                    AppLogger.billing.info("🚫 User cancelled purchase")
                }
            } catch {
                self.isPurchasing = false
                
                AppLogger.billing.error("❌ Purchase failed: \(error.localizedDescription)")
                let nsError = error as NSError
                // RevenueCat UserCancelled error code?
                // Let's assume error means real error.
                if let purchaseError = error as? ErrorCode, purchaseError == .purchaseCancelledError {
                     AppLogger.billing.info("🚫 User cancelled purchase (Error)")
                } else {
                    self.errorMessage = "購入エラー: \(error.localizedDescription) (Code: \(nsError.code))"
                    self.showError = true
                }
            }
        }
    }
    
    func restorePurchases(completion: @escaping () -> Void) {
        AppLogger.billing.info("🔄 Restore started")
        self.isPurchasing = true
        
        Task {
            do {
                let info = try await Purchases.shared.restorePurchases()
                self.isPurchasing = false
                
                if info.entitlements.active.isEmpty {
                     AppLogger.billing.info("ℹ️ No active entitlements found")
                    self.errorMessage = "復元可能な購入が見つかりませんでした。"
                    self.showError = true
                } else {
                    AppLogger.billing.info("✅ Restore success: \(info.entitlements.active.keys)")
                    self.successMessage = "購入を復元しました。"
                    self.showSuccess = true
                    completion()
                }
            } catch {
                self.isPurchasing = false
                AppLogger.billing.error("❌ Restore failed: \(error.localizedDescription)")
                self.errorMessage = "復元エラー: \(error.localizedDescription)"
                self.showError = true
            }
        }
    }
    
    func checkEligibility() {
        guard let userId = APIService.shared.authToken else { // 簡易的にtokenがあるかチェック
             return
        }
        
        // 本来はUser IDを渡す
        let uid = AuthService.shared.currentUser?.uid
        guard let uid = uid else {
            self.isLoading = false
            return
        }
        
        Task {
            do {
                // 1. バックエンドに対象か聞く
                let response = try await APIService.shared.checkReferralEligibility(providerId: uid)
                
                if response.isEligible, let offerId = response.promotionalOfferId {
                    // 2. RevenueCatからOfferingを取得
                    let offerings = try await Purchases.shared.offerings()
                    
                    // Monthlyパッケージを探す (Identifierは設定に合わせて修正必要: 'standard_monthly' など)
                    if let package = offerings.current?.monthly ?? offerings.current?.availablePackages.first {
                        
                        // 3. パッケージ内のPromotional Offer (StoreProductDiscount) を探す
                        // .first(where:) がプロパティの .first と競合してエラーになるため、ループで検索
                        var foundDiscount: StoreProductDiscount? = nil
                        for discount in package.storeProduct.discounts {
                            if discount.offerIdentifier == offerId {
                                foundDiscount = discount
                                break
                            }
                        }
                        
                        if let promoDiscount = foundDiscount {
                            self.promoPackage = package
                            self.promoDiscount = promoDiscount
                            self.isEligibleForPromo = true
                            self.isLoading = false
                            return
                        }
                    }
                }
            } catch {
                AppLogger.billing.error("Promo check failed: \(error)")
            }
            
            self.isLoading = false
        }
    }
    
    func purchasePromo(package: Package, discount: StoreProductDiscount, completion: @escaping () -> Void) {
        Task {
            do {
                // 1. まず署名付きのPromotionalOfferを取得する
                let promoOffer = try await Purchases.shared.promotionalOffer(forProductDiscount: discount, product: package.storeProduct)
                
                // 2. 取得したPromotionalOfferを使って購入
                let result = try await Purchases.shared.purchase(package: package, promotionalOffer: promoOffer)
                
                if !result.userCancelled {
                    AppLogger.billing.info("Promo purchase success!")
                    completion()
                }
            } catch {
                AppLogger.billing.error("Promo purchase failed: \(error.localizedDescription)")
            }
        }
    }
}
