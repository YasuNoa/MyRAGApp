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
        
        Purchases.shared.getOfferings { [weak self] (offerings, error) in
            guard let self = self else { return }
            
            DispatchQueue.main.async {
                self.isLoading = false
                
                if let error = error {
                    AppLogger.billing.error("❌ Error fetching offerings: \(error.localizedDescription)")
                    self.errorMessage = "プラン情報の取得エラー: \(error.localizedDescription)"
                    self.showError = true
                    return
                }
                
                if let offerings = offerings, let current = offerings.current {
                    AppLogger.billing.info("📦 Offerings fetched. Current: \(current.identifier)")
                    self.currentOffering = current
                } else {
                    self.currentOffering = nil
                    AppLogger.billing.warning("⚠️ No current offering configured!")
                    self.errorMessage = "プラン情報が見つかりません (No Current Offering)"
                    self.showError = true
                }
            }
        }
    }
    
    func purchase(package: Package, completion: @escaping () -> Void) {
        AppLogger.billing.info("💰 Purchase started: \(package.identifier)")
        self.isPurchasing = true
        
        Purchases.shared.purchase(package: package) { [weak self] (transaction, info, error, userCancelled) in
            guard let self = self else { return }
            
            DispatchQueue.main.async {
                self.isPurchasing = false
                
                if let error = error {
                    AppLogger.billing.error("❌ Purchase failed: \(error.localizedDescription)")
                    if !userCancelled {
                        let nsError = error as NSError
                        self.errorMessage = "購入エラー: \(error.localizedDescription) (Code: \(nsError.code))"
                        self.showError = true
                    } else {
                        AppLogger.billing.info("🚫 User cancelled purchase")
                    }
                } else if !userCancelled {
                    AppLogger.billing.info("✅ Purchase success")
                    completion()
                }
            }
        }
    }
    
    func restorePurchases(completion: @escaping () -> Void) {
        AppLogger.billing.info("🔄 Restore started")
        self.isPurchasing = true
        
        Purchases.shared.restorePurchases { [weak self] (info, error) in
            guard let self = self else { return }
            
            DispatchQueue.main.async {
                self.isPurchasing = false
                
                if let error = error {
                    AppLogger.billing.error("❌ Restore failed: \(error.localizedDescription)")
                    self.errorMessage = "復元エラー: \(error.localizedDescription)"
                    self.showError = true
                } else if let info = info {
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
                }
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
                            
                            DispatchQueue.main.async {
                                self.promoPackage = package
                                self.promoDiscount = promoDiscount
                                self.isEligibleForPromo = true
                                self.isLoading = false
                            }
                            return
                        }
                    }
                }
            } catch {
                AppLogger.billing.error("Promo check failed: \(error)")
            }
            
            DispatchQueue.main.async {
                self.isLoading = false
            }
        }
    }
    
    func purchasePromo(package: Package, discount: StoreProductDiscount, completion: @escaping () -> Void) {
        // 1. まず署名付きのPromotionalOfferを取得する
        Purchases.shared.getPromotionalOffer(forProductDiscount: discount, product: package.storeProduct) { [weak self] (promoOffer, error) in
            guard let self = self else { return }
            
            if let error = error {
                 AppLogger.billing.error("Failed to get promo offer signature: \(error.localizedDescription)")
                 return
            }
            
            guard let promoOffer = promoOffer else {
                AppLogger.billing.error("Promo offer is nil")
                return
            }
            
            // 2. 取得したPromotionalOfferを使って購入
            Purchases.shared.purchase(package: package, promotionalOffer: promoOffer) { [weak self] (transaction, customerInfo, error, userCancelled) in
                guard let _ = self else { return }
                
                if let error = error {
                    AppLogger.billing.error("Promo purchase failed: \(error.localizedDescription)")
                } else if !userCancelled {
                    AppLogger.billing.info("Promo purchase success!")
                    completion()
                }
            }
        }
    }
}
