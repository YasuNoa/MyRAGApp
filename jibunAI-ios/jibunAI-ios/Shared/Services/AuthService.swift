//
//  AuthService.swift
//  jibunAI-ios
//
//  Firebase認証サービス
//  Google, LINE, Apple, Microsoft の各プロバイダーに対応
//

import AuthenticationServices
import Combine
import FirebaseAuth
import FirebaseCore
import Foundation
import GoogleSignIn
import KeychainAccess
import SwiftUI
import CryptoKit

enum AuthError: LocalizedError {
    case googleSignInFailed(String)
    case appleSignInFailed(String)
    case lineSignInFailed(String)
    case microsoftSignInFailed(String)
    case tokenRetrievalFailed
    case userNotFound
    case nonceGenerationFailed

    var errorDescription: String? {
        switch self {
        case .googleSignInFailed(let message):
            return "Google ログインに失敗しました: \(message)"
        case .appleSignInFailed(let message):
            return "Apple ログインに失敗しました: \(message)"
        case .lineSignInFailed(let message):
            return "LINE ログインに失敗しました: \(message)"
        case .microsoftSignInFailed(let message):
            return "Microsoft ログインに失敗しました: \(message)"
        case .tokenRetrievalFailed:
            return "認証トークンの取得に失敗しました"
        case .userNotFound:
            return "ユーザー情報が見つかりません"
        case .nonceGenerationFailed:
            return "Nonceの生成に失敗しました"
        }
    }
}

@MainActor
class AuthService: ObservableObject {

    static let shared = AuthService()

    @Published var currentUser: User?
    @Published var idToken: String?

    private init() {
        // 現在のユーザーをチェック
        if let firebaseUser = Auth.auth().currentUser {
            updateCurrentUser(from: firebaseUser)
        }
    }

    // MARK: - Google Sign-In

    func signInWithGoogle() async throws -> (user: AppStateManager.User, token: String) {
        guard let clientID = FirebaseApp.app()?.options.clientID else {
            throw AuthError.googleSignInFailed("Firebase Client IDが見つかりません")
        }

        let config = GIDConfiguration(clientID: clientID)
        GIDSignIn.sharedInstance.configuration = config

        // ルートビューコントローラーを取得
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
            let rootViewController = windowScene.windows.first?.rootViewController
        else {
            throw AuthError.googleSignInFailed("ウィンドウが見つかりません")
        }

        do {
            let result = try await GIDSignIn.sharedInstance.signIn(
                withPresenting: rootViewController)
            let user = result.user

            guard let idToken = user.idToken?.tokenString else {
                throw AuthError.googleSignInFailed("IDトークンが取得できません")
            }

            let accessToken = user.accessToken.tokenString

            // Firebaseで認証
            let credential = GoogleAuthProvider.credential(
                withIDToken: idToken, accessToken: accessToken)
            let authResult = try await Auth.auth().signIn(with: credential)

            // Firebase IDトークンを取得
            let firebaseToken = try await authResult.user.getIDToken()

            // バックエンドと同期
            let (dbUserId, _, usage) = try await syncUserWithBackend(providerId: authResult.user.uid, token: firebaseToken)
            
            // ユーザー情報を更新
            let appUser = AppStateManager.User(
                id: dbUserId, // Use DB ID
                displayName: authResult.user.displayName ?? user.profile?.name,
                email: authResult.user.email ?? user.profile?.email,
                photoURL: authResult.user.photoURL?.absoluteString,
                usage: usage
            )

            updateCurrentUser(from: authResult.user)
            self.idToken = firebaseToken

            return (appUser, firebaseToken)

        } catch {
            throw AuthError.googleSignInFailed(error.localizedDescription)
        }
    }

    // MARK: - Apple Sign-In

    // MARK: - Apple Sign-In

    func signInWithApple(authorization: ASAuthorization, nonce: String) async throws -> (
        user: AppStateManager.User, token: String
    ) {
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential
        else {
            throw AuthError.appleSignInFailed("認証情報が取得できません")
        }

        guard let appleIDToken = appleIDCredential.identityToken,
            let idTokenString = String(data: appleIDToken, encoding: .utf8)
        else {
            throw AuthError.appleSignInFailed("IDトークンが取得できません")
        }

        // OAuthProvider.appleCredentialを使用 (Static Helper)
        // 渡されたnonceを使用する
        let credential = OAuthProvider.appleCredential(
            withIDToken: idTokenString,
            rawNonce: nonce,
            fullName: nil
        )

        do {
            let authResult = try await Auth.auth().signIn(with: credential)
            let firebaseToken = try await authResult.user.getIDToken()

            // バックエンドと同期
            let (dbUserId, _, usage) = try await syncUserWithBackend(providerId: authResult.user.uid, token: firebaseToken)
            
            let appUser = AppStateManager.User(
                id: dbUserId, // Use DB ID
                displayName: authResult.user.displayName ?? appleIDCredential.fullName?.givenName,
                email: authResult.user.email ?? appleIDCredential.email,
                photoURL: authResult.user.photoURL?.absoluteString,
                usage: usage
            )

            updateCurrentUser(from: authResult.user)
            self.idToken = firebaseToken

            return (appUser, firebaseToken)

        } catch {
            throw AuthError.appleSignInFailed(error.localizedDescription)
        }
    }
    
    // ...

    // MARK: - Helper Methods
    
    // ...

    // Apple Sign-In用のNonce生成
    static func randomNonceString(length: Int = 32) throws -> String {
        precondition(length > 0)
        let charset: [Character] = Array(
            "0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remainingLength = length

        while remainingLength > 0 {
            let randoms: [UInt8] = try (0..<16).map { _ in
                var random: UInt8 = 0
                let errorCode = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
                if errorCode != errSecSuccess {
                    throw AuthError.nonceGenerationFailed
                }
                return random
            }

            randoms.forEach { random in
                if remainingLength == 0 {
                    return
                }

                if random < charset.count {
                    result.append(charset[Int(random)])
                    remainingLength -= 1
                }
            }
        }

        return result
    }
    
    // Nonceのハッシュ化 (SHA256)
    static func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        let hashString = hashedData.compactMap {
            return String(format: "%02x", $0)
        }.joined()

        return hashString
    }

    // MARK: - Microsoft Sign-In

    func signInWithMicrosoft() async throws -> (user: AppStateManager.User, token: String) {
        // Microsoft認証プロバイダー
        let provider = OAuthProvider(providerID: "microsoft.com")

        // スコープ設定（必要に応じてカスタマイズ）
        provider.scopes = ["email", "profile"]

        // カスタムパラメータ（オプション）
        provider.customParameters = [
            "prompt": "select_account"  // アカウント選択を強制
        ]

        do {
            let authResult = try await provider.credential(with: nil)
            let result = try await Auth.auth().signIn(with: authResult)
            let firebaseToken = try await result.user.getIDToken()

            // バックエンドと同期
            let (dbUserId, _, usage) = try await syncUserWithBackend(providerId: result.user.uid, token: firebaseToken)
            
            let appUser = AppStateManager.User(
                id: dbUserId, // Use DB ID
                displayName: result.user.displayName,
                email: result.user.email,
                photoURL: result.user.photoURL?.absoluteString,
                usage: usage
            )

            updateCurrentUser(from: result.user)
            self.idToken = firebaseToken

            return (appUser, firebaseToken)

        } catch {
            throw AuthError.microsoftSignInFailed(error.localizedDescription)
        }
    }

    // MARK: - LINE Sign-In (Custom Token方式)

    // LINEはFirebaseの公式プロバイダーではないため、カスタムトークン方式を使用
    // バックエンド側で LINE → Firebase Custom Token 変換が必要
    func signInWithLINE(lineAccessToken: String) async throws -> (
        user: AppStateManager.User, token: String
    ) {
        // バックエンドのエンドポイントでLINEトークンをFirebaseカスタムトークンに変換
        // 注: この部分はバックエンド側の実装が必要

        struct LineAuthRequest: Codable {
            let lineAccessToken: String
        }

        struct LineAuthResponse: Codable {
            let firebaseToken: String
        }

        guard let url = URL(string: "\(APIService.authBaseURL)/api/auth/line") else {
            throw AuthError.lineSignInFailed("不正なURLです")
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = LineAuthRequest(lineAccessToken: lineAccessToken)
        request.httpBody = try JSONEncoder().encode(body)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                httpResponse.statusCode == 200
            else {
                throw AuthError.lineSignInFailed("バックエンド認証に失敗しました")
            }

            let authResponse = try JSONDecoder().decode(LineAuthResponse.self, from: data)
            let customToken = authResponse.firebaseToken

            // Firebaseカスタムトークンでサインイン
            let authResult = try await Auth.auth().signIn(withCustomToken: customToken)
            let firebaseToken = try await authResult.user.getIDToken()

            // バックエンドと同期
            let (dbUserId, _, usage) = try await syncUserWithBackend(providerId: authResult.user.uid, token: firebaseToken)
            
            let appUser = AppStateManager.User(
                id: dbUserId, // Use DB ID
                displayName: authResult.user.displayName,
                email: authResult.user.email,
                photoURL: authResult.user.photoURL?.absoluteString,
                usage: usage
            )

            updateCurrentUser(from: authResult.user)
            self.idToken = firebaseToken
            
            return (appUser, firebaseToken)

        } catch {
            throw AuthError.lineSignInFailed(error.localizedDescription)
        }
    }

    // MARK: - Sign Out

    func signOut() throws {
        try Auth.auth().signOut()
        GIDSignIn.sharedInstance.signOut()

        currentUser = nil
        idToken = nil
        APIService.shared.authToken = nil
        
        // Clear persisted internal ID
        let keychain = Keychain(service: "com.jibunai.ios").accessibility(.afterFirstUnlock)
        try? keychain.remove("internalUserId")
    }

    // MARK: - Session Management
    
    /// セッション復元時にバックエンドと同期するための公開メソッド
    func syncUserSession(token: String) async throws -> (id: String, plan: String, usage: AppStateManager.Usage?) {
        guard let providerId = Auth.auth().currentUser?.uid else {
            throw AuthError.userNotFound
        }
        return try await syncUserWithBackend(providerId: providerId, token: token)
    }
    
    // MARK: - Helper Methods

    private func updateCurrentUser(from firebaseUser: User) {
        currentUser = firebaseUser
    }

    private func syncUserWithBackend(providerId: String, token: String) async throws -> (id: String, plan: String, usage: AppStateManager.Usage?) {
        // バックエンドの /api/auth/sync エンドポイントを叩く (Next.js)
        guard let url = URL(string: "\(APIService.authBaseURL)/api/auth/sync") else {
             throw AuthError.tokenRetrievalFailed // Invalid URL case
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        struct SyncRequest: Codable {
            let providerId: String
            let email: String?
            let displayName: String?
            let photoURL: String?
            let internalId: String?
        }
        
        // 保存済みのInternal IDがあれば取得
        let keychain = Keychain(service: "com.jibunai.ios").accessibility(.afterFirstUnlock)
        let internalId = try? keychain.getString("internalUserId")

        let body = SyncRequest(
            providerId: providerId,
            email: currentUser?.email,
            displayName: currentUser?.displayName,
            photoURL: currentUser?.photoURL?.absoluteString,
            internalId: internalId
        )
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
            (200...299).contains(httpResponse.statusCode)
        else {
             let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
             AppLogger.auth.error("⚠️ バックエンド同期に失敗しました: Status \(statusCode)")
             if let errorText = String(data: data, encoding: .utf8) {
                 AppLogger.auth.error("Response: \(errorText)")
             }
             throw AuthError.tokenRetrievalFailed 
        }
        AppLogger.auth.info("✅ User synced with backend")
        
        // レスポンスからInternal ID (CUID) を取得して保存
        struct SyncResponse: Codable {
            let success: Bool
            let user: BackendUser
            let status: String
        }
        
        struct BackendUser: Codable {
            let id: String
            let email: String?
            let name: String?
            let plan: String?
            let usage: AppStateManager.Usage?
        }
        
        
        do {
            let syncResponse = try JSONDecoder().decode(SyncResponse.self, from: data)
            let internalUserId = syncResponse.user.id
            let userPlan = syncResponse.user.plan ?? "FREE"
            let usage = syncResponse.user.usage
            
            // CUIDを永続化 (次回のSyncで使用) - Keychainに保存
            let keychain = Keychain(service: "com.jibunai.ios").accessibility(.afterFirstUnlock)
            try? keychain.set(internalUserId, key: "internalUserId")
            #if DEBUG
            AppLogger.auth.debug("💾 Saved Internal User ID: \(internalUserId)")
            #endif
            
            return (internalUserId, userPlan, usage)
            
        } catch {
            AppLogger.auth.error("⚠️ Failed to parse sync response for Internal ID: \(error)")
            // パース失敗時でも同期自体は成功していれば続行。プランはデフォルトのFREEを返す
            // IDが取得できない場合は、暫定的にFirebase UIDを返すが、これは不完全な状態
            return (providerId, "FREE", nil)
        }
    }
    
    // MARK: - Plan Synchronization
    
    func syncUserPlan(plan: String) async throws {
        guard let token = idToken, let providerId = currentUser?.uid else {
             AppLogger.auth.warning("⚠️ Cannot sync plan: No valid session")
             return
        }
        
        
        
        guard let url = URL(string: "\(APIService.authBaseURL)/api/user/plan") else {
             AppLogger.auth.error("⚠️ Cannot sync plan: Invalid URL")
             return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        struct UpdatePlanRequest: Codable {
            let providerId: String
            let plan: String
        }
        
        let body = UpdatePlanRequest(providerId: providerId, plan: plan)
        request.httpBody = try JSONEncoder().encode(body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode)
        else {
            AppLogger.auth.error("⚠️ プラン同期に失敗しました")
            throw AuthError.tokenRetrievalFailed // 便宜上のエラー
        }
        AppLogger.auth.info("✅ Plan synced with backend: \(plan)")
    }

}
