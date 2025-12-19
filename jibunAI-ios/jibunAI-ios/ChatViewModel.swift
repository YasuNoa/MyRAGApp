//
//  ChatViewModel.swift
//  jibunAI-ios
//
//  チャット画面のロジック
//

import Foundation
import Combine

// チャットメッセージモデル
struct ChatMessage: Identifiable, Equatable {
    let id = UUID()
    let text: String
    let isUser: Bool // true: ユーザー, false: AI
    let timestamp: Date
    var isThinking: Bool = false // ローディング表示用
}

@MainActor
class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiService = APIService.shared
    
    // メッセージ送信
    func sendMessage(_ text: String, userId: String) async {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        
        let userMsg = ChatMessage(text: text, isUser: true, timestamp: Date())
        messages.append(userMsg)
        
        isLoading = true
        errorMessage = nil
        
        // AIの「考え中」プレースホルダーを追加
        let thinkingMsgId = UUID()
        let thinkingMsg = ChatMessage(text: "", isUser: false, timestamp: Date(), isThinking: true)
        messages.append(thinkingMsg)
        
        do {
            // API呼び出し
            let response = try await apiService.ask(query: text, userId: userId)
            
            // 成功したら「考え中」を削除して回答を追加
            messages.removeAll { $0.isThinking }
            
            let aiMsg = ChatMessage(text: response.answer, isUser: false, timestamp: Date())
            messages.append(aiMsg)
            
        } catch {
            // エラー時
            messages.removeAll { $0.isThinking }
            errorMessage = error.localizedDescription
            
            let errorMsg = ChatMessage(text: "エラーが発生しました: \(error.localizedDescription)", isUser: false, timestamp: Date())
            messages.append(errorMsg)
        }
        
        isLoading = false
    }
}
