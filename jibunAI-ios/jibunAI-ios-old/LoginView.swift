//
//  LoginView.swift
//  jibunAI-ios
//
//  Created by AI Assistant on 2025/12/19.
//
//  ログイン画面
//  - Google, LINE, Apple, Microsoftのソーシャルログイン
//  - ログイン成功時はAppStateを更新
//  - Webアプリと同じダークテーマデザイン
//

import SwiftUI
import AuthenticationServices

struct LoginView: View {
    // AppStateを環境から取得
    @EnvironmentObject var appState: AppStateManager
    
    // ログイン画面の表示制御
    @Binding var showLogin: Bool
    
    @State private var isLoading = false
    @State private var errorMessage: String?
    @StateObject private var authService = AuthService.shared
    
    var body: some View {
        ZStack {
            // ダークな背景
            Color.black
                .ignoresSafeArea()
            
            VStack(spacing: 24) {
                Spacer()
                
                // ロゴとタイトル
                VStack(spacing: 16) {
                    Text("じぶんAI")
                        .font(.system(size: 48, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text("ログイン")
                        .font(.title2)
                        .foregroundColor(.white.opacity(0.8))
                }
                .padding(.bottom, 32)
                
                VStack(spacing: 16) {
                    // Googleログインボタン
                    SocialLoginButton(
                        icon: "g.circle.fill",
                        title: "Googleでログイン",
                        color: .white,
                        iconColor: .red
                    ) {
                        handleGoogleLogin()
                    }
                    
                    // Appleログインボタン
                    SignInWithAppleButtonView {
                        handleAppleLogin()
                    }
                    
                    // Microsoftログインボタン
                    /*
                    SocialLoginButton(
                        icon: "building.2",
                        title: "Microsoftでログイン",
                        color: Color(red: 0.0, green: 0.48, blue: 0.87),
                        iconColor: .white
                    ) {
                        handleMicrosoftLogin()
                    }
                    */
                    
                    // LINEログインボタン（オプション）
                    SocialLoginButton(
                        icon: "message.fill",
                        title: "LINEでログイン",
                        color: Color(red: 0.0, green: 0.78, blue: 0.33),
                        iconColor: .white
                    ) {
                        handleLineLogin()
                    }
                }
                .padding(.horizontal, 40)
                
                if let error = errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding(.horizontal, 40)
                        .padding(.top, 8)
                }
                
                Spacer()
                
                // 戻るボタン
                Button {
                    showLogin = false
                } label: {
                    Text("戻る")
                        .font(.body)
                        .foregroundColor(Color(red: 0.5, green: 0.6, blue: 1.0))
                }
                .padding(.bottom, 32)
            }
            
            // ローディングオーバーレイ
            if isLoading {
                Color.black.opacity(0.5)
                    .ignoresSafeArea()
                ProgressView()
                    .scaleEffect(1.5)
                    .tint(.white)
            }
        }
    }
    
    // MARK: - Login Handlers
    
    private func handleGoogleLogin() {
        isLoading = true
        errorMessage = nil
        
        print("🔵 Google login started...")
        
        Task {
            do {
                print("🔵 Calling AuthService.signInWithGoogle()")
                let (user, token) = try await authService.signInWithGoogle()
                
                print("✅ Google login success!")
                print("   User ID: \(user.id)")
                print("   Display Name: \(user.displayName ?? "nil")")
                print("   Email: \(user.email ?? "nil")")
                
                await MainActor.run {
                    // AppStateを更新 (ログイン成功処理)
                    appState.loginSuccess(user: user, token: token)
                    
                    isLoading = false
                }
            } catch {
                print("❌ Google login failed: \(error)")
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    private func handleAppleLogin() {
        isLoading = true
        errorMessage = nil
        
        print("🍎 Apple login started...")
        
        Task {
            do {
                print("🍎 Calling SignInWithAppleCoordinator")
                // Nonce生成
                let nonce = AuthService.randomNonceString()
                let coordinator = SignInWithAppleCoordinator()
                let authorization = try await coordinator.signIn(nonce: nonce)
                
                print("🍎 Got authorization, signing in with Firebase...")
                let (user, token) = try await authService.signInWithApple(authorization: authorization, nonce: nonce)
                
                print("✅ Apple login success!")
                print("   User ID: \(user.id)")
                
                await MainActor.run {
                    appState.loginSuccess(user: user, token: token)
                    isLoading = false
                }
            } catch {
                print("❌ Apple login failed: \(error)")
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    private func handleMicrosoftLogin() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let (user, token) = try await authService.signInWithMicrosoft()
                
                await MainActor.run {
                    appState.loginSuccess(user: user, token: token)
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    private func handleLineLogin() {
        isLoading = true
        errorMessage = nil
        
        print("🟢 LINE login started...")
        
        Task {
            do {
                print("🟢 Calling LineAuthManager.login()")
                // LINE SDKでログイン
                let lineAccessToken = try await LineAuthManager.shared.login()
                
                print("🟢 Got LINE access token, authenticating with backend...")
                // バックエンド経由でFirebase認証
                let (user, token) = try await authService.signInWithLINE(lineAccessToken: lineAccessToken)
                
                print("✅ LINE login success!")
                print("   User ID: \(user.id)")
                
                await MainActor.run {
                    appState.loginSuccess(user: user, token: token)
                    isLoading = false
                }
            } catch {
                print("❌ LINE login failed: \(error)")
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
}

// MARK: - Social Login Button Component

struct SocialLoginButton: View {
    let icon: String
    let title: String
    let color: Color
    let iconColor: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(iconColor)
                
                Text(title)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(color == .white ? .black : .white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(color)
            .cornerRadius(12)
        }
    }
}
// MARK: - Sign in with Apple Button

struct SignInWithAppleButtonView: View {
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: "applelogo")
                    .font(.title3)
                    .foregroundColor(.white)
                
                Text("Appleでログイン")
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Color.black)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white, lineWidth: 1)
            )
        }
    }
}

