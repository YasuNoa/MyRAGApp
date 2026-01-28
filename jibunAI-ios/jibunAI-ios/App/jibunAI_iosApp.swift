//
//  jibunAI_iosApp.swift
//  jibunAI-ios
//
//  Created by 田中正造 on 2025/12/19.
//

import SwiftUI
import Combine
import FirebaseCore
import FirebaseAuth
import LineSDK
import GoogleSignIn
import RevenueCat
import StoreKit

@main
struct jibunAI_iosApp: App {
    // アプリ全体の状態を管理するStateObjectを保持する
    @StateObject private var appState = AppStateManager()
    
    init() {
        // デバッグログ追加
        print("🚀 App initializing...")
        
        // Firebase初期化
        FirebaseApp.configure()
        print("✅ Firebase configured")
        
        // RevenueCat初期化
        // Info.plistから読み込む
        let revenueCatAPIKey = Bundle.main.object(forInfoDictionaryKey: "RevenueCatAPIKey") as? String ?? ""
        if revenueCatAPIKey.isEmpty {
            print("⚠️ RevenueCatAPIKey not found in Info.plist")
        } else {
            print("🚀 RevenueCat configured with key from Info.plist")
        }
        
        Purchases.logLevel = .debug
        Purchases.configure(withAPIKey: revenueCatAPIKey)
        print("✅ RevenueCat configured")
        
        // LINE SDK初期化
        LineAuthManager.shared.setup(channelID: "2008568178")
        print("✅ LINE SDK configured")
        
        // GoogleService-Info.plist の確認
        if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") {
            print("✅ GoogleService-Info.plist found at: \(path)")
        } else {
            print("❌ GoogleService-Info.plist NOT FOUND")
        }
        
        // Client ID の確認
        if let clientID = FirebaseApp.app()?.options.clientID {
            print("✅ Firebase Client ID: \(clientID)")
        } else {
            print("❌ Firebase Client ID NOT FOUND")
        }
        
        // 【デバッグ】StoreKit直接確認
        Task {
            print("🛒 DEBUG: Starting StoreKit product fetch check...")
            do {
                // StoreKit 2 API
                let products = try await Product.products(for: ["com.jibunai.standard.monthly", "com.jibunai.premium.monthly", "com.jibunai.standard.yearly", "com.jibunai.premium.yearly"])
                print("🛒 DEBUG: StoreKit found \(products.count) products")
                for p in products {
                     print("   - FOUND: \(p.id): \(p.displayName) \(p.displayPrice)")
                }
                if products.isEmpty {
                    print("🛒 DEBUG: ⚠️ StoreKit returned 0 products. Check Scheme > StoreKit Configuration.")
                }
            } catch {
                print("🛒 DEBUG: ❌ Failed to fetch products from StoreKit: \(error)")
            }
        }
    }
    
    var body: some Scene {
        WindowGroup {
            // ルートビューとしてAppRootViewを表示し、appStateを環境オブジェクトとして渡す
            AppRootView()
                .environmentObject(appState) // appStateを環境オブジェクトとして渡すことで全体で利用可能にする
                .onOpenURL { url in
                    print("📱 Received URL: \(url)")
                    
                    // ユニバーサルリンク処理: /invite/[referrerId]
                    if let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
                       let pathComponents = Optional(components.path.split(separator: "/").map(String.init)),
                       pathComponents.count >= 2,
                       pathComponents[0] == "invite" {
                        
                        let referrerId = pathComponents[1]
                        print("🎉 Invited by: \(referrerId)")
                        
                        // バックエンドに通知
                        Task {
                            // ログイン済みなら即通知
                            if let userId = appState.currentUser?.id {
                                do {
                                    try await APIService.shared.registerReferral(referrerId: referrerId, userId: userId)
                                    print("✅ Referral registered successfully")
                                } catch {
                                    print("⚠️ Failed to register referral: \(error)")
                                }
                            } else {
                                // 未ログイン時は保存しておき、ログイン後に処理
                                UserDefaults.standard.set(referrerId, forKey: "pendingReferrerId")
                                print("💾 Pending referrer saved: \(referrerId)")
                            }
                        }
                    }

                    // LINE SDK (URL Scheme)
                    if LoginManager.shared.application(.shared, open: url) {
                        return
                    }
                    // Google Sign In
                    if GIDSignIn.sharedInstance.handle(url) {
                        return
                    }
                }
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { userActivity in
                    if let url = userActivity.webpageURL {
                        print("🌐 Received Universal Link: \(url)")
                        // LINE SDK (Universal Link) - Universal Linkもopenで処理します
                        _ = LoginManager.shared.application(.shared, open: url)
                    }
                }
        }
    }
}

/// アプリ全体の状態を管理するクラス（例：ログイン状態など）
final class AppStateManager: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var isLoading: Bool = true // 初期ロード中フラグ
    @Published var currentUser: User?
    @Published var userPlan: String = "FREE"
    
    // セッション復元（Firebase初期化後に呼ぶこと）
    func restoreSession() {
        if let user = Auth.auth().currentUser {
            print("🔄 Restoring session for user: \(user.uid)")
            self.currentUser = User(
                id: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL?.absoluteString
            )
            self.isLoggedIn = true
            
            // IDトークンを取得してAPIServiceにセットし、バックエンドと同期
            user.getIDToken { token, error in
                if let token = token {
                    print("🔑 Restored ID Token: \(String(token.prefix(10)))...")
                    APIService.shared.authToken = token
                    AuthService.shared.idToken = token // AuthServiceにもトークンをセット
                    
                    // バックエンド同期 (非同期で実行)
                    Task {
                        // AuthServiceのprivate関数syncUserWithBackendを呼べないので、
                        // ここで直接APIService経由かAuthServiceのpublicメソッドを作るのが綺麗ですが、
                        // 既存のAuthService.shared.signIn...系は使いにくいので、
                        // 同期専用の処理を呼び出します（AuthService側で実装が必要ですが、現行のLoginViewのロジックを参考にします）
                        // 一旦、ログだけ出しておき、AuthServiceにpublicなsyncメソッドを追加する方針とします
                        do {
                            // usageも戻り値として受け取るようにAuthServiceを修正予定
                            let (dbUserId, plan, usage) = try await AuthService.shared.syncUserSession(token: token)
                            DispatchQueue.main.async {
                                self.userPlan = plan
                                
                                // Internal ID (DB ID) でユーザー情報を更新
                                if let current = self.currentUser {
                                    self.currentUser = User(
                                        id: dbUserId,
                                        displayName: current.displayName,
                                        email: current.email,
                                        photoURL: current.photoURL,
                                        usage: usage
                                    )
                                    print("✅ Updated currentUser with DB ID: \(dbUserId), Usage: \(String(describing: usage))")
                                }
                            }
                        } catch {
                            print("⚠️ Failed to restore session sync: \(error)")
                        }
                    }
                } else {
                    print("⚠️ Failed to restore ID Token: \(error?.localizedDescription ?? "Unknown error")")
                }
            }
            
            // 課金状態の確認開始
            self.checkSubscriptionStatus()
        } else {
            print("⚪️ No active session found")
            self.isLoggedIn = false
        }
        self.isLoading = false
    }
    
    // ログアウト処理
    func signOut() {
        do {
            try AuthService.shared.signOut()
            self.isLoggedIn = false
            self.currentUser = nil
            self.userPlan = "FREE" // デフォルトに戻す
            print("👋 User signed out")
        } catch {
            print("⚠️ Failed to sign out: \(error)")
        }
    }

    // アカウント削除
    func deleteAccount() async throws {
        guard let user = Auth.auth().currentUser else { return }
        
        // Firebase Authから削除
        try await user.delete()
        
        // ログアウト処理と同様にローカル状態をクリア
        await MainActor.run {
            self.signOut()
        }
        
        print("👋 Account deleted successfully")
    }
    
    // ログイン成功時の処理
    func loginSuccess(user: User, token: String) {
        APIService.shared.authToken = token
        AuthService.shared.idToken = token
        self.currentUser = user
        self.isLoggedIn = true
        self.userPlan = "FREE" // 一旦リセット
        
        // 課金状態の監視開始
        self.checkSubscriptionStatus()
        print("✅ User logged in and RevenueCat listener started")
    }
    
    /// ユーザー情報を保持する構造体
    struct User: Identifiable, Codable {
        let id: String // Firebase UID
        var displayName: String?
        var email: String?
        var photoURL: String?
        var usage: Usage?
    }
    
    /// 利用状況
    struct Usage: Codable {
        let dailyVoiceCount: Int
        let monthlyVoiceMinutes: Int
        let purchasedVoiceBalance: Int
    }
    
    // MARK: - RevenueCat Integration
    
    /// RevenueCatの状態を確認 (外部から呼び出し可能)
    func checkSubscriptionStatus() {
        print("👀 Checking subscription status...")
        Purchases.shared.getCustomerInfo { (customerInfo, error) in
            if let info = customerInfo {
                self.updateUserPlan(with: info)
            }
        }
    }
    
    @Published var expirationDate: Date? = nil // 有効期限

    /// CustomerInfoからプラン情報を更新
    func updateUserPlan(with customerInfo: CustomerInfo) {
        // [DEBUG] 全Entitlementsの出力
        print("👀 Checking Entitlements: \(customerInfo.entitlements.all.keys)")
        for (key, entitlement) in customerInfo.entitlements.all {
            print("   - \(key): isActive=\(entitlement.isActive), willRenew=\(entitlement.willRenew)")
        }

        // "premium" という識別子のエンタイトルメントを確認
        // RevenueCatのダッシュボードで設定したEntitlement IDに合わせてください
        
        let newPlan: String
        var newExpirationDate: Date? = nil
        
        if let entitlement = customerInfo.entitlements["jibunAI-premium"], entitlement.isActive {
            print("💎 User has PLATINUM/PREMIUM entitlement! (jibunAI-premium)")
            newPlan = "PREMIUM"
            newExpirationDate = entitlement.expirationDate
        } else if let entitlement = customerInfo.entitlements["jibunAI-standard"], entitlement.isActive {
             print("🔷 User has STANDARD entitlement! (jibunAI-standard)")
             newPlan = "STANDARD"
             newExpirationDate = entitlement.expirationDate
        } else {
            print("⚪️ User is on FREE plan (No active entitlement found for 'jibunAI-premium' or 'jibunAI-standard')")
            newPlan = "FREE"
            newExpirationDate = nil
        }
        
        // UI更新
        DispatchQueue.main.async {
            self.userPlan = newPlan
            self.expirationDate = newExpirationDate
        }
        
        // バックエンド同期 (プラン変更時)
        Task {
            do {
                try await AuthService.shared.syncUserPlan(plan: newPlan)
                
                // プラン更新後に最新のユーザー情報を再取得する (クレジットや制限の更新のため)
                print("🔄 Refreshing user profile from backend...")
                if let token = AuthService.shared.idToken {
                    let _ = try await AuthService.shared.syncUserSession(token: token)
                    print("✅ User profile refreshed after plan update")
                }
            } catch {
                print("⚠️ Failed to sync plan or refresh profile: \(error)")
            }
        }
    }
}


