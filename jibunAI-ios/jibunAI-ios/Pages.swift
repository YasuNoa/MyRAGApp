//
//  Pages.swift
//  jibunAI-ios
//
//  各ページの定義とビュー
//

import SwiftUI
import Speech

// MARK: - Page Enum

enum Page: CaseIterable, Hashable {
    case chat
    case knowledge
    case note
    case data
    case guide
    case feedback
    case settings

    var title: String {
        switch self {
        case .chat: return "チャット"
        case .knowledge: return "知識登録"
        case .note: return "授業ノート"
        case .data: return "学習済みデータ"
        case .guide: return "使い方"
        case .feedback: return "フィードバック"
        case .settings: return "設定"
        }
    }

    var icon: String {
        switch self {
        case .chat: return "message"
        case .knowledge: return "plus.circle"
        case .note: return "book"
        case .data: return "cylinder"
        case .guide: return "questionmark.circle"
        case .feedback: return "envelope.open"
        case .settings: return "gearshape"
        }
    }

    @ViewBuilder
    var view: some View {
        switch self {
        case .chat: ChatView()
        case .knowledge: KnowledgeView()
        case .note: NoteView()
        case .data: DataView()
        case .guide: GuideView()
        case .feedback: FeedbackView()
        case .settings: SettingsView()
        }
    }
}

// MARK: - Chat View

// MARK: - Chat View

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
                        .onChange(of: viewModel.messages) { _ in
                            withAnimation {
                                proxy.scrollTo("bottom")
                            }
                        }
                        // キーボード表示時にもスクロール
                        .onChange(of: isInputFocused) { isFocused in
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

// チャットバブルコンポーネント
struct MessageBubble: View {
    let message: ChatMessage

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            if message.isUser {
                Spacer()
            } else {
                // AIアイコン
                Circle()
                    .fill(Color(red: 0.2, green: 0.8, blue: 0.6))
                    .frame(width: 32, height: 32)
                    .overlay(Text("AI").font(.caption).bold().foregroundColor(.black))
            }

            VStack(alignment: message.isUser ? .trailing : .leading, spacing: 4) {
                if message.isThinking {
                    HStack(spacing: 4) {
                        Circle().fill(Color.white).frame(width: 6, height: 6)
                        Circle().fill(Color.white).frame(width: 6, height: 6)
                        Circle().fill(Color.white).frame(width: 6, height: 6)
                    }
                    .padding(12)
                    .background(Color(red: 0.15, green: 0.15, blue: 0.15))
                    .cornerRadius(16)
                } else {
                    Text(message.text)
                        .foregroundColor(.white)
                        .padding(12)
                        .background(
                            message.isUser
                                ? Color(red: 0.3, green: 0.4, blue: 0.9)  // ユーザー色
                                : Color(red: 0.15, green: 0.15, blue: 0.15)  // AI色
                        )
                        .cornerRadius(16)
                }
            }

            if !message.isUser {
                Spacer()
            }
        }
    }
}

struct QuickActionButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .foregroundColor(.white.opacity(0.9))
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color.white.opacity(0.1))
                .cornerRadius(20)
                .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.white.opacity(0.3)))
        }
    }
}

// MARK: - Knowledge View

struct KnowledgeView: View {
    @State private var selectedTab: KnowledgeTab = .text
    @State private var inputText = ""
    @State private var selectedTags: [String] = []

    enum KnowledgeTab {
        case text, file
    }

    var body: some View {
        ZStack {
            Color(red: 0.05, green: 0.05, blue: 0.05)
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // タイトル
                    Text("知識ベース管理")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.top, 20)

                    // タブ切り替え
                    HStack(spacing: 16) {
                        TabButton(title: "テキスト", isSelected: selectedTab == .text) {
                            selectedTab = .text
                        }
                        TabButton(title: "ファイル", isSelected: selectedTab == .file) {
                            selectedTab = .file
                        }
                    }

                    if selectedTab == .text {
                        // テキスト入力エリア
                        VStack(alignment: .leading, spacing: 12) {
                            Text("知識を手動で追加")
                                .font(.headline)
                                .foregroundColor(.white)

                            Text("タグ (任意)")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.6))

                            TagInputView(tags: $selectedTags)

                            TextEditor(text: $inputText)
                                .frame(height: 200)
                                .padding(12)
                                .background(Color(red: 0.15, green: 0.15, blue: 0.15))
                                .cornerRadius(12)
                                .foregroundColor(.white)

                            Button {
                                // 保存処理
                            } label: {
                                Text("保存する")
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 16)
                                    .background(
                                        LinearGradient(
                                            colors: [
                                                Color(red: 0.5, green: 0.6, blue: 1.0),
                                                Color(red: 0.4, green: 0.5, blue: 0.9),
                                            ],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .cornerRadius(12)
                            }
                        }
                    } else {
                        // ファイルアップロードエリア
                        VStack(spacing: 16) {
                            Text("Google Drive からインポート")
                                .font(.headline)
                                .foregroundColor(.white)

                            Text(
                                "下のボタンを押すとGoogle Driveのファイル選択画面が開きます。\nインポートしたいファイル（PDF, Googleドキュメント等）を選択してください。"
                            )
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.6))
                            .multilineTextAlignment(.center)

                            Button {
                                // Google Drive連携
                            } label: {
                                HStack {
                                    Image(systemName: "icloud.and.arrow.down")
                                    Text("ファイルを選択")
                                }
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(Color.white.opacity(0.1))
                                .cornerRadius(12)
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
            }
        }
    }
}

struct TabButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.body)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundColor(isSelected ? .white : .white.opacity(0.6))
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(isSelected ? Color(red: 0.5, green: 0.6, blue: 1.0) : Color.clear)
                .cornerRadius(8)
        }
    }
}

struct TagInputView: View {
    @Binding var tags: [String]
    @State private var inputTag = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "tag")
                    .foregroundColor(.white.opacity(0.6))

                TextField("タグを入力 (Enterで追加)", text: $inputTag)
                    .foregroundColor(.white)
                    .tint(.white)
                    .onSubmit {
                        if !inputTag.isEmpty {
                            tags.append(inputTag)
                            inputTag = ""
                        }
                    }
            }
            .padding(12)
            .background(Color(red: 0.15, green: 0.15, blue: 0.15))
            .cornerRadius(8)

            if !tags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(tags, id: \.self) { tag in
                            HStack(spacing: 4) {
                                Text(tag)
                                    .font(.caption)
                                    .foregroundColor(.white)

                                Button {
                                    tags.removeAll { $0 == tag }
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.caption)
                                        .foregroundColor(.white.opacity(0.6))
                                }
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color(red: 0.3, green: 0.4, blue: 0.8))
                            .cornerRadius(16)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Note View (Voice Memo)

struct NoteView: View {
    @EnvironmentObject var appState: AppStateManager
    @StateObject private var viewModel = VoiceNoteViewModel()
    
    // アラート用
    @State private var showingAlert = false
    @State private var alertMessage = ""

    var body: some View {
        ZStack {
            Color(red: 0.05, green: 0.05, blue: 0.05)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                HStack(spacing: 12) {
                    Image(systemName: "doc.text")
                        .font(.title2)
                        .foregroundColor(Color(red: 0.3, green: 0.5, blue: 1.0)) // Blue like Web
                    Text("授業ノート (Voice Memo)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(Color(red: 0.3, green: 0.5, blue: 1.0))
                    Spacer()
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 20)
                
                if let error = viewModel.errorMessage {
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.circle")
                        Text(error)
                            .font(.caption)
                    }
                    .foregroundColor(.red)
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal)
                }

                if viewModel.isProcessing {
                    // Processing State
                    Spacer()
                    VStack(spacing: 24) {
                        ProgressView()
                            .scaleEffect(1.5)
                            .tint(Color(red: 0.3, green: 0.5, blue: 1.0))
                        
                        VStack(spacing: 8) {
                            Text("AI解析中...")
                                .font(.headline)
                                .foregroundColor(.white)
                            Text("音声データを文字起こし・要約しています")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }
                    Spacer()
                    
                } else if !viewModel.summary.isEmpty {
                     // Result Preview State
                    ScrollView {
                        VStack(spacing: 24) {
                            // Summary Card
                            VStack(alignment: .leading, spacing: 16) {
                                HStack {
                                    Circle().fill(Color(red: 0.3, green: 0.5, blue: 1.0)).frame(width: 8, height: 8)
                                    Text("AI SUMMARY")
                                        .font(.caption)
                                        .fontWeight(.bold)
                                        .foregroundColor(Color(red: 0.3, green: 0.5, blue: 1.0))
                                }
                                Text(viewModel.summary)
                                    .font(.body)
                                    .foregroundColor(.white)
                                    .lineSpacing(4)
                            }
                            .padding(24)
                            .background(Color(red: 0.3, green: 0.5, blue: 1.0).opacity(0.1))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color(red: 0.3, green: 0.5, blue: 1.0).opacity(0.2), lineWidth: 1)
                            )
                            .cornerRadius(12)
                            
                            // Transcript Card (Optional or collapsible)
                            VStack(alignment: .leading, spacing: 12) {
                                Text("TRANSCRIPT")
                                    .font(.caption)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white.opacity(0.5))
                                
                                Text(viewModel.transcript)
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.8))
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding()
                                    .background(Color.black.opacity(0.3))
                                    .cornerRadius(8)
                            }
                            
                            // Tags Input
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Image(systemName: "tag")
                                        .font(.caption)
                                        .foregroundColor(.white.opacity(0.6))
                                    Text("TAGS")
                                        .font(.caption)
                                        .fontWeight(.bold)
                                        .foregroundColor(.white.opacity(0.6))
                                }
                                TagInputView(tags: $viewModel.tags)
                            }
                            .padding(24)
                            .background(Color.white.opacity(0.05))
                            .cornerRadius(12)
                            
                            // Actions
                            HStack(spacing: 16) {
                                Button {
                                    // Cancel
                                    alertMessage = "本当に削除しますか？"
                                    showingAlert = true
                                } label: {
                                    HStack {
                                        Image(systemName: "xmark")
                                        Text("取り消し")
                                    }
                                    .fontWeight(.bold)
                                    .foregroundColor(.white.opacity(0.7))
                                    .padding()
                                    .frame(maxWidth: .infinity)
                                    .background(Color.white.opacity(0.1))
                                    .cornerRadius(12)
                                }
                                
                                Button {
                                    Task {
                                        let success = await viewModel.saveVoice(userId: appState.currentUser?.id ?? "")
                                        if success {
                                            // 成功時のフィードバック (必要ならToastなど)
                                        }
                                    }
                                } label: {
                                    HStack {
                                        Image(systemName: "checkmark")
                                        Text("インポート (保存)")
                                    }
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                                    .padding()
                                    .frame(maxWidth: .infinity)
                                    .background(Color(red: 0.15, green: 0.4, blue: 0.9)) // Blue-600
                                    .cornerRadius(12)
                                }
                            }
                        }
                        .padding(24)
                    }
                    
                } else {
                    // Recording / Idle State
                    VStack(spacing: 24) {
                        Spacer()
                        
                        // Button
                        Button {
                            if viewModel.isRecording {
                                viewModel.stopRecording(userId: appState.currentUser?.id ?? "")
                            } else {
                                viewModel.startRecording()
                            }
                        } label: {
                            ZStack {
                                Circle()
                                    .fill(
                                        viewModel.isRecording
                                            ? Color(red: 0.86, green: 0.15, blue: 0.15) // Red-600
                                            : Color(red: 0.15, green: 0.4, blue: 0.9)   // Blue-600
                                    )
                                    .frame(width: 128, height: 128)
                                    .shadow(color: .black.opacity(0.2), radius: 10, y: 5)
                                
                                VStack(spacing: 8) {
                                    Image(systemName: viewModel.isRecording ? "square.fill" : "mic.fill")
                                        .font(.system(size: 40))
                                    
                                    Text(viewModel.isRecording ? "STOP" : "START")
                                        .font(.system(size: 14, weight: .bold))
                                        .tracking(1.0) // letter-spacing
                                }
                                .foregroundColor(.white)
                            }
                        }
                        .disabled(viewModel.isProcessing)
                        
                        // Time Display (only when recording)
                        if viewModel.isRecording {
                            Text(formatTime(viewModel.recordingTime))
                                .font(.system(size: 48, weight: .light, design: .monospaced))
                                .foregroundColor(.white)
                        } else {
                            Text("授業や会議を録音・文字起こし")
                                .font(.body)
                                .foregroundColor(.white.opacity(0.6))
                        }
                        
                        Spacer()
                        
                        // Real-time Transcript Area
                        VStack(alignment: .leading, spacing: 8) {
                            Text("REAL-TIME TRANSCRIPT")
                                .font(.system(size: 12, weight: .bold))
                                .tracking(1.0)
                                .foregroundColor(.white.opacity(0.5))
                            
                            ScrollViewReader { proxy in
                                ScrollView {
                                    Text(viewModel.transcript.isEmpty ? (viewModel.isRecording ? "聞き取っています..." : "録音を開始するとここに文字が表示されます") : viewModel.transcript)
                                        .font(.system(size: 14, design: .monospaced))
                                        .foregroundColor(viewModel.transcript.isEmpty ? .gray : .white)
                                        .lineSpacing(6)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .id("transcriptEnd")
                                }
                                .frame(height: 150)
                                .onChange(of: viewModel.transcript) { _ in
                                    withAnimation {
                                        proxy.scrollTo("transcriptEnd", anchor: .bottom)
                                    }
                                }
                            }
                        }
                        .padding(24)
                        .background(Color.black)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                        )
                        .cornerRadius(12)
                        .padding(.horizontal, 24)
                        .padding(.bottom, 24)
                    }
                }
            }
        }
        .alert("確認", isPresented: $showingAlert) {
            Button("削除する", role: .destructive) {
                viewModel.reset()
            }
            Button("キャンセル", role: .cancel) {}
        } message: {
            Text(alertMessage)
        }
        .onAppear {
            askSpeechPermission()
        }
    }

    private func formatTime(_ timeInterval: TimeInterval) -> String {
        let minutes = Int(timeInterval) / 60
        let seconds = Int(timeInterval) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
    
    // 音声認識の許可を求める
    private func askSpeechPermission() {
        SFSpeechRecognizer.requestAuthorization { authStatus in
            // Main thread handling if needed
        }
    }
}

// MARK: - Data View

struct DataView: View {
    var body: some View {
        ZStack {
            Color(red: 0.05, green: 0.05, blue: 0.05)
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("学習済みデータ一覧")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.top, 20)

                    // フィルタ
                    HStack {
                        FilterButton(title: "すべてのソース")
                        FilterButton(title: "すべてのタグ")
                    }

                    // データリスト（ダミー）
                    VStack(spacing: 12) {
                        DataItemCard(
                            title: "明日やること、ディップの課題？成績証...", source: "手動アップロード", date: "2025/12/11",
                            tags: ["Todo", "Work", "University"])
                        DataItemCard(
                            title: "New Recording 618.m4a", source: "手動アップロード", date: "2025/12/3",
                            tags: ["な"])
                        DataItemCard(
                            title: "Receipt-2397-7768-3033.pdf", source: "Voice Memo",
                            date: "2025/12/3", tags: ["あ"])
                    }
                }
                .padding(.horizontal, 20)
            }
        }
    }
}

struct FilterButton: View {
    let title: String

    var body: some View {
        Button {
            // フィルタ処理
        } label: {
            HStack {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
                Image(systemName: "chevron.down")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.white.opacity(0.1))
            .cornerRadius(8)
        }
    }
}

struct DataItemCard: View {
    let title: String
    let source: String
    let date: String
    let tags: [String]

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: "doc.text")
                .font(.title2)
                .foregroundColor(.white.opacity(0.6))
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(.body)
                    .foregroundColor(.white)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    Text(source)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                    Text(date)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))

                    ForEach(tags, id: \.self) { tag in
                        Text(tag)
                            .font(.caption)
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color(red: 0.3, green: 0.4, blue: 0.8))
                            .cornerRadius(4)
                    }
                }
            }

            Spacer()

            HStack(spacing: 16) {
                Button {
                    // 編集
                } label: {
                    Image(systemName: "pencil")
                        .foregroundColor(.white.opacity(0.5))
                }

                Button {
                    // 削除
                } label: {
                    Image(systemName: "trash")
                        .foregroundColor(.white.opacity(0.5))
                }
            }
        }
        .padding()
        .background(Color(red: 0.1, green: 0.1, blue: 0.1))
        .cornerRadius(12)
    }
}

// MARK: - Guide View

struct GuideView: View {
    var body: some View {
        ZStack {
            Color(red: 0.05, green: 0.05, blue: 0.05)
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("使い方ガイド")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.top, 20)

                    GuideSection(
                        number: 1,
                        title: "授業ノート・文字起こし",
                        description: "授業や会議の音声をアップロードして、自動で文字起こしと要約ができます。サイドバーの「授業ノート」メニューから行えます。"
                    )

                    GuideSection(
                        number: 2,
                        title: "知識を登録する",
                        description: "PDFやテキストデータを登録できます。サイドバーの「知識登録」メニューから行えます。"
                    )
                }
                .padding(.horizontal, 20)
            }
        }
    }
}

struct GuideSection: View {
    let number: Int
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Text("\(number)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(Color(red: 0.5, green: 0.6, blue: 1.0))
                .frame(width: 40, height: 40)
                .background(Color.white.opacity(0.1))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.white)

                Text(description)
                    .font(.body)
                    .foregroundColor(.white.opacity(0.7))
                    .lineSpacing(4)
            }
        }
        .padding()
        .background(Color(red: 0.1, green: 0.1, blue: 0.1))
        .cornerRadius(12)
    }
}

// MARK: - Feedback View

struct FeedbackView: View {
    @State private var feedbackText = ""

    var body: some View {
        ZStack {
            Color(red: 0.05, green: 0.05, blue: 0.05)
                .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 24) {
                Text("フィードバック")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.top, 20)

                Text("アプリに関するご意見・ご要望、バグ報告などをお聞かせください。\n頂いた内容は今後の開発の参考にさせていただきます。")
                    .font(.body)
                    .foregroundColor(.white.opacity(0.7))
                    .lineSpacing(4)

                Text("内容")
                    .font(.headline)
                    .foregroundColor(.white)

                TextEditor(text: $feedbackText)
                    .frame(height: 200)
                    .padding(12)
                    .background(Color(red: 0.15, green: 0.15, blue: 0.15))
                    .cornerRadius(12)
                    .foregroundColor(.white)

                Button {
                    // 送信処理
                } label: {
                    Text("送信する")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.5, green: 0.6, blue: 1.0),
                                    Color(red: 0.4, green: 0.5, blue: 0.9),
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(12)
                }

                Spacer()
            }
            .padding(.horizontal, 20)
        }
    }
}

// MARK: - Settings View

struct SettingsView: View {
    @EnvironmentObject var appState: AppStateManager
    @State private var showLogoutAlert = false

    var body: some View {
        ZStack {
            Color(red: 0.05, green: 0.05, blue: 0.05)
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    Text("設定")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.top, 20)

                    // プロフィールカード
                    VStack(spacing: 16) {
                        Circle()
                            .fill(Color.gray)
                            .frame(width: 80, height: 80)
                            .overlay(
                                Text(
                                    appState.currentUser?.displayName?.prefix(1).uppercased() ?? "U"
                                )
                                .font(.title)
                                .foregroundColor(.white)
                            )

                        Text(appState.currentUser?.displayName ?? "ユーザー")
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                        
                        // EmailはWeb版に合わせて非表示
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                    .background(Color(red: 0.1, green: 0.1, blue: 0.1))
                    .cornerRadius(12)
                    
                    // 現在のプラン
                    VStack(spacing: 0) {
                        SettingsRow(
                            icon: "creditcard",
                            title: "現在のプラン",
                            hasChevron: false,
                            rightContent: {
                                Text("\(appState.userPlan) プラン")
                                    .font(.body)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                            }
                        )
                        
                        // サブスクリプション管理ボタン (FREE以外の場合)
                        if appState.userPlan != "FREE" {
                            Divider().background(Color.white.opacity(0.1))
                            HStack {
                                Spacer()
                                Button {
                                    // 管理画面を開く
                                    if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
                                        UIApplication.shared.open(url)
                                    }
                                } label: {
                                    Text("サブスクリプションの管理・解約")
                                        .font(.caption)
                                        .foregroundColor(Color.gray)
                                        .underline()
                                }
                                .padding(.vertical, 12)
                                .padding(.horizontal, 20)
                            }
                        }
                    }
                    .background(Color(red: 0.1, green: 0.1, blue: 0.1))
                    .cornerRadius(12)

                    // 設定項目
                    VStack(spacing: 0) {
                        SettingsRow(icon: "person", title: "プロフィール設定（名前）", hasChevron: true)
                        Divider().background(Color.white.opacity(0.1))
                        SettingsRow(
                            icon: "gearshape", title: "アカウント設定（メール・パスワード）", hasChevron: true)
                        Divider().background(Color.white.opacity(0.1))
                        SettingsRow(icon: "bag", title: "AIの設定（名前変更）", hasChevron: true)
                    }
                    .background(Color(red: 0.1, green: 0.1, blue: 0.1))
                    .cornerRadius(12)

                    // 連携設定
                    VStack(spacing: 0) {
                        SettingsRow(
                            icon: "link", title: "Slack連携（開発中）", hasChevron: false,
                            rightContent: {
                                Button("連携する") {
                                    // Slack連携
                                }
                                .font(.caption)
                                .foregroundColor(Color(red: 0.5, green: 0.6, blue: 1.0))
                            })
                        Divider().background(Color.white.opacity(0.1))
                        SettingsRow(
                            icon: "message", title: "LINE連携", hasChevron: false,
                            rightContent: {
                                Text("連携済み")
                                    .font(.caption)
                                    .foregroundColor(Color(red: 0.5, green: 0.6, blue: 1.0))
                            })
                        Divider().background(Color.white.opacity(0.1))
                        SettingsRow(
                            icon: "globe", title: "Google連携", hasChevron: false,
                            rightContent: {
                                Text("連携済み")
                                    .font(.caption)
                                    .foregroundColor(Color(red: 0.5, green: 0.6, blue: 1.0))
                            })
                    }
                    .background(Color(red: 0.1, green: 0.1, blue: 0.1))
                    .cornerRadius(12)
                    
                    // 利用規約・プライバシーポリシー
                    VStack(spacing: 0) {
                        Link(destination: URL(string: "https://jibun-ai.com/terms")!) {
                            HStack {
                                Image(systemName: "doc.text")
                                    .foregroundColor(.white.opacity(0.6))
                                    .frame(width: 30)
                                Text("利用規約")
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.4))
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                        }
                        
                        Divider().background(Color.white.opacity(0.1))
                        
                        Link(destination: URL(string: "https://jibun-ai.com/privacy")!) {
                            HStack {
                                Image(systemName: "hand.raised")
                                    .foregroundColor(.white.opacity(0.6))
                                    .frame(width: 30)
                                Text("プライバシーポリシー")
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.4))
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                        }
                    }
                    .background(Color(red: 0.1, green: 0.1, blue: 0.1))
                    .cornerRadius(12)

                    // ログアウトボタン
                    // ログアウトボタン
                    Button {
                        showLogoutAlert = true
                    } label: {
                        Text("ログアウト")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.red.opacity(0.8))
                            .cornerRadius(12)
                    }
                    .alert("ログアウト", isPresented: $showLogoutAlert) {
                        Button("キャンセル", role: .cancel) { }
                        Button("ログアウト", role: .destructive) {
                            appState.signOut()
                        }
                    } message: {
                        Text("ログアウトしてもよろしいですか？")
                    }
                    .padding(.top, 16)
                    
                    // コピーライト
                    Text("© 2025 じぶんAI")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.3))
                        .padding(.top, 8)
                        .padding(.bottom, 32)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
        }
    }
}

struct SettingsRow<Content: View>: View {
    let icon: String
    let title: String
    let hasChevron: Bool
    let rightContent: (() -> Content)?

    init(
        icon: String, title: String, hasChevron: Bool,
        @ViewBuilder rightContent: @escaping () -> Content
    ) {
        self.icon = icon
        self.title = title
        self.hasChevron = hasChevron
        self.rightContent = rightContent
    }

    init(icon: String, title: String, hasChevron: Bool) where Content == EmptyView {
        self.icon = icon
        self.title = title
        self.hasChevron = hasChevron
        self.rightContent = nil
    }

    var body: some View {
        Button {
            // アクション
        } label: {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(.white.opacity(0.6))
                    .frame(width: 30)

                Text(title)
                    .font(.body)
                    .foregroundColor(.white)

                Spacer()

                if let rightContent = rightContent {
                    rightContent()
                }

                if hasChevron {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.4))
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
    }
}
