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
import GoogleSignIn
import LineSDK

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
            AppRootView()
                .environmentObject(appState)
                .onOpenURL { url in
                    print("📱 Received URL: \(url)")
                    handleIncomingURL(url)
                }
                // Universal Link のハンドリング
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { userActivity in
                    print("🌐 Received Universal Link")
                    if let url = userActivity.webpageURL {
                        print("   URL: \(url)")
                        handleUniversalLink(url, appState: appState)
                    }
                }
        }
    }
    
    // URL Scheme ハンドリング
    private func handleIncomingURL(_ url: URL) {
        if url.scheme == "line3rdp" {
            print("🟢 Handling LINE URL Scheme")
            _ = LoginManager.shared.application(.shared, open: url)
        } else if url.scheme?.contains("com.yasu.jibunAI-ios") == true {
            print("🔵 Handling custom URL Scheme")
            handleCustomScheme(url, appState: appState)
        } else {
            print("🔵 Handling Google URL")
            GIDSignIn.sharedInstance.handle(url)
        }
    }
    
    // Universal Link ハンドリング
    private func handleUniversalLink(_ url: URL, appState: AppStateManager) {
        print("🌐 Processing Universal Link: \(url)")
        
        // /line-auth/callback?code=xxx&state=yyy のパース
        if url.path.contains("/line-auth/callback") {
            print("🟢 LINE auth callback received via Universal Link")
            
            guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                  let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
                print("❌ Failed to extract code from Universal Link")
                return
            }
            
            print("✅ LINE auth code: \(code)")
            
            // LINE認証コードを処理
            Task {
                await handleLINEAuthCode(code, appState: appState)
            }
        }
    }
    
    // カスタム URL Scheme ハンドリング
    private func handleCustomScheme(_ url: URL, appState: AppStateManager) {
        print("🔵 Custom scheme: \(url.host ?? "nil")")
        
        // com.yasu.jibunAI-ios://line-callback?code=xxx
        if url.host == "line-callback" {
            guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                  let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
                print("❌ Failed to extract code from custom scheme")
                return
            }
            
            print("✅ LINE auth code from custom scheme: \(code)")
            
            Task {
                await handleLINEAuthCode(code, appState: appState)
            }
        }
    }
    
    // LINE認証コード処理
    private func handleLINEAuthCode(_ code: String, appState: AppStateManager) async {
        print("🟢 Processing LINE auth code...")
        
        do {
            // バックエンドにコードを送信してFirebase Custom Tokenを取得
            let url = URL(string: "https://jibun-ai.com/api/auth/line/exchange")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let body = ["code": code]
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            
            let (data, _) = try await URLSession.shared.data(for: request)
            let response = try JSONDecoder().decode([String: String].self, from: data)
            
            guard let firebaseToken = response["firebaseToken"] else {
                print("❌ No Firebase token in response")
                return
            }
            
            // Firebase Custom Token でサインイン
            let authResult = try await Auth.auth().signIn(withCustomToken: firebaseToken)
            let idToken = try await authResult.user.getIDToken()
            
            print("✅ LINE authentication completed!")
            print("   User ID: \(authResult.user.uid)")
            
            await MainActor.run {
                // AppState を更新
                appState.currentUser = AppStateManager.User(
                    id: authResult.user.uid,
                    displayName: authResult.user.displayName,
                    email: authResult.user.email,
                    photoURL: authResult.user.photoURL?.absoluteString
                )
                appState.isLoggedIn = true
                
                // API Service にトークンをセット
                APIService.shared.authToken = idToken
            }
            
        } catch {
            print("❌ LINE authentication failed: \(error)")
        }
    }
}

/// アプリ全体の状態を管理するクラス（例：ログイン状態など）
final class AppStateManager: ObservableObject {
    // ここにアプリ全体で共有したい状態を定義する（例: ログイン済みかどうか）
    @Published var isLoggedIn: Bool = false
    @Published var currentUser: User?
    @Published var userPlan: String = "FREE"
    
    /// ユーザー情報を保持する構造体
    struct User: Identifiable, Codable {
        let id: String // Firebase UID
        var displayName: String?
        var email: String?
        var photoURL: String?
    }
}

