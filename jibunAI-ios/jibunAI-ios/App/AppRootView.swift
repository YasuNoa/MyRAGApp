//
//  AppRootView.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI

// ルートView
struct AppRootView: View {
    // アプリ状態を外部から注入される（jibunAI_iosApp.swiftで定義）
    @EnvironmentObject var appState: AppStateManager
    
    // ログイン画面を表示するかどうか
    @State private var showLogin: Bool = false
    
    var body: some View {
        Group {
            if appState.isLoading {
                // 初期ロード画面
                ZStack {
                    Color.black.ignoresSafeArea()
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(1.5)
                }
            } else {
                // ログイン済みならMainAppView、未ログインならLPまたはLoginViewを切り替え表示
                if appState.isLoggedIn {
                    // ログイン済み: メイン機能画面へ
                    MainAppView()
                        .environmentObject(appState)
                } else if showLogin {
                    // 「無料で始める」or「ログイン」ボタン押下後: LoginViewへ
                    LoginView(showLogin: $showLogin)
                        .environmentObject(appState)
                } else {
                    // 初回起動時: LP（ランディングページ）表示
                    LandingPageView(showLogin: $showLogin)
                        .environmentObject(appState)
                }
            }
        }
        .onAppear {
            // アプリ起動時にセッションを復元
            appState.restoreSession()
        }
    }
}
