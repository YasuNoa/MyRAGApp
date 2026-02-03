//
//  LineAuthManager.swift
//  jibunAI-ios
//
//  LINE SDK を使った認証管理
//

import Combine
import Foundation
import LineSDK

@MainActor
class LineAuthManager: ObservableObject {

    static let shared = LineAuthManager()

    private init() {}

    /// LINE SDKの初期化
    /// - Parameter channelID: LINE Developers ConsoleのChannel ID
    /// - Parameter universalLinkURL: Universal LinkのURL (Optional)
    func setup(channelID: String, universalLinkURL: URL? = nil) {
        #if DEBUG
        AppLogger.auth.info("🟢 LINE SDK setup with Channel ID: \(channelID)")
        #endif
        LoginManager.shared.setup(channelID: channelID, universalLinkURL: universalLinkURL)
        // ログイン結果の通知などがあればここで行う
        AppLogger.auth.info("🟢 LINE SDK setup completed")
    }

    /// LINEログイン実行
    func login() async throws -> String {
        AppLogger.auth.info("🟢 Starting LINE login...")
        return try await withCheckedThrowingContinuation { continuation in
            LoginManager.shared.login(permissions: [.profile, .openID], in: nil) { result in
                switch result {
                case .success(let loginResult):
                    // アクセストークンを取得
                    let accessToken = loginResult.accessToken.value
                    AppLogger.auth.info("✅ LINE login successful")
                    // Mask token for log
                    let token = String(accessToken.prefix(8)) + "..."
                    AppLogger.auth.debug("   Access Token: \(token)")
                    AppLogger.auth.debug("   User ID: \(loginResult.userProfile?.userID ?? "nil")")
                    continuation.resume(returning: accessToken)

                case .failure(let error):
                    AppLogger.auth.error("❌ LINE login failed: \(error)")
                    AppLogger.auth.error("   Error description: \(error.localizedDescription)")
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    /// LINEログアウト
    func logout() {
        LoginManager.shared.logout { result in
            switch result {
            case .success:
                AppLogger.auth.info("✅ LINE logout success")
            case .failure(let error):
                AppLogger.auth.error("❌ LINE logout failed: \(error)")
            }
        }
    }

    /// 現在のアクセストークンを取得
    var currentAccessToken: String? {
        return AccessTokenStore.shared.current?.value
    }

    /// ログイン状態を確認
    var isLoggedIn: Bool {
        return AccessTokenStore.shared.current != nil
    }
}
