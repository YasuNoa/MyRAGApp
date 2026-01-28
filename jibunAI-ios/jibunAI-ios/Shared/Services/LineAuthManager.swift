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
        print("🟢 LINE SDK setup with Channel ID: \(channelID)")
        LoginManager.shared.setup(channelID: channelID, universalLinkURL: universalLinkURL)
        print("🟢 LINE SDK setup completed")
    }

    /// LINEログイン実行
    func login() async throws -> String {
        print("🟢 Starting LINE login...")
        return try await withCheckedThrowingContinuation { continuation in
            LoginManager.shared.login(permissions: [.profile, .openID], in: nil) { result in
                switch result {
                case .success(let loginResult):
                    // アクセストークンを取得
                    let accessToken = loginResult.accessToken.value
                    print("✅ LINE login successful")
                    print("   Access Token: \(String(accessToken.prefix(20)))...")
                    print("   User ID: \(loginResult.userProfile?.userID ?? "nil")")
                    continuation.resume(returning: accessToken)

                case .failure(let error):
                    print("❌ LINE login failed: \(error)")
                    print("   Error description: \(error.localizedDescription)")
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
                print("✅ LINE logout success")
            case .failure(let error):
                print("❌ LINE logout failed: \(error)")
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
