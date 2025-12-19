//
//  jibunAI_iosApp.swift
//  jibunAI-ios
//
//  Created by 田中正造 on 2025/12/19.
//

import SwiftUI
import Combine
import FirebaseCore

@main
struct jibunAI_iosApp: App {
    // アプリ全体の状態を管理するStateObjectを保持する
    @StateObject private var appState = AppStateManager()
    
    init() {
        // Firebase初期化
        FirebaseApp.configure()
    }
    
    var body: some Scene {
        WindowGroup {
            // ルートビューとしてAppRootViewを表示し、appStateを環境オブジェクトとして渡す
            AppRootView()
                .environmentObject(appState) // appStateを環境オブジェクトとして渡すことで全体で利用可能にする
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

