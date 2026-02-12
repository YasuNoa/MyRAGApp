//
//  PaywallView.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI
import RevenueCat

struct SubscriptionView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var subscriptionViewModel = SubscriptionViewModel()
    @EnvironmentObject var appState: AppStateManager
    
    var body: some View {
        ZStack {
            // 基本はPaywallViewを表示（ViewModelに依存）
            if subscriptionViewModel.isEligibleForPromo, let package = subscriptionViewModel.promoPackage, let discount = subscriptionViewModel.promoDiscount {
                // 特別オファー画面（1ヶ月無料）
                VStack(spacing: 20) {
                    Text("🎉 特別なご招待")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("1ヶ月無料特典が適用されます！")
                        .font(.headline)
                    
                    Button(action: {
                        subscriptionViewModel.purchasePromo(package: package, discount: discount) {
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
                         subscriptionViewModel.isEligibleForPromo = false // 標準Paywallへ
                    }
                    .padding(.top)
                }
                .padding()
                .background(Color(UIColor.systemBackground))
            } else {
                // 通常のPaywall
                // ViewModelを渡す
                PaywallView(subscriptionViewModel: subscriptionViewModel) {
                    // Purchase Completed Callback
                    Task { @MainActor in
                        appState.checkSubscriptionStatus()
                    }
                    dismiss()
                }
            }
        }
        .onAppear {
            subscriptionViewModel.checkEligibility()
            // PaywallView側でfetchするが、ここでも呼べる
        }
    }
}

// MARK: - Premium Paywall UI

struct PaywallView: View {
    @ObservedObject var subscriptionViewModel: SubscriptionViewModel
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
            // ... (Background Logic same)
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
            
            if subscriptionViewModel.isLoading {
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
                            PlanSwitchButton(title: "月払い", isSelected: !subscriptionViewModel.isYearly, isIpad: isIpad) { subscriptionViewModel.isYearly = false }
                            PlanSwitchButton(title: "年払い", isSelected: subscriptionViewModel.isYearly, badge: "20%お得", isIpad: isIpad) { subscriptionViewModel.isYearly = true }
                        }
                        .frame(maxWidth: isIpad ? 500 : .infinity) // Limit width on iPad
                        .background(Color.black.opacity(0.3))
                        .cornerRadius(30)
                        .padding(.horizontal, isIpad ? 0 : 40)
                        
                        // Cards Stack
                        VStack(spacing: isIpad ? 30 : 20) {
                            if let offering = subscriptionViewModel.currentOffering {
                                
                                // --- STANDARD ---
                                if let standardPkg = getPackage(for: "standard", isYearly: subscriptionViewModel.isYearly, offering: offering) {
                                    PremiumPlanCard(
                                        title: "Standardプラン", // Explicit Name
                                        price: "月額 " + standardPkg.storeProduct.localizedPriceString, // Explicit Price
                                        period: subscriptionViewModel.isYearly ? "1年" : "1ヶ月", // Explicit Period
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
                                        action: { subscriptionViewModel.purchase(package: standardPkg, completion: onPurchaseCompleted) }
                                    )
                                }
                                
                                // --- PREMIUM ---
                                if let premiumPkg = getPackage(for: "premium", isYearly: subscriptionViewModel.isYearly, offering: offering) {
                                    PremiumPlanCard(
                                        title: "Premiumプラン", // Explicit Name
                                        price: "月額 " + premiumPkg.storeProduct.localizedPriceString, // Explicit Price
                                        period: subscriptionViewModel.isYearly ? "1年" : "1ヶ月", // Explicit Period
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
                                        action: { subscriptionViewModel.purchase(package: premiumPkg, completion: onPurchaseCompleted) }
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
                                subscriptionViewModel.restorePurchases(completion: onPurchaseCompleted)
                            } label: {
                                Text("購入を復元する")
                                    .font(isIpad ? .body : .footnote)
                                    .foregroundColor(.white.opacity(0.5))
                                    .underline()
                            }
                            
                            HStack(spacing: 20) {
                                if let termsURL = URL(string: "https://jibun-ai.com/terms") {
                                    Link("利用規約", destination: termsURL)
                                }
                                if let privacyURL = URL(string: "https://jibun-ai.com/privacy") {
                                    Link("プライバシー", destination: privacyURL)
                                }
                            }
                            .font(isIpad ? .callout : .caption2)
                            .foregroundColor(.white.opacity(0.3))
                        }
                        .padding(.bottom, 40)
                    }
                }
            }
            
            // Loading Overlay
            if subscriptionViewModel.isPurchasing {
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
            subscriptionViewModel.fetchOfferings()
        }
        .alert("エラー", isPresented: $subscriptionViewModel.showError) {
            Button("OK") {}
        } message: {
            Text(subscriptionViewModel.errorMessage) // Bind to ViewModel
        }
        .alert("完了", isPresented: $subscriptionViewModel.showSuccess) {
            Button("OK") { onPurchaseCompleted() }
        } message: {
            Text(subscriptionViewModel.successMessage)
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
