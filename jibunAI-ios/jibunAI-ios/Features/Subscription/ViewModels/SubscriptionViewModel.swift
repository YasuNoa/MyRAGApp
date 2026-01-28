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

class SubscriptionViewModel: ObservableObject {
    @Published var isLoading = false // 初期ロード待ち時間をなくす
    @Published var isEligibleForPromo = false
    @Published var promoPackage: Package?
    @Published var promoDiscount: StoreProductDiscount?
    
    func checkEligibility() {
        guard let userId = APIService.shared.authToken else { // 簡易的にtokenがあるかチェック
             return
        }
        
        // 本来はUser IDを渡す
        let uid = try? AuthService.shared.getCurrentUserId()
        guard let uid = uid else {
            self.isLoading = false
            return
        }
        
        Task {
            do {
                // 1. バックエンドに対象か聞く
                let response = try await APIService.shared.checkReferralEligibility(userId: uid)
                
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
                print("Promo check failed: \(error)")
            }
            
            DispatchQueue.main.async {
                self.isLoading = false
            }
        }
    }
    
    func purchasePromo(package: Package, discount: StoreProductDiscount, completion: @escaping () -> Void) {
        // 1. まず署名付きのPromotionalOfferを取得する
        Purchases.shared.getPromotionalOffer(forProductDiscount: discount, product: package.storeProduct) { (promoOffer, error) in
            if let error = error {
                 print("Failed to get promo offer signature: \(error.localizedDescription)")
                 return
            }
            
            guard let promoOffer = promoOffer else {
                print("Promo offer is nil")
                return
            }
            
            // 2. 取得したPromotionalOfferを使って購入
            Purchases.shared.purchase(package: package, promotionalOffer: promoOffer) { (transaction, customerInfo, error, userCancelled) in
                if let error = error {
                    print("Promo purchase failed: \(error.localizedDescription)")
                } else if !userCancelled {
                    print("Promo purchase success!")
                    completion()
                }
            }
        }
    }
}
