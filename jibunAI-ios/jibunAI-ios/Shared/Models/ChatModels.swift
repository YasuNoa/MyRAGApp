//
//  ChatModels.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import Foundation

// チャットメッセージモデル
// 元々 ChatViewModel.swift に定義されていたものをここに移動
struct ChatMessage: Identifiable, Equatable {
    let id = UUID()
    let text: String
    let isUser: Bool // true: ユーザー, false: AI
    let timestamp: Date
    var isThinking: Bool = false // ローディング表示用
}
