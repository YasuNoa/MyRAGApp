//
//  AppLogger.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/31.
//

import Foundation
import OSLog

/// アプリケーション全体のログ管理クラス
/// OSLogを使用し、カテゴリごとにログを分類・フィルタリング可能にする
final class AppLogger {
    
    // シングルトン化せず、カテゴリごとにstaticプロパティとして提供する
    
    private static let subsystem = Bundle.main.bundleIdentifier ?? "com.jibunAI.ios"

    /// 全般的なログ
    static let general = Logger(subsystem: subsystem, category: "General")
    
    /// 認証関連のログ
    static let auth = Logger(subsystem: subsystem, category: "Auth")
    
    /// ネットワーク通信関連のログ
    static let network = Logger(subsystem: subsystem, category: "Network")
    
    /// 課金・サブスクリプション関連のログ
    static let billing = Logger(subsystem: subsystem, category: "Billing")
    
    /// 音声処理関連のログ
    static let voice = Logger(subsystem: subsystem, category: "Voice")
    
    /// 知識ベース・ファイル関連のログ
    static let knowledge = Logger(subsystem: subsystem, category: "Knowledge")
}
