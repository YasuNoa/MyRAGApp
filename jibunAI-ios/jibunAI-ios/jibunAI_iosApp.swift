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
        // Info.plist から API Key を読み込む
        if let revenueCatAPIKey = Bundle.main.object(forInfoDictionaryKey: "RevenueCatAPIKey") as? String,
           !revenueCatAPIKey.isEmpty,
           revenueCatAPIKey != "YOUR_REVENUECAT_API_KEY" {
            Purchases.logLevel = .debug
            Purchases.configure(withAPIKey: revenueCatAPIKey)
            print("✅ RevenueCat configured with Key from Info.plist")
        } else {
            print("⚠️ RevenueCat API Key NOT FOUND or is Placeholder in Info.plist")
            print("   Please update 'RevenueCatAPIKey' in Info.plist")
            // 開発用フォールバック（必要ならここに直書きキーを入れることも可）
        }
        
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
                            let plan = try await AuthService.shared.syncUserSession(token: token)
                            DispatchQueue.main.async {
                                self.userPlan = plan
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


