//
//  PaywallView.swift
//  jibunAI-ios
//
//  RevenueCatUIを使用した課金画面
//  - 標準のPaywallViewを使用して、設定されたOfferingを表示
//  - 課金成功時、リストア時のハンドリング、フッターの表示
//

import SwiftUI
import RevenueCat
import RevenueCatUI

struct SubscriptionView: View {
    @Environment(\.dismiss) var dismiss
    
    // カスタムフォントやカラーの設定はRevenueCatのダッシュボードで行うのが基本ですが、
    // ここでカスタムビューを注入することも可能です。
    
    var body: some View {
        PaywallView(displayCloseButton: true)
            .onPurchaseCompleted { customerInfo in
                print("Purchase completed: \(customerInfo.entitlements)")
                // ここでバックエンドにWebhookを送るか、アプリ内のステータスを更新する
                // バックエンド同期はBackend側でWebhookを受け取るのがベストプラクティス
                dismiss()
            }
            .onRestoreCompleted { customerInfo in
                print("Restore completed: \(customerInfo.entitlements)")
                dismiss()
            }
    }
}

// プレビュー用（実機/シミュレーターでRevenueCatの設定が必要）
struct SubscriptionView_Previews: PreviewProvider {
    static var previews: some View {
        SubscriptionView()
    }
}
