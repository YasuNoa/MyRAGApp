//
//  PaywallView.swift
//  jibunAI-ios
//
//  RevenueCatUIを使用した課金画面
//  - 標準のPaywallViewを使用して、設定されたOfferingを表示
//  - 課金成功時、リストア時のハンドリング、フッターの表示
//

import SwiftUI
import RevenueCat
import RevenueCatUI
import FirebaseAuth
import Combine

struct SubscriptionView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel = SubscriptionViewModel()
    
    var body: some View {
        ZStack {
            if viewModel.isLoading {
                ProgressView()
            } else if viewModel.isEligibleForPromo, let package = viewModel.promoPackage, let discount = viewModel.promoDiscount {
                // 特別オファー画面（1ヶ月無料）
                VStack(spacing: 20) {
                    Text("🎉 特別なご招待")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("1ヶ月無料特典が適用されます！")
                        .font(.headline)
                    
                    Button(action: {
                        viewModel.purchasePromo(package: package, discount: discount) {
                            dismiss()
                        }
                    }) {
                        Text("1ヶ月無料で始める")
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color.blue)
                            .cornerRadius(10)
                    }
                    .padding()
                    
                    Text("その後、月額プランが自動更新されます。")
                        .font(.caption)
                        .foregroundColor(.gray)
                    
                    Button("通常のプランを見る") {
                         viewModel.isEligibleForPromo = false // 標準Paywallへ
                    }
                    .padding(.top)
                }
                .padding()
            } else {
                // 通常のPaywall
                PaywallView(displayCloseButton: true)
                    .onPurchaseCompleted { customerInfo in
                        print("Purchase completed: \(customerInfo.entitlements)")
                        dismiss()
                    }
                    .onRestoreCompleted { customerInfo in
                        print("Restore completed: \(customerInfo.entitlements)")
                        dismiss()
                    }
            }
        }
        .onAppear {
            viewModel.checkEligibility()
        }
    }
}

class SubscriptionViewModel: ObservableObject {
    @Published var isLoading = true
    @Published var isEligibleForPromo = false
    @Published var promoPackage: Package?
    @Published var promoDiscount: StoreProductDiscount?
    
    func checkEligibility() {
        guard let userId = APIService.shared.authToken else { // 簡易的にtokenがあるかチェック
             self.isLoading = false
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

extension AuthService {
    func getCurrentUserId() throws -> String? {
        return Auth.auth().currentUser?.uid
    }
}

// プレビュー用
struct SubscriptionView_Previews: PreviewProvider {
    static var previews: some View {
        SubscriptionView()
    }
}
