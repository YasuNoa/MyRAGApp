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
import RevenueCat
import LineSDK
import GoogleSignIn
import RevenueCat

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
        #if DEBUG
        // 開発環境 (Test Key)
        let revenueCatAPIKey = "test_qdNjRyszbNUViaJgRoYXvDwnpAo"
        print("🔧 Running in DEBUG mode with Test Key")
        #else
        // 本番環境 (Prod Key) - Info.plistから読み込むか、ここで指定
        // Info.plistの値がProd用になっているのでそれを使う、または安全のため直接指定も可
        let revenueCatAPIKey = "sk_gMlJifwmHuPPcvweJXyXxqPJWdhjm" 
        print("🚀 Running in RELEASE mode with Prod Key")
        #endif
        
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
                            let (dbUserId, plan) = try await AuthService.shared.syncUserSession(token: token)
                            DispatchQueue.main.async {
                                self.userPlan = plan
                                
                                // Internal ID (DB ID) でユーザー情報を更新
                                if let current = self.currentUser {
                                    self.currentUser = User(
                                        id: dbUserId,
                                        displayName: current.displayName,
                                        email: current.email,
                                        photoURL: current.photoURL
                                    )
                                    print("✅ Updated currentUser with DB ID: \(dbUserId)")
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
            self.setupRevenueCatListener()
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
    
    // ログイン成功時の処理
    func loginSuccess(user: User, token: String) {
        APIService.shared.authToken = token
        AuthService.shared.idToken = token
        self.currentUser = user
        self.isLoggedIn = true
        self.userPlan = "FREE" // 一旦リセット
        
        // 課金状態の監視開始
        self.setupRevenueCatListener()
        print("✅ User logged in and RevenueCat listener started")
    }
    
    /// ユーザー情報を保持する構造体
    struct User: Identifiable, Codable {
        let id: String // Firebase UID
        var displayName: String?
        var email: String?
        var photoURL: String?
    }
    
    // MARK: - RevenueCat Integration
    
    /// RevenueCatの状態監視を開始
    private func setupRevenueCatListener() {
        print("👀 Setting up RevenueCat listener...")
        Purchases.shared.getCustomerInfo { (customerInfo, error) in
            if let info = customerInfo {
                self.updateUserPlan(with: info)
            }
        }
    }
    
    /// CustomerInfoからプラン情報を更新
    func updateUserPlan(with customerInfo: CustomerInfo) {
        // "premium" という識別子のエンタイトルメントを確認
        // RevenueCatのダッシュボードで設定したEntitlement IDに合わせてください
        
        let newPlan: String
        if customerInfo.entitlements["premium"]?.isActive == true {
            print("💎 User has PLATINUM/PREMIUM entitlement!")
            newPlan = "PREMIUM"
        } else if customerInfo.entitlements["standard"]?.isActive == true {
             print("🔷 User has STANDARD entitlement!")
             newPlan = "STANDARD"
        } else {
            print("⚪️ User is on FREE plan")
            newPlan = "FREE"
        }
        
        // UI更新
        DispatchQueue.main.async {
            self.userPlan = newPlan
        }
        
        // バックエンド同期 (プラン変更時)
        Task {
            do {
                try await AuthService.shared.syncUserPlan(plan: newPlan)
            } catch {
                print("⚠️ Failed to sync plan: \(error)")
            }
        }
    }
}


