//
//  KnowledgeView.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI

// MARK: - Knowledge View

struct KnowledgeView: View {
    @State private var selectedTab: KnowledgeTab = .text
    @State private var inputText = ""
    @State private var selectedTags: [String] = []
    
    // Course Selection
    @StateObject private var courseViewModel = CourseViewModel()
    @State private var selectedCourseId: String = "" // Empty = No selection
    
    enum KnowledgeTab {
        case text, file
    }

    // Local State
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showPaywall = false
    @State private var showLimitAlert = false
    @State private var isImporting = false // ファイルインポート用
    @State private var uploadProgress: Double = 0.0 // アップロード進捗 (0.0 - 1.0)
    
    // Dependencies
    @EnvironmentObject var appState: AppStateManager
    private let apiService = APIService.shared

    var body: some View {
        ZStack {
            Color(red: 0.05, green: 0.05, blue: 0.05)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // タイトル
                        Text("知識登録")
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.top, 20)
                        
                        // コース選択 (New)
                        VStack(alignment: .leading, spacing: 8) {
                            Text("保存先コース (必須)")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.8))
                            
                            Menu {
                                Picker("コースを選択", selection: $selectedCourseId) {
                                    Text("選択なし").tag("")
                                    ForEach(courseViewModel.courses) { course in
                                        Text(course.title).tag(course.id)
                                    }
                                }
                            } label: {
                                HStack {
                                    if let course = courseViewModel.courses.first(where: { $0.id == selectedCourseId }) {
                                        Text(course.title)
                                            .foregroundColor(.white)
                                    } else {
                                        Text("コースを選択してください")
                                            .foregroundColor(.gray)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.down")
                                        .foregroundColor(.gray)
                                }
                                .padding()
                                .background(Color.white.opacity(0.1))
                                .cornerRadius(8)
                            }
                        }

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
                                    .toolbar {
                                        ToolbarItemGroup(placement: .keyboard) {
                                            Spacer()
                                            Button("キーボードを閉じる") {
                                                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                                            }
                                        }
                                    }

                            }
                        } else {
                            // ファイルアップロードエリア
                            VStack(spacing: 16) {
                                Text("ファイルからインポート")
                                    .font(.headline)
                                    .foregroundColor(.white)

                                Text(
                                    "iCloud Drive, Google Drive, Dropboxなどの\nクラウドストレージや、ローカルファイルを選択できます。"
                                )
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.6))
                                .multilineTextAlignment(.center)

                                Button {
                                    if selectedCourseId.isEmpty {
                                        errorMessage = "コースを選択してください"
                                        return
                                    }
                                    isImporting = true
                                } label: {
                                    HStack {
                                        Image(systemName: "folder.badge.plus")
                                        Text("ファイルを選択")
                                    }
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 16)
                                    .background(selectedCourseId.isEmpty ? Color.gray.opacity(0.3) : Color.white.opacity(0.1))
                                    .cornerRadius(12)
                                }
                                .disabled(selectedCourseId.isEmpty)
                                
                                Text("対応: PDF, 画像, Office, テキストなど")
                                    .font(.caption2)
                                    .foregroundColor(.gray)
                            }
                            .padding(.horizontal)
                            
                            Spacer()
                        }
                    }
                    .padding(.horizontal, 20)
                }
                
                if selectedTab == .text {
                    VStack {
                        Button {
                            if isSaving { return }
                            if inputText.isEmpty { return }
                            if selectedCourseId.isEmpty {
                                errorMessage = "コースを選択してください"
                                return
                            }

                            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                            
                            let generator = UIImpactFeedbackGenerator(style: .medium)
                            generator.impactOccurred()
                            
                            Task {
                                await saveText()
                            }
                        } label: {
                            if isSaving {
                                ProgressView().tint(.white)
                            } else {
                                Text("保存する")
                                    .font(.headline)
                                    .foregroundColor(.white)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .contentShape(Rectangle())
                        .background(
                            (selectedCourseId.isEmpty || inputText.isEmpty) ? Color.gray :
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
                        .scaleEffect(isSaving ? 0.98 : 1.0)
                        .animation(.easeInOut(duration: 0.2), value: isSaving)
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 16)
                }
            } // End VStack wrapper
            
            // Loading Overlay
            if isSaving {
                ZStack {
                    Color.black.opacity(0.8)
                    .ignoresSafeArea()
                    
                    VStack(spacing: 20) {
                        ProgressView(value: uploadProgress, total: 1.0)
                            .progressViewStyle(LinearProgressViewStyle(tint: .white))
                            .frame(width: 200)
                            .scaleEffect(1.2)
                        
                        Text("\(Int(uploadProgress * 100))%")
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                        
                        Text("保存中...")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
                .transition(.opacity)
                .zIndex(100) // Ensure it's on top
            }
        }
        .fileImporter(
            isPresented: $isImporting,
            allowedContentTypes: [.data, .content], 
            allowsMultipleSelection: false
        ) { result in
            handleFileImport(result: result)
        }
        .adaptivePaywallSheet(isPresented: $showPaywall) {
            showPaywall = false
        }
        .alert("利用上限に達しました", isPresented: $showLimitAlert) {
            Button("プランを確認", role: .cancel) {
                showPaywall = true
            }
        } message: {
            Text("Freeプランのナレッジ保存上限（5件）に達しました。\n無制限プランにアップグレードしてください。")
        }
        .alert("エラー", isPresented: Binding<Bool>(
            get: { errorMessage != nil },
            set: { _ in errorMessage = nil }
        )) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "")
        }
        .task {
            // Load courses for picker
            await courseViewModel.fetchCourses()
            // Default select first if available?
            // if let first = courseViewModel.courses.first { selectedCourseId = first.id }
        }
    }
    
    
    private func handleFileImport(result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }
            guard let user = appState.currentUser else { return }
            
            // Googleドキュメントなどのショートカットファイルをチェック
            let invalidExtensions = ["gdoc", "gsheet", "gslides"]
            if invalidExtensions.contains(url.pathExtension.lowercased()) {
                errorMessage = "Googleドキュメントなどのショートカットファイルは直接アップロードできません。\nGoogleアプリやPCから「PDF」などに書き出してから選択してください。"
                return
            }
            
            guard url.startAccessingSecurityScopedResource() else {
                errorMessage = "ファイルへのアクセス権限がありません"
                return
            }
            
            // To be safe with async, we should copy the file to a temp location we own.
            let tempDir = FileManager.default.temporaryDirectory
            let tempURL = tempDir.appendingPathComponent(url.lastPathComponent)
            do {
                if FileManager.default.fileExists(atPath: tempURL.path) {
                    try FileManager.default.removeItem(at: tempURL)
                }
                try FileManager.default.copyItem(at: url, to: tempURL)
            } catch {
                errorMessage = "ファイルの準備に失敗しました: \(error.localizedDescription)"
                url.stopAccessingSecurityScopedResource()
                return
            }
            url.stopAccessingSecurityScopedResource() // Check original access finished
            
            // Upload Task
            isSaving = true
            uploadProgress = 0.0
            errorMessage = nil
            
            guard !selectedCourseId.isEmpty else {
                errorMessage = "コースが選択されていません"
                isSaving = false
                return
            }
            
            let currentCourseId = selectedCourseId // capture for async task
            
            Task {
                do {
                    let _ = try await apiService.importFile(
                        fileURL: tempURL,
                        userId: user.id,
                        courseId: currentCourseId, // Pass courseId
                        userPlan: appState.userPlan,
                        tags: selectedTags,
                        progressHandler: { progress in
                            // UI更新（メインスレッド）
                            Task { @MainActor in
                                self.uploadProgress = progress
                            }
                        }
                    )
                    
                    // Cleanup temp
                    try? FileManager.default.removeItem(at: tempURL)
                    
                    await MainActor.run {
                        isSaving = false
                        uploadProgress = 0.0
                        selectedTags = [] // Reset tags
                        // Success Feedback
                        errorMessage = "アップロード完了！"
                    }
                } catch {
                     // Check forbidden (Limit)
                     await MainActor.run {
                         isSaving = false
                         try? FileManager.default.removeItem(at: tempURL)
                         
                         if let apiError = error as? APIError, case .forbidden(let detail) = apiError {
                               print("Knowledge Limit Reached: \(detail)")
                               showLimitAlert = true
                         } else {
                               errorMessage = "インポートに失敗しました: \(error.localizedDescription)"
                         }
                     }
                }
            }
            
        case .failure(let error):
            errorMessage = "ファイル選択エラー: \(error.localizedDescription)"
        }
    }

    private func saveText() async {
        guard !inputText.isEmpty else { return }
        guard let user = appState.currentUser else { return }
        guard !selectedCourseId.isEmpty else {
            errorMessage = "コースを選択してください"
            return
        }
        
        await MainActor.run {
             isSaving = true
             uploadProgress = 0.0
             errorMessage = nil
        }
        
        // Progress Simulation Task (Fake Progress)
        let progressTask = Task {
            var progress = 0.0
            while progress < 0.9 {
                if Task.isCancelled { return }
                try? await Task.sleep(nanoseconds: 300_000_000) // 0.3s
                progress += 0.1
                let current = progress
                await MainActor.run {
                    if self.isSaving {
                        self.uploadProgress = min(current, 0.9)
                    }
                }
            }
        }
        
        do {
            // Note: importText needs update to accept courseId too?
            // Currently importText DOES NOT accept courseId in APIService.
            // But we can pass it in tags or fix APIService.importText
            // Let's assume we pass it later or text import doesn't support course yet? 
            // Better to standardise.
            // For now, let's just upload. Ideally APIService.importText should take courseId.
            // I will update APIService.importText as well.
            
            let response = try await apiService.importText(
                text: inputText,
                userId: user.id,
                courseId: selectedCourseId, // Added courseId to APIService in previous thought (or it was already there?)
                // Checking APIService from Step 1026: importText signature IS:
                // func importText(text: String, userId: String, courseId: String? = nil, ...)
                // So it is already supported!
                source: "manual",
                tags: selectedTags, 
                summary: nil
            )
            
            progressTask.cancel()
            
            await MainActor.run {
                uploadProgress = 1.0
            }
            try? await Task.sleep(nanoseconds: 300_000_000)
            
            await MainActor.run {
                inputText = ""
                selectedTags = []
                errorMessage = "保存完了！"
            }
        } catch {
             progressTask.cancel()
             if let apiError = error as? APIError, case .forbidden(let detail) = apiError {
                  showLimitAlert = true
             } else {
                  errorMessage = "保存に失敗しました: \(error.localizedDescription)"
             }
        }
        
        isSaving = false
        uploadProgress = 0.0
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

// TagInputViewが重複する可能性があるため、もしSharedにあるならそれを使うべきだが、
// Pages.swift内に定義れていたものが KnowledgeView と共有されている形跡があった。
// ここでは KnowledgeView 専用として定義しておく（Sharedにあればそちらを使う）
// TagInputView is extracted here as well just in case.

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
