//
//  ChatView.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI

struct ChatView: View {
    @EnvironmentObject var appState: AppStateManager
    @StateObject private var viewModel = ChatViewModel()

    @State private var messageText = ""
    @State private var selectedCategory = "すべて"

    // キーボードの自動スクロール用
    @FocusState private var isInputFocused: Bool

    // let categories = ["すべて", "数学", "英語", "物理", "化学"] // 削除: viewModel.categoriesを使用

    var body: some View {
        ZStack {
            Color(red: 0.05, green: 0.05, blue: 0.05)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // ヘッダー (メッセージがない場合のみ表示)
                if viewModel.messages.isEmpty {
                    Spacer()
                    VStack(spacing: 16) {
                        Text("じぶんAI")
                            .font(.system(size: 36, weight: .bold))
                            .foregroundColor(.white)

                        Text("あなたのためのAIアシスタント")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.6))
                    }
                    .padding(.bottom, 40)

                    // クイックアクション
                    HStack(spacing: 12) {
                        QuickActionButton(title: "テスト対策") { messageText = "テストに出そうな所を教えて" }
                        QuickActionButton(title: "要約して") { messageText = "この授業を3行で要約して" }
                    }
                    .padding(.horizontal)

                    Spacer()
                } else {
                    // チャット履歴
                    ScrollViewReader { proxy in
                        ScrollView {
                            LazyVStack(spacing: 16) {
                                ForEach(viewModel.messages) { msg in
                                    MessageBubble(message: msg)
                                }
                                Color.clear.frame(height: 1).id("bottom")
                            }
                            .padding(.vertical, 20)
                            .padding(.horizontal, 16)
                        }
                        .onChange(of: viewModel.messages) {
                            withAnimation {
                                proxy.scrollTo("bottom")
                            }
                        }
                        // キーボード表示時にもスクロール
                        .onChange(of: isInputFocused) { _, isFocused in
                            if isFocused {
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                    withAnimation {
                                        proxy.scrollTo("bottom")
                                    }
                                }
                            }
                        }
                    }
                }

                // 入力エリア
                VStack(spacing: 0) {
                    Divider().background(Color.white.opacity(0.1))

                    HStack(spacing: 12) {
                        // カテゴリ選択
                        Menu {
                            ForEach(viewModel.categories, id: \.self) { category in
                                Button(category) { selectedCategory = category }
                            }
                        } label: {
                            HStack {
                                Text(selectedCategory)
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.7))
                                    .lineLimit(1) // Layout fix
                                Image(systemName: "chevron.down")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.7))
                            }
                            .padding(8)
                            .background(Color.white.opacity(0.1))
                            .cornerRadius(8)
                        }

                        // 入力フィールド
                        HStack {
                            TextField("メッセージを入力...", text: $messageText)
                                .foregroundColor(.white)
                                .focused($isInputFocused)
                                .submitLabel(.send)
                                .onSubmit {
                                    sendMessage()
                                }

                            if viewModel.isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Button {
                                    sendMessage()
                                } label: {
                                    Image(systemName: "arrow.up.circle.fill")
                                        .font(.title2)
                                        .foregroundColor(
                                            messageText.isEmpty
                                                ? .gray : Color(red: 0.5, green: 0.6, blue: 1.0))
                                }
                                .disabled(messageText.isEmpty)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color(red: 0.15, green: 0.15, blue: 0.15))
                        .cornerRadius(20)
                    }
                    .padding(16)
                    .background(Color(red: 0.08, green: 0.08, blue: 0.08))
                }
            }
            // .ignoresSafeArea(.keyboard, edges: .bottom) 削除: レイアウト制約エラー回避のため
        }
        .onAppear {
            // 初期表示用
        }
        .task {
            // カテゴリ（タグ）を最新化
            await viewModel.loadCategories()
        }
        .adaptivePaywallSheet(isPresented: $viewModel.showPaywall) {
             viewModel.showPaywall = false
        }
        .alert("利用上限に達しました", isPresented: $viewModel.showLimitAlert) {
            Button("プランを確認", role: .cancel) {
                viewModel.showPaywall = true
            }
        } message: {
            Text("Freeプランの1日のチャット利用上限（10回）に達しました。\n無制限プランにアップグレードしてください。")
        }
    }

    private func sendMessage() {
        guard !messageText.isEmpty else { return }
        let text = messageText
        messageText = ""
        isInputFocused = false

        Task {
            let tags = selectedCategory == "すべて" ? [] : [selectedCategory]
            await viewModel.sendMessage(text, userId: appState.currentUser?.id ?? "unknown", tags: tags)
        }
    }
}
