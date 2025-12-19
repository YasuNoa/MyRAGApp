//
//  AuthService.swift
//  jibunAI-ios
//
//  Firebase認証サービス
//  Google, LINE, Apple, Microsoft の各プロバイダーに対応
//

import Foundation
import FirebaseAuth
import GoogleSignIn
import AuthenticationServices
import SwiftUI

enum AuthError: LocalizedError {
    case googleSignInFailed(String)
    case appleSignInFailed(String)
    case lineSignInFailed(String)
    case microsoftSignInFailed(String)
    case tokenRetrievalFailed
    case userNotFound
    
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
              let rootViewController = windowScene.windows.first?.rootViewController else {
            throw AuthError.googleSignInFailed("ウィンドウが見つかりません")
        }
        
        do {
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController)
            let user = result.user
            
            guard let idToken = user.idToken?.tokenString else {
                throw AuthError.googleSignInFailed("IDトークンが取得できません")
            }
            
            let accessToken = user.accessToken.tokenString
            
            // Firebaseで認証
            let credential = GoogleAuthProvider.credential(withIDToken: idToken, accessToken: accessToken)
            let authResult = try await Auth.auth().signIn(with: credential)
            
            // Firebase IDトークンを取得
            let firebaseToken = try await authResult.user.getIDToken()
            
            // ユーザー情報を更新
            let appUser = AppStateManager.User(
                id: authResult.user.uid,
                displayName: authResult.user.displayName ?? user.profile?.name,
                email: authResult.user.email ?? user.profile?.email,
                photoURL: authResult.user.photoURL?.absoluteString
            )
            
            updateCurrentUser(from: authResult.user)
            self.idToken = firebaseToken
            
            // バックエンドと同期
            try await syncUserWithBackend(userId: authResult.user.uid, token: firebaseToken)
            
            return (appUser, firebaseToken)
            
        } catch {
            throw AuthError.googleSignInFailed(error.localizedDescription)
        }
    }
    
    // MARK: - Apple Sign-In
    
    func signInWithApple(authorization: ASAuthorization) async throws -> (user: AppStateManager.User, token: String) {
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            throw AuthError.appleSignInFailed("認証情報が取得できません")
        }
        
        guard let appleIDToken = appleIDCredential.identityToken,
              let idTokenString = String(data: appleIDToken, encoding: .utf8) else {
            throw AuthError.appleSignInFailed("IDトークンが取得できません")
        }
        
        // Nonce（セキュリティ強化用、本番環境では必須）
        let nonce = randomNonceString()
        let credential = OAuthProvider.credential(
            withProviderID: "apple.com",
            idToken: idTokenString,
            rawNonce: nonce
        )
        
        do {
            let authResult = try await Auth.auth().signIn(with: credential)
            let firebaseToken = try await authResult.user.getIDToken()
            
            let appUser = AppStateManager.User(
                id: authResult.user.uid,
                displayName: authResult.user.displayName ?? appleIDCredential.fullName?.givenName,
                email: authResult.user.email ?? appleIDCredential.email,
                photoURL: authResult.user.photoURL?.absoluteString
            )
            
            updateCurrentUser(from: authResult.user)
            self.idToken = firebaseToken
            
            // バックエンドと同期
            try await syncUserWithBackend(userId: authResult.user.uid, token: firebaseToken)
            
            return (appUser, firebaseToken)
            
        } catch {
            throw AuthError.appleSignInFailed(error.localizedDescription)
        }
    }
    
    // MARK: - Microsoft Sign-In
    
    func signInWithMicrosoft() async throws -> (user: AppStateManager.User, token: String) {
        // Microsoft認証プロバイダー
        let provider = OAuthProvider(providerID: "microsoft.com")
        
        // スコープ設定（必要に応じてカスタマイズ）
        provider.scopes = ["email", "profile"]
        
        // カスタムパラメータ（オプション）
        provider.customParameters = [
            "prompt": "select_account" // アカウント選択を強制
        ]
        
        do {
            let authResult = try await provider.credential(with: nil)
            let result = try await Auth.auth().signIn(with: authResult)
            let firebaseToken = try await result.user.getIDToken()
            
            let appUser = AppStateManager.User(
                id: result.user.uid,
                displayName: result.user.displayName,
                email: result.user.email,
                photoURL: result.user.photoURL?.absoluteString
            )
            
            updateCurrentUser(from: result.user)
            self.idToken = firebaseToken
            
            // バックエンドと同期
            try await syncUserWithBackend(userId: result.user.uid, token: firebaseToken)
            
            return (appUser, firebaseToken)
            
        } catch {
            throw AuthError.microsoftSignInFailed(error.localizedDescription)
        }
    }
    
    // MARK: - LINE Sign-In (Custom Token方式)
    
    // LINEはFirebaseの公式プロバイダーではないため、カスタムトークン方式を使用
    // バックエンド側で LINE → Firebase Custom Token 変換が必要
    func signInWithLINE(lineAccessToken: String) async throws -> (user: AppStateManager.User, token: String) {
        // バックエンドのエンドポイントでLINEトークンをFirebaseカスタムトークンに変換
        // 注: この部分はバックエンド側の実装が必要
        
        struct LineAuthRequest: Codable {
            let lineAccessToken: String
        }
        
        struct LineAuthResponse: Codable {
            let firebaseToken: String
        }
        
        let url = URL(string: "\(APIService.baseURL)/api/auth/line")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = LineAuthRequest(lineAccessToken: lineAccessToken)
        request.httpBody = try JSONEncoder().encode(body)
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                throw AuthError.lineSignInFailed("バックエンド認証に失敗しました")
            }
            
            let authResponse = try JSONDecoder().decode(LineAuthResponse.self, from: data)
            let customToken = authResponse.firebaseToken
            
            // Firebaseカスタムトークンでサインイン
            let authResult = try await Auth.auth().signIn(withCustomToken: customToken)
            let firebaseToken = try await authResult.user.getIDToken()
            
            let appUser = AppStateManager.User(
                id: authResult.user.uid,
                displayName: authResult.user.displayName,
                email: authResult.user.email,
                photoURL: authResult.user.photoURL?.absoluteString
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
    }
    
    // MARK: - Helper Methods
    
    private func updateCurrentUser(from firebaseUser: User) {
        currentUser = firebaseUser
    }
    
    private func syncUserWithBackend(userId: String, token: String) async throws {
        // バックエンドの /api/auth/sync エンドポイントを叩く
        // 注: このエンドポイントはバックエンド側で実装する必要があります
        
        let url = URL(string: "\(APIService.baseURL)/api/auth/sync")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        struct SyncRequest: Codable {
            let userId: String
        }
        
        let body = SyncRequest(userId: userId)
        request.httpBody = try JSONEncoder().encode(body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            // 同期に失敗してもログイン自体は成功とする（ログのみ）
            print("⚠️ バックエンド同期に失敗しました")
            return
        }
    }
    
    // Apple Sign-In用のNonce生成
    private func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remainingLength = length
        
        while remainingLength > 0 {
            let randoms: [UInt8] = (0 ..< 16).map { _ in
                var random: UInt8 = 0
                let errorCode = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
                if errorCode != errSecSuccess {
                    fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)")
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
}
