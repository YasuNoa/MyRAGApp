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
        AppLogger.general.info("🚀 App initializing...")
        
        // Firebase初期化
        FirebaseApp.configure()
        AppLogger.general.info("✅ Firebase configured")
        
        // RevenueCat初期化
        // Info.plistから読み込む
        let revenueCatAPIKey = Bundle.main.object(forInfoDictionaryKey: "RevenueCatAPIKey") as? String ?? ""
        if revenueCatAPIKey.isEmpty {
            AppLogger.general.warning("⚠️ RevenueCatAPIKey not found in Info.plist")
        } else {
            AppLogger.billing.info("🚀 RevenueCat configured with key from Info.plist")
        }
        
        Purchases.logLevel = .debug
        Purchases.configure(withAPIKey: revenueCatAPIKey)
        AppLogger.billing.info("✅ RevenueCat configured")
        
        // LINE SDK初期化
        LineAuthManager.shared.setup(channelID: AppConfig.lineChannelId)
        AppLogger.auth.info("✅ LINE SDK configured")
        
        // GoogleService-Info.plist の確認
        if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") {
            AppLogger.general.info("✅ GoogleService-Info.plist found at: \(path)")
        } else {
            AppLogger.general.error("❌ GoogleService-Info.plist NOT FOUND")
        }
        
        // Client ID の確認
        // Client ID Check
        if let clientID = FirebaseApp.app()?.options.clientID {
            let masked = String(clientID.prefix(10)) + "..."
            AppLogger.auth.info("✅ Firebase Client ID: \(masked)")
        } else {
            AppLogger.auth.error("❌ Firebase Client ID NOT FOUND")
        }
        
        // 【デバッグ】StoreKit直接確認
        Task {
            AppLogger.billing.debug("🛒 DEBUG: Starting StoreKit product fetch check...")
            do {
                // StoreKit 2 API
                let products = try await Product.products(for: ["com.jibunai.standard.monthly", "com.jibunai.premium.monthly", "com.jibunai.standard.yearly", "com.jibunai.premium.yearly"])
                AppLogger.billing.debug("🛒 DEBUG: StoreKit found \(products.count) products")
                for p in products {
                     AppLogger.billing.debug("   - FOUND: \(p.id): \(p.displayName) \(p.displayPrice)")
                }
                if products.isEmpty {
                    AppLogger.billing.warning("🛒 DEBUG: ⚠️ StoreKit returned 0 products. Check Scheme > StoreKit Configuration.")
                }
            } catch {
                AppLogger.billing.error("🛒 DEBUG: ❌ Failed to fetch products from StoreKit: \(error)")
            }
        }
    }
    
    var body: some Scene {
        WindowGroup {
            // ルートビューとしてAppRootViewを表示し、appStateを環境オブジェクトとして渡す
            AppRootView()
                .environmentObject(appState) // appStateを環境オブジェクトとして渡すことで全体で利用可能にする
                .onOpenURL { url in
                    AppLogger.general.info("📱 Received URL: \(url)")
                    
                    // ユニバーサルリンク処理: /invite/[referrerId]
                    if let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
                       let pathComponents = Optional(components.path.split(separator: "/").map(String.init)),
                       pathComponents.count >= 2,
                       pathComponents[0] == "invite" {
                        
                        let referrerId = pathComponents[1]
                        AppLogger.general.info("🎉 Invited by: \(referrerId)")
                        
                        // バックエンドに通知
                        Task {
                            // ログイン済みなら即通知
                            if let userId = appState.currentUser?.id {
                                do {
                                    try await APIService.shared.registerReferral(referrerId: referrerId, userId: userId)
                                    AppLogger.network.info("✅ Referral registered successfully")
                                } catch {
                                    AppLogger.network.error("⚠️ Failed to register referral: \(error)")
                                }
                            } else {
                                // 未ログイン時は保存しておき、ログイン後に処理
                                UserDefaults.standard.set(referrerId, forKey: "pendingReferrerId")
                                AppLogger.general.info("💾 Pending referrer saved: \(referrerId)")
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
                        AppLogger.general.info("🌐 Received Universal Link: \(url)")
                        // LINE SDK (Universal Link) - Universal Linkもopenで処理します
                        _ = LoginManager.shared.application(.shared, open: url)
                    }
                }
        }
    }
}

/// アプリ全体の状態を管理するクラス（例：ログイン状態など）
@MainActor
final class AppStateManager: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var isLoading: Bool = true // 初期ロード中フラグ
    @Published var currentUser: User?
    @Published var userPlan: String = "FREE"
    
    // セッション復元タスク管理用
    private var restoreSessionTask: Task<Void, Never>?

    // セッション復元（Firebase初期化後に呼ぶこと）
    func restoreSession() {
        // 既存のタスクがあればキャンセル（競合防止）
        restoreSessionTask?.cancel()
        
        guard let user = Auth.auth().currentUser else {
            AppLogger.auth.info("⚪️ No active session found")
            self.isLoggedIn = false
            self.isLoading = false
            return
        }
        
        restoreSessionTask = Task {
            // 初期状態設定
            self.isLoading = true
            
            #if DEBUG
            AppLogger.auth.debug("🔄 Restoring session for user: \(user.uid)")
            #endif
            
            // 仮のユーザー情報で更新（これだけでは不完全）
            self.currentUser = User(
                id: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL?.absoluteString
            )
            
            var retryCount = 0
            let maxRetries = 5 // 初回 + 4回リトライ
            
            while !Task.isCancelled {
                do {
                    // 1. Firebase ID Token取得
                    let token = try await user.getIDToken(forceRefresh: true)
                    
                    // MainActorコンテキスト
                    APIService.shared.authToken = token
                    AuthService.shared.idToken = token
                    
                    // 2. バックエンド同期
                    let (dbUserId, plan, usage) = try await AuthService.shared.syncUserSession(token: token)
                    
                    // 3. 成功時: 状態更新
                    self.userPlan = plan
                    self.isLoggedIn = true // ここで初めてログイン完了とする案もあるが、UI遷移の都合上タイミングは要検討。現状はisLoading=falseで制御。
                    
                    if let current = self.currentUser {
                        self.currentUser = User(
                            id: dbUserId,
                            displayName: current.displayName,
                            email: current.email,
                            photoURL: current.photoURL,
                            usage: usage
                        )
                    }
                    
                    #if DEBUG
                    AppLogger.auth.debug("✅ Session restored & Synced: \(dbUserId)")
                    #endif
                    
                    self.checkSubscriptionStatus()
                    self.isLoading = false // ロード完了
                    return // タスク終了
                    
                } catch {
                    if Task.isCancelled { return }
                    
                    AppLogger.auth.error("⚠️ Failed to restore session (Attempt \(retryCount + 1)/\(maxRetries)): \(error)")
                    
                    retryCount += 1
                    if retryCount >= maxRetries {
                       
                         retryCount = 0 // 無限リトライモード（またはエラーダイアログ用Stateが必要）
                         try? await Task.sleep(nanoseconds: 10 * 1_000_000_000) // 10秒待機
                    } else {
                        // 指数バックオフ待ち
                        let delay = UInt64(pow(2.0, Double(retryCount))) * 1_000_000_000
                        try? await Task.sleep(nanoseconds: delay)
                    }
                }
            }
        }
    }
    
    // ログアウト処理
    func signOut() async {
        // VoiceNoteViewModelのクリーンアップ (録音データの自動保存など)
        if let userId = currentUser?.id {
            AppLogger.auth.info("⏳ Cleaning up VoiceNoteViewModel before sign out...")
            await VoiceNoteViewModel.shared.cleanup(userId: userId)
        }
        
        do {
            try AuthService.shared.signOut()
            self.isLoggedIn = false
            self.currentUser = nil
            self.userPlan = "FREE" // デフォルトに戻す
            AppLogger.auth.info("👋 User signed out")
        } catch {
            AppLogger.auth.error("⚠️ Failed to sign out: \(error)")
        }
    }

    // アカウント削除
    func deleteAccount() async throws {
        guard let user = Auth.auth().currentUser else { return }
        
        // Firebase Authから削除
        try await user.delete()
        
        // ログアウト処理と同様にローカル状態をクリア
        await self.signOut()
        
        AppLogger.auth.info("👋 Account deleted successfully")
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
        AppLogger.auth.info("✅ User logged in and RevenueCat listener started")
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
        AppLogger.billing.debug("👀 Checking subscription status...")
        Purchases.shared.getCustomerInfo { [weak self] (customerInfo, error) in
            guard let self = self else { return }
            if let info = customerInfo {
                self.updateUserPlan(with: info)
            }
        }
    }
    
    @Published var expirationDate: Date? = nil // 有効期限

    /// CustomerInfoからプラン情報を更新
    func updateUserPlan(with customerInfo: CustomerInfo) {
        // [DEBUG] 全Entitlementsの出力
        AppLogger.billing.debug("👀 Checking Entitlements: \(customerInfo.entitlements.all.keys)")
        for (key, entitlement) in customerInfo.entitlements.all {
            AppLogger.billing.debug("   - \(key): isActive=\(entitlement.isActive), willRenew=\(entitlement.willRenew)")
        }

        // "premium" という識別子のエンタイトルメントを確認
        // RevenueCatのダッシュボードで設定したEntitlement IDに合わせてください
        
        let newPlan: String
        var newExpirationDate: Date? = nil
        
        if let entitlement = customerInfo.entitlements["jibunAI-premium"], entitlement.isActive {
            AppLogger.billing.info("💎 User has PLATINUM/PREMIUM entitlement! (jibunAI-premium)")
            newPlan = "PREMIUM"
            newExpirationDate = entitlement.expirationDate
        } else if let entitlement = customerInfo.entitlements["jibunAI-standard"], entitlement.isActive {
             AppLogger.billing.info("🔷 User has STANDARD entitlement! (jibunAI-standard)")
             newPlan = "STANDARD"
             newExpirationDate = entitlement.expirationDate
        } else {
            AppLogger.billing.info("⚪️ User is on FREE plan (No active entitlement found for 'jibunAI-premium' or 'jibunAI-standard')")
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
                AppLogger.network.debug("🔄 Refreshing user profile from backend...")
                if let token = AuthService.shared.idToken {
                    let _ = try await AuthService.shared.syncUserSession(token: token)
                    AppLogger.network.info("✅ User profile refreshed after plan update")
                }
            } catch {
                AppLogger.network.error("⚠️ Failed to sync plan or refresh profile: \(error)")
            }
        }
    }
}


