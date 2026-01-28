//
//  PaywallView.swift
//  jibunAI-ios
//
//  RevenueCatUIを使用した課金画面
//  - 標準のPaywallViewを使用して、設定されたOfferingを表示
//  - 課金成功時、リストア時のハンドリング、フッターの表示
//
//

import SwiftUI
import RevenueCat
import FirebaseAuth
import Combine

struct SubscriptionView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel = SubscriptionViewModel()
    @EnvironmentObject var appState: AppStateManager
    
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
                // Usually PaywallView
                // Spotify-style custom UI displaying (also displayed while checking in background)
                PaywallView {
                    // Purchase Completed Callback
                    Task { @MainActor in
                        appState.checkSubscriptionStatus()
                    }
                    dismiss()
                }
            }
        }
        .onAppear {
            viewModel.checkEligibility()
        }
    }
}


// MARK: - Spotify Style Paywall UI

// MARK: - Premium Paywall UI

struct PaywallView: View {
    @State private var currentOffering: Offering?
    @State private var isYearly: Bool = false // Default to Monthly
    @State private var isLoading: Bool = true
    @State private var isPurchasing: Bool = false
    
    // Error Handling
    @State private var showError: Bool = false
    @State private var errorMessage: String = ""
    @State private var showSuccess: Bool = false
    @State private var successMessage: String = ""
    
    var onPurchaseCompleted: () -> Void

    // Colors
    let midnightBlue = Color(red: 0.05, green: 0.07, blue: 0.12) // Dark Navy
    let cyanGradient = LinearGradient(colors: [Color(red: 0.0, green: 0.8, blue: 0.8), Color(red: 0.0, green: 0.4, blue: 0.8)], startPoint: .topLeading, endPoint: .bottomTrailing)
    
    // iPad Check
    var isIpad: Bool {
        UIDevice.current.userInterfaceIdiom == .pad
    }
    
    var body: some View {
        ZStack {
            // 1. Premium Background
            LinearGradient(
                colors: [Color(red: 0.08, green: 0.1, blue: 0.2), Color.black],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            // Decorative background elements
            GeometryReader { geo in
                Circle()
                    .fill(Color.blue.opacity(0.1))
                    .frame(width: isIpad ? 500 : 300, height: isIpad ? 500 : 300) // Larger for iPad
                    .blur(radius: isIpad ? 100 : 60)
                    .offset(x: -100, y: -100)
                
                Circle()
                    .fill(Color.cyan.opacity(0.1))
                    .frame(width: isIpad ? 400 : 250, height: isIpad ? 400 : 250) // Larger for iPad
                    .blur(radius: isIpad ? 80 : 50)
                    .offset(x: geo.size.width - 150, y: geo.size.height / 2)
            }
            .ignoresSafeArea()
            
            if isLoading {
                ProgressView()
                    .tint(.white)
                    .scaleEffect(1.5)
            } else {
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: isIpad ? 40 : 24) { // Larger spacing on iPad
                        
                        // Header
                        VStack(spacing: isIpad ? 16 : 8) {
                            Text("プレミアムプラン")
                                .font(.system(size: isIpad ? 48 : 32, weight: .bold, design: .rounded)) // Larger font
                                .foregroundStyle(LinearGradient(colors: [.white, .white.opacity(0.8)], startPoint: .top, endPoint: .bottom))
                            
                            Text("ワンコインでもっと楽しよう")
                                .font(isIpad ? .title : .title3) // Larger font
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                        }
                        .padding(.top, isIpad ? 60 : 40)
                        
                        // Switcher
                        HStack(spacing: 0) {
                            PlanSwitchButton(title: "月払い", isSelected: !isYearly, isIpad: isIpad) { isYearly = false }
                            PlanSwitchButton(title: "年払い", isSelected: isYearly, badge: "20%お得", isIpad: isIpad) { isYearly = true }
                        }
                        .frame(maxWidth: isIpad ? 500 : .infinity) // Limit width on iPad
                        .background(Color.black.opacity(0.3))
                        .cornerRadius(30)
                        .padding(.horizontal, isIpad ? 0 : 40)
                        
                        // Cards Stack
                        VStack(spacing: isIpad ? 30 : 20) {
                            if let offering = currentOffering {
                                
                                // --- STANDARD ---
                                if let standardPkg = getPackage(for: "standard", isYearly: isYearly, offering: offering) {
                                    PremiumPlanCard(
                                        title: "Standardプラン", // Explicit Name
                                        price: "月額 " + standardPkg.storeProduct.localizedPriceString, // Explicit Price
                                        period: isYearly ? "1年" : "1ヶ月", // Explicit Period
                                        description: "一番人気のプラン",
                                        features: [
                                            "チャット: 100回 / 日",
                                            "検索精度: 標準",
                                            "音声アップロード: 無制限",
                                            "音声時間: 90分 / ファイル",
                                            "月間処理: 15時間まで",
                                            "保存容量: 200件",
                                            "広告なし"
                                        ],
                                        isPremium: true,
                                        recommended: true,
                                        buttonText: "Standardにする",
                                        isIpad: isIpad,
                                        action: { purchase(package: standardPkg) }
                                    )
                                }
                                
                                // --- PREMIUM ---
                                if let premiumPkg = getPackage(for: "premium", isYearly: isYearly, offering: offering) {
                                    PremiumPlanCard(
                                        title: "Premiumプラン", // Explicit Name
                                        price: "月額 " + premiumPkg.storeProduct.localizedPriceString, // Explicit Price
                                        period: isYearly ? "1年" : "1ヶ月", // Explicit Period
                                        description: "ヘビーユーザー向け",
                                        features: [
                                            "チャット: 200回 / 日",
                                            "検索精度: 高",
                                            "音声アップロード: 無制限",
                                            "音声時間: 3時間 / ファイル",
                                            "月間処理: 90時間まで",
                                            "保存容量: 1000件",
                                            "優先サポート",
                                            "全機能アンロック"
                                        ],
                                        isPremium: true,
                                        recommended: false,
                                        buttonText: "Premiumにする",
                                        isIpad: isIpad,
                                        action: { purchase(package: premiumPkg) }
                                    )
                                }
                                
                                // --- FREE ---
                                PremiumPlanCard(
                                    title: "Freeプラン", // Explicit Name
                                    price: "¥0",
                                    period: "ずっと", // Explicit Period
                                    description: "基本機能のお試し",
                                    features: [
                                        "チャット: 10回 / 日",
                                        "検索精度: 低",
                                        "音声アップロード: 1日1回",
                                        "音声時間: 15分 / ファイル",
                                        "月間処理: 5時間まで",
                                        "保存容量: 5件",
                                        "広告表示あり"
                                    ],
                                    isPremium: false,
                                    buttonText: "現在のプラン",
                                    isIpad: isIpad,
                                    action: nil
                                )
                            }
                        }
                        .frame(maxWidth: isIpad ? 600 : .infinity) // Limit width on iPad for better readability
                        .padding(.horizontal, 16)
                        
                        // Footer
                        VStack(spacing: 16) {
                            // Auto-renewal Disclosure (Required by Apple)
                            VStack(spacing: 8) {
                                Text("課金について")
                                    .font(isIpad ? .headline : .caption)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white.opacity(0.6))
                                    .frame(maxWidth: isIpad ? 600 : .infinity, alignment: .leading)
                                
                                Text("""
                                • お支払いは、購入確認時にApple IDアカウントに請求されます。
                                • サブスクリプションは、現在の期間が終了する少なくとも24時間前に自動更新がオフにされない限り、自動的に更新されます。
                                • アカウントには、現在の期間が終了する前の24時間以内に更新料金が請求され、更新費用が特定されます。
                                • サブスクリプションはユーザーが管理でき、購入後にApp Storeのアカウント設定で自動更新をオフにすることができます。
                                • 無料トライアル期間の未使用分は、ユーザーがそのパブリケーションのサブスクリプションを購入した際に失効します。
                                """)
                                .font(isIpad ? .body : .caption2)
                                .foregroundColor(.white.opacity(0.4))
                                .fixedSize(horizontal: false, vertical: true)
                                .lineSpacing(2)
                                .frame(maxWidth: isIpad ? 600 : .infinity)
                            }
                            .padding(.horizontal, 24)
                            .padding(.vertical, 8)
                            
                            Button {
                                restorePurchases()
                            } label: {
                                Text("購入を復元する")
                                    .font(isIpad ? .body : .footnote)
                                    .foregroundColor(.white.opacity(0.5))
                                    .underline()
                            }
                            
                            HStack(spacing: 20) {
                                Link("利用規約", destination: URL(string: "https://jibun-ai.com/terms")!)
                                Link("プライバシー", destination: URL(string: "https://jibun-ai.com/privacy")!)
                            }
                            .font(isIpad ? .callout : .caption2)
                            .foregroundColor(.white.opacity(0.3))
                        }
                        .padding(.bottom, 40)
                    }
                }
            }
            
            // Loading Overlay
            if isPurchasing {
                ZStack {
                    Color.black.opacity(0.6).ignoresSafeArea()
                    VStack(spacing: 16) {
                        ProgressView().tint(.white)
                        Text("処理中...")
                            .foregroundColor(.white)
                            .font(.headline)
                    }
                    .padding(30)
                    .background(.ultraThinMaterial)
                    .cornerRadius(16)
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
            Button("OK") { onPurchaseCompleted() }
        } message: {
            Text(successMessage)
        }
    }
    
    // RevenueCat Helpers (No changes to logic)
    func getPackage(for baseId: String, isYearly: Bool, offering: Offering) -> Package? {
        let items = offering.availablePackages
        let suffix = isYearly ? "_yearly" : "_monthly"
        let targetId = baseId + suffix
        if let exactMatch = items.first(where: { $0.identifier == targetId }) { return exactMatch }
        return items.first(where: { $0.identifier.contains(baseId) && $0.identifier.contains(isYearly ? "yearly" : "monthly") })
    }
    
    func fetchOfferings() {
        print("📡 Fetching RevenueCat offerings...")
        Purchases.shared.getOfferings { (offerings, error) in
            DispatchQueue.main.async {
                self.isLoading = false
                
                if let error = error {
                    print("❌ Error fetching offerings: \(error.localizedDescription)")
                    self.errorMessage = "プラン情報の取得エラー: \(error.localizedDescription)"
                    self.showError = true
                    return
                }
                
                if let offerings = offerings, let current = offerings.current {
                    print("📦 Offerings fetched. Current: \(current.identifier)")
                    self.currentOffering = current
                } else {
                    print("⚠️ No current offering configured!")
                    self.errorMessage = "プラン情報が見つかりません (No Current Offering)"
                    self.showError = true
                }
            }
        }
    }
    
    func purchase(package: Package) {
        print("💰 Purchase started: \(package.identifier)")
        self.isPurchasing = true
        Purchases.shared.purchase(package: package) { (transaction, info, error, userCancelled) in
            DispatchQueue.main.async {
                self.isPurchasing = false
                if let error = error {
                    print("❌ Purchase failed: \(error.localizedDescription)")
                    if !userCancelled {
                        let nsError = error as NSError
                        self.errorMessage = "購入エラー: \(error.localizedDescription) (Code: \(nsError.code))"
                        self.showError = true
                    } else {
                        print("🚫 User cancelled purchase")
                    }
                } else if !userCancelled {
                    print("✅ Purchase success")
                    onPurchaseCompleted()
                }
            }
        }
    }
    
    func restorePurchases() {
        print("🔄 Restore started")
        self.isPurchasing = true
        Purchases.shared.restorePurchases { (info, error) in
            DispatchQueue.main.async {
                self.isPurchasing = false
                if let error = error {
                    print("❌ Restore failed: \(error.localizedDescription)")
                    self.errorMessage = "復元エラー: \(error.localizedDescription)"
                    self.showError = true
                } else if let info = info {
                    if info.entitlements.active.isEmpty {
                         print("ℹ️ No active entitlements found")
                        self.errorMessage = "復元可能な購入が見つかりませんでした。"
                        self.showError = true
                    } else {
                        print("✅ Restore success: \(info.entitlements.active.keys)")
                        self.successMessage = "購入を復元しました。"
                        self.showSuccess = true
                        onPurchaseCompleted()
                    }
                }
            }
        }
    }
}

// MARK: - Components

struct PlanSwitchButton: View {
    let title: String
    let isSelected: Bool
    var badge: String? = nil
    var isIpad: Bool = false
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(title)
                    .font(isIpad ? .title3 : .body) // Larger font
                    .fontWeight(.bold)
                if let badge = badge {
                    Text(badge)
                        .font(isIpad ? .subheadline : .caption2) // Larger font
                        .fontWeight(.bold)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, isIpad ? 16 : 12) // Larger padding
            .background(isSelected ? Color.white.opacity(0.15) : Color.clear)
            .foregroundColor(isSelected ? .white : .gray)
            .cornerRadius(30)
        }
    }
}

struct PremiumPlanCard: View {
    let title: String
    let price: String
    let period: String
    let description: String
    let features: [String]
    let isPremium: Bool
    var recommended: Bool = false
    let buttonText: String
    var isIpad: Bool = false
    let action: (() -> Void)?
    
    var body: some View {
        ZStack(alignment: .topTrailing) {
            VStack(spacing: isIpad ? 24 : 16) {
                // Title & Price
                HStack(alignment: .top) { // Align top to handle height diff
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title)
                            .font(isIpad ? .title2 : .title3)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                        
                        Text(description)
                            .font(isIpad ? .body : .caption)
                            .foregroundColor(.white.opacity(0.6))
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 0) {
                        Text(price)
                            .font(.system(size: isIpad ? 48 : 36, weight: .heavy, design: .rounded)) // More emphasis
                            .foregroundColor(.white)
                            .shadow(color: isPremium ? .cyan.opacity(0.5) : .clear, radius: 10) // Glow for premium text
                        Text(period)
                            .font(isIpad ? .body : .caption2)
                            .foregroundColor(.white.opacity(0.6))
                    }
                    .padding(.top, recommended ? 8 : 0) // Shift price down if recommended
                }
                
                Divider().background(Color.white.opacity(0.1))
                
                // Features
                VStack(alignment: .leading, spacing: isIpad ? 12 : 8) {
                    ForEach(features, id: \.self) { feature in
                        HStack(spacing: 10) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(isPremium ? Color.cyan : Color.gray)
                                .font(.system(size: isIpad ? 20 : 14))
                            Text(feature)
                                .font(isIpad ? .body : .subheadline)
                                .foregroundColor(.white.opacity(0.9))
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                
                Spacer(minLength: 8)
                
                // Action Button
                if let action = action {
                    Button(action: action) {
                        Text(buttonText)
                            .font(isIpad ? .title3 : .headline)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, isIpad ? 18 : 14)
                            .background(
                                isPremium
                                ? AnyView(LinearGradient(colors: [Color.cyan, Color.blue], startPoint: .leading, endPoint: .trailing))
                                : AnyView(Color.white.opacity(0.1))
                            )
                            .cornerRadius(12)
                            .shadow(color: isPremium ? Color.cyan.opacity(0.3) : .clear, radius: 10, x: 0, y: 5)
                    }
                } else {
                    Text(buttonText)
                        .font(isIpad ? .title3 : .headline)
                        .fontWeight(.bold)
                        .foregroundColor(.white.opacity(0.5))
                        .padding(.vertical, isIpad ? 18 : 14)
                        .frame(maxWidth: .infinity)
                        .background(Color.black.opacity(0.3))
                        .cornerRadius(12)
                }
            }
            .padding(isIpad ? 32 : 24)
            .background(.ultraThinMaterial)
            .cornerRadius(24)
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(
                        LinearGradient(
                            colors: recommended ? [.cyan.opacity(0.5), .blue.opacity(0.5)] : [.white.opacity(0.1), .clear],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
            .shadow(color: Color.black.opacity(0.2), radius: 20, x: 0, y: 10)
            
            // Badge
            if recommended {
                Text("おすすめ")
                    .font(.system(size: isIpad ? 14 : 11, weight: .bold)) // Slightly larger text
                    .foregroundColor(.white)
                    .padding(.horizontal, isIpad ? 14 : 10)
                    .padding(.vertical, isIpad ? 8 : 5)
                    .background(
                        LinearGradient(colors: [.cyan, .blue], startPoint: .leading, endPoint: .trailing)
                    )
                    .cornerRadius(10) // More rounded
                    .padding([.top, .trailing], isIpad ? 16 : 12) // Moved closer to edge
            }
        }
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

// MARK: - Extensions

extension View {
    @ViewBuilder
    func adaptivePaywallSheet(isPresented: Binding<Bool>, onPurchaseCompleted: @escaping () -> Void) -> some View {
        if UIDevice.current.userInterfaceIdiom == .pad {
            self.fullScreenCover(isPresented: isPresented) {
                PaywallView(onPurchaseCompleted: onPurchaseCompleted)
            }
        } else {
            self.sheet(isPresented: isPresented) {
                PaywallView(onPurchaseCompleted: onPurchaseCompleted)
            }
        }
    }
}
