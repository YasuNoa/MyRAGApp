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
import FirebaseAuth
import Combine

struct SubscriptionView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel = SubscriptionViewModel()
    
    var body: some View {
    var body: some View {
        ZStack {
            // 基本はPaywallViewを表示（ロード待ちしない）
            if viewModel.isEligibleForPromo, let package = viewModel.promoPackage, let discount = viewModel.promoDiscount {
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
                .background(Color(UIColor.systemBackground)) // 背景追加（Paywallの上に被る場合のため）
            } else {
                // 通常のPaywall
                // Spotify風のカスタムUIを表示（裏でチェック中もこれが表示される）
                PaywallView {
                    dismiss()
                }
            }
        }
        .onAppear {
            viewModel.checkEligibility()
        }
    }
        .onAppear {
            viewModel.checkEligibility()
        }
    }
}

// MARK: - Spotify Style Paywall UI

struct PaywallView: View {
    @State private var currentOffering: Offering?
    @State private var isYearly: Bool = false // 月額/年額の切り替え
    @State private var isLoading: Bool = true
    @State private var isPurchasing: Bool = false // 購入処理中のブロッキング用
    
    // エラーハンドリング
    @State private var showError: Bool = false
    @State private var errorMessage: String = ""
    @State private var showSuccess: Bool = false // 成功時のメッセージ用(Restoreなど)
    @State private var successMessage: String = ""
    
    var onPurchaseCompleted: () -> Void

    var body: some View {
        ZStack {
            // 背景色（少し暗めにして高級感を出すなどお好みで）
            Color(UIColor.systemBackground).ignoresSafeArea()
            
            if isLoading {
                ProgressView()
            } else {
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 20) {
                        
                        // ヘッダー部分
                        VStack(spacing: 8) {
                            Text("Premiumプランを選択")
                                .font(.title2)
                                .fontWeight(.bold)
                            
                            Text("あなたのニーズに合わせた最適なプランを")
                                .font(.subheadline)
                                .foregroundColor(.gray)
                        }
                        .padding(.top, 20)
                        
                        // 月額/年額 切り替えスイッチ
                        Picker("Plan Duration", selection: $isYearly) {
                            Text("月払い").tag(false)
                            Text("年払い (お得)").tag(true)
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal)
                        .disabled(isPurchasing) // 購入中は操作不可
                        
                        // 縦並びのカードエリア
                        VStack(spacing: 16) {
                            if let offering = currentOffering {
                                
                                // --- 梅 (Free) ---
                                PlanCard(
                                    title: "Free",
                                    price: "無料",
                                    subPrice: "ずっと0円",
                                    features: [
                                        "チャット: 5通/日",
                                        "音声処理: 20分/ファイル",
                                        "月間上限: 120分",
                                        "広告あり"
                                    ],
                                    color: .gray,
                                    isHighLighted: false,
                                    buttonText: "現在のプラン",
                                    action: nil
                                )
                                
                                // --- 竹 (Standard) ---
                                if let standardPkg = getPackage(for: "standard", isYearly: isYearly, offering: offering) {
                                    PlanCard(
                                        title: "Standard",
                                        price: standardPkg.storeProduct.localizedPriceString,
                                        subPrice: isYearly ? "12ヶ月分一括払い" : "毎月更新",
                                        features: [
                                            "チャット: 100通/日",
                                            "音声処理: 無制限",
                                            "90分/ファイル",
                                            "月間上限: 900分",
                                            "広告なし"
                                        ],
                                        color: .blue,
                                        isHighLighted: false,
                                        buttonText: "選択する",
                                        action: {
                                            purchase(package: standardPkg)
                                        }
                                    )
                                    .disabled(isPurchasing)
                                }
                                
                                // --- 松 (Premium) ---
                                if let premiumPkg = getPackage(for: "premium", isYearly: isYearly, offering: offering) {
                                    PlanCard(
                                        title: "Premium",
                                        price: premiumPkg.storeProduct.localizedPriceString,
                                        subPrice: isYearly ? "12ヶ月分一括払い" : "毎月更新",
                                        features: [
                                            "チャット: 200通/日",
                                            "音声処理: 無制限",
                                            "180分/ファイル",
                                            "月間上限: 5400分",
                                            "全ての機能を開放"
                                        ],
                                        color: .green,
                                        isHighLighted: true,
                                        buttonText: "Premiumにする",
                                        action: {
                                            purchase(package: premiumPkg)
                                        }
                                    )
                                    .disabled(isPurchasing)
                                }
                            }
                        }
                        .padding(.horizontal)
                        .padding(.vertical, 10)
                        
                        // フッター（復元やポリシー）
                        VStack(spacing: 16) {
                            Button("購入を復元する") {
                                restorePurchases()
                            }
                            .font(.subheadline)
                            .foregroundColor(.blue)
                            .disabled(isPurchasing)
                            
                            HStack(spacing: 20) {
                                Link("利用規約", destination: URL(string: "https://jibun-ai.com/terms")!)
                                    .font(.caption)
                                    .foregroundColor(.gray)
                                
                                Link("プライバシーポリシー", destination: URL(string: "https://jibun-ai.com/privacy")!)
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                            .padding(.top, 4)
                            
                            Text("期間終了の24時間前までに解約しない限り、自動的に更新されます。")
                                .font(.caption2)
                                .foregroundColor(.gray)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        }
                        .padding(.bottom, 40)
                    }
                }
            }
            
            // ブロッキングローディング
            if isPurchasing {
                ZStack {
                    Color.black.opacity(0.4).ignoresSafeArea()
                    ProgressView()
                        .padding()
                        .background(Color.white)
                        .cornerRadius(10)
                        .shadow(radius: 10)
                }
            }
        }
        .onAppear {
            fetchOfferings()
        }
        .alert("エラー", isPresented: $showError) {
            Button("OK") {}
        } message: {
            Text(errorMessage)
        }
        .alert("完了", isPresented: $showSuccess) {
            Button("OK") {
                 // リストア完了後に画面を閉じる等したければここで行う
                 // onPurchaseCompleted() // 必要に応じて
            }
        } message: {
            Text(successMessage)
        }
    }
    
    // RevenueCatからPackageを取得するヘルパー
    func getPackage(for baseId: String, isYearly: Bool, offering: Offering) -> Package? {
        let items = offering.availablePackages
        // IDの命名規則は 'standard_monthly', 'standard_yearly', 'premium_monthly', 'premium_yearly' を想定
        let suffix = isYearly ? "_yearly" : "_monthly"
        let targetId = baseId + suffix
        
        // 完全一致で検索
        if let exactMatch = items.first(where: { $0.identifier == targetId }) {
            return exactMatch
        }
        
        // 見つからない場合のフォールバック（部分一致検索）
        return items.first(where: { $0.identifier.contains(baseId) && $0.identifier.contains(isYearly ? "yearly" : "monthly") })
    }
    
    func fetchOfferings() {
        Purchases.shared.getOfferings { (offerings, error) in
            DispatchQueue.main.async {
                if let offerings = offerings, let current = offerings.current {
                    self.currentOffering = current
                } else if let error = error {
                    // 取得失敗
                    print("Offerings fetch failed: \(error)")
                }
                self.isLoading = false
            }
        }
    }
    
    func purchase(package: Package) {
        self.isPurchasing = true // ブロック開始
        
        Purchases.shared.purchase(package: package) { (transaction, info, error, userCancelled) in
            DispatchQueue.main.async {
                self.isPurchasing = false // ブロック解除
                
                if let error = error {
                    // キャンセル以外はエラー表示
                    if !userCancelled {
                        self.errorMessage = "購入処理中にエラーが発生しました。\n\(error.localizedDescription)"
                        self.showError = true
                    }
                } else if !userCancelled {
                    // 成功
                    print("Purchase success!")
                    onPurchaseCompleted()
                }
            }
        }
    }
    
    func restorePurchases() {
        self.isPurchasing = true
        
        Purchases.shared.restorePurchases { (info, error) in
            DispatchQueue.main.async {
                self.isPurchasing = false
                
                if let error = error {
                    self.errorMessage = "復元に失敗しました。\n\(error.localizedDescription)"
                    self.showError = true
                } else if let info = info {
                    // アクティブなエンタイトルメントがあるかチェック
                    if info.entitlements.active.isEmpty {
                        self.errorMessage = "復元可能な購入が見つかりませんでした。"
                        self.showError = true
                    } else {
                        self.successMessage = "購入を復元しました。"
                        self.showSuccess = true
                        onPurchaseCompleted()
                    }
                }
            }
        }
    }
}

// カードコンポーネント
struct PlanCard: View {
    let title: String
    let price: String
    let subPrice: String
    let features: [String]
    let color: Color
    let isHighLighted: Bool
    let buttonText: String
    let action: (() -> Void)?
    
    var body: some View {
        VStack(spacing: 12) {
            // タイトル帯
            Text(title)
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .padding(.vertical, 6)
                .frame(maxWidth: .infinity)
                .background(color)
            
            // 価格エリア
            VStack(spacing: 2) {
                Text(price)
                    .font(.title2)
                    .fontWeight(.heavy)
                    .foregroundColor(.primary)
                
                Text(subPrice)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.top, 2)
            
            Divider()
                .padding(.horizontal)
            
            // 特徴リスト
            VStack(alignment: .leading, spacing: 6) {
                ForEach(features, id: \.self) { feature in
                    HStack(alignment: .top, spacing: 6) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(color)
                            .font(.system(size: 12))
                        Text(feature)
                            .font(.caption)
                            .fixedSize(horizontal: false, vertical: true)
                        Spacer()
                    }
                }
            }
            .padding(.horizontal)
            
            Spacer(minLength: 8)
            
            // アクションボタン
            if let action = action {
                Button(action: action) {
                    Text(buttonText)
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.vertical, 10)
                        .frame(maxWidth: .infinity)
                        .background(color)
                        .cornerRadius(8)
                        .shadow(radius: 1)
                }
                .padding(.horizontal)
                .padding(.bottom, 12)
            } else {
                // Freeプランなどの場合
                Text(buttonText)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(color)
                    .padding(.vertical, 10)
                    .frame(maxWidth: .infinity)
                    .padding(.bottom, 12)
            }
        }
        .frame(maxWidth: .infinity)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isHighLighted ? color : Color.clear, lineWidth: 2)
        )
    }
}


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
