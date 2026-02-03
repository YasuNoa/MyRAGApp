//
//  KnowledgeView.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI

// MARK: - Knowledge View

struct KnowledgeView: View {
    @StateObject private var knowledgeViewModel = KnowledgeViewModel()
    @StateObject private var courseViewModel = CourseViewModel()
    @StateObject private var subscriptionViewModel = SubscriptionViewModel()
    
    // Dependencies
    @EnvironmentObject var appState: AppStateManager
    
    // UI State for Importer
    // @State properties moved to ViewModel

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
                        
                        // コース選択
                        VStack(alignment: .leading, spacing: 8) {
                            Text("保存先コース (必須)")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.8))
                            
                            Menu {
                                Picker("コースを選択", selection: $knowledgeViewModel.selectedCourseId) {
                                    Text("選択なし").tag("")
                                    ForEach(courseViewModel.courses) { course in
                                        Text(course.title).tag(course.id)
                                    }
                                }
                            } label: {
                                HStack {
                                    if let course = courseViewModel.courses.first(where: { $0.id == knowledgeViewModel.selectedCourseId }) {
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
                            TabButton(title: "テキスト", isSelected: knowledgeViewModel.selectedTab == .text) {
                                knowledgeViewModel.selectedTab = .text
                            }
                            TabButton(title: "ファイル", isSelected: knowledgeViewModel.selectedTab == .file) {
                                knowledgeViewModel.selectedTab = .file
                            }
                        }

                        if knowledgeViewModel.selectedTab == .text {
                            // テキスト入力エリア
                            VStack(alignment: .leading, spacing: 12) {
                                Text("知識を手動で追加")
                                    .font(.headline)
                                    .foregroundColor(.white)

                                Text("タグ (任意)")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.6))

                                TagInputView(tags: $knowledgeViewModel.selectedTags)

                                TextEditor(text: $knowledgeViewModel.inputText)
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
                                    knowledgeViewModel.startImport()
                                } label: {
                                    HStack {
                                        Image(systemName: "folder.badge.plus")
                                        Text("ファイルを選択")
                                    }
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 16)
                                    .background(knowledgeViewModel.selectedCourseId.isEmpty ? Color.gray.opacity(0.3) : Color.white.opacity(0.1))
                                    .cornerRadius(12)
                                }
                                .disabled(knowledgeViewModel.selectedCourseId.isEmpty)
                                
                                Text("対応: PDF, 画像, Office, テキストなど")
                                    .font(.caption2)
                                    .foregroundColor(.gray)
                            }
                            .padding(.horizontal, 20)
                            
                            Spacer()
                        }
                    }
                    .padding(.horizontal, 20)
                }
                
                if knowledgeViewModel.selectedTab == .text {
                    VStack {
                        CustomButton(
                            title: "保存する",
                            action: {
                                guard let user = appState.currentUser else { return }
                                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                                
                                let generator = UIImpactFeedbackGenerator(style: .medium)
                                generator.impactOccurred()
                                
                                Task {
                                    await knowledgeViewModel.saveText(userId: user.id, userPlan: appState.userPlan)
                                }
                            },
                            isLoading: knowledgeViewModel.isSaving,
                            isDisabled: knowledgeViewModel.inputText.isEmpty || knowledgeViewModel.selectedCourseId.isEmpty
                        )
                        .background(
                             // Gradient Logic for CustomButton is slightly different if embedded. 
                             // CustomButton supports solid colors. 
                             // If we want gradient, CustomButton needs update or we wrap it.
                             // For now, let's stick to CustomButton's default primary style which is solid blue.
                             // Or we can enhance CustomButton later.
                             Color.clear 
                        )
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 16)
                }
            } // End VStack wrapper
            
            // Loading Overlay
            if knowledgeViewModel.isSaving {
                LoadingView(
                    message: "保存中...",
                    progress: knowledgeViewModel.uploadProgress
                )
            }
        }
        .fileImporter(
            isPresented: $knowledgeViewModel.isImporting,
            allowedContentTypes: [.data, .content], 
            allowsMultipleSelection: false
        ) { result in
            if let user = appState.currentUser {
                Task {
                    await knowledgeViewModel.handleFileImport(result: result, userId: user.id, userPlan: appState.userPlan)
                }
            }
        }
        .adaptivePaywallSheet(isPresented: $knowledgeViewModel.showPaywall, subscriptionViewModel: subscriptionViewModel) {
            knowledgeViewModel.showPaywall = false
        }
        .alert("利用上限に達しました", isPresented: $knowledgeViewModel.showLimitAlert) {
            Button("プランを確認", role: .cancel) {
                knowledgeViewModel.showPaywall = true
            }
        } message: {
            Text("Freeプランのナレッジ保存上限（5件）に達しました。\n無制限プランにアップグレードしてください。")
        }
        .alert("エラー", isPresented: Binding<Bool>(
            get: { knowledgeViewModel.errorMessage != nil },
            set: { _ in knowledgeViewModel.errorMessage = nil }
        )) {
            Button("OK") { }
        } message: {
            Text(knowledgeViewModel.errorMessage ?? "")
        }
        .task {
            // Load courses for picker
            await courseViewModel.fetchCourses()
            // Default select first if available?
            // if let first = courseViewModel.courses.first { knowledgeViewModel.selectedCourseId = first.id }
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

// TagInputView extracted here as before
struct TagInputView: View {
    @Binding var tags: [String]
    @State private var inputTag = ""
    @State private var errorMessage: String? = nil // Error state

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "tag")
                    .foregroundColor(.white.opacity(0.6))

                TextField("タグを入力 (Enterで追加)", text: $inputTag)
                    .foregroundColor(.white)
                    .tint(.white)
                    .onChange(of: inputTag) { _ in
                         errorMessage = nil // typing clears error
                    }
                    .onSubmit {
                        let trimmed = inputTag.trimmingCharacters(in: .whitespacesAndNewlines)
                        
                        // Validation
                        if trimmed.isEmpty {
                            inputTag = "" // Clear if just spaces
                            return
                        }
                        
                        // 1. Length Check
                        if trimmed.count > 20 {
                            errorMessage = "20文字以内で入力してください"
                            return
                        }
                        
                        // 2. Duplicate Check
                        if tags.contains(trimmed) {
                             inputTag = ""
                             errorMessage = "既に追加されています"
                             return
                        }
                        
                        // 3. Whitelist Check
                        if isValidTag(trimmed) {
                            tags.append(trimmed)
                            inputTag = ""
                            errorMessage = nil
                        } else {
                            errorMessage = "使用できない文字が含まれています"
                        }
                    }
            }
            .padding(12)
            .background(Color(red: 0.15, green: 0.15, blue: 0.15))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(errorMessage != nil ? Color.red : Color.clear, lineWidth: 1)
            )
            
            // Error Message Display
            if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding(.leading, 4)
            }

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
    
    private func isValidTag(_ text: String) -> Bool {
      
        let pattern = "^[\\w\\p{Hiragana}\\p{Katakana}\\p{Han}\\-!\\?\\.\\#\\+]+$"
        return text.range(of: pattern, options: .regularExpression) != nil
    }
}


