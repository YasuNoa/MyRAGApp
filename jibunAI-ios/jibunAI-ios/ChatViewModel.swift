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
    @Published var categories: [String] = ["すべて"] // 初期値
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiService = APIService.shared
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        // AuthTokenの変更を監視して、有効になったらカテゴリを再読み込み
        apiService.$authToken
            .receive(on: RunLoop.main)
            .sink { [weak self] token in
                if token != nil {
                    Task {
                        await self?.loadCategories()
                    }
                }
            }
            .store(in: &cancellables)
    }
    
    // カテゴリ読み込み
    func loadCategories() async {
        // 念のためユーザー同期を実行（チャット開始前の安全性確保）
        if let token = apiService.authToken {
            do {
                _ = try await AuthService.shared.syncUserSession(token: token)
                print("ChatViewModel: User synced successfully")
            } catch {
                print("ChatViewModel: User sync failed: \(error.localizedDescription)")
            }
        }
        
        // トークンが無い場合はスキップ (認証監視により後で呼ばれる)
        guard let _ = apiService.authToken else {
             print("ChatViewModel: Waiting for auth token to load categories...")
             return
        }

        do {
            let response = try await apiService.fetchCategories()
            // "すべて"を先頭に、取得したタグを追加
            let tags = response.tags
            await MainActor.run {
                self.categories = ["すべて"] + tags
            }
        } catch {
            print("Failed to load categories: \(error.localizedDescription)")
            // エラーでも初期値のまま続行
        }
    }
    
    // メッセージ送信
    func sendMessage(_ text: String, userId: String, tags: [String] = []) async {
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
            // API呼び出し (タグ付き)
            let response = try await apiService.ask(query: text, userId: userId, tags: tags)
            
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
