//
//  TrashView.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI

struct TrashView: View {
    @State private var deletedDocuments: [KnowledgeDocument] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingAlert = false
    @State private var alertMessage = ""
    
    // For confirmation
    @State private var itemToDelete: KnowledgeDocument?
    @State private var showDeleteConfirmation = false
    
    @EnvironmentObject var appState: AppStateManager
    private let apiService = APIService.shared
    
    var body: some View {
        ZStack {
            Color(red: 0.05, green: 0.05, blue: 0.05)
                .ignoresSafeArea()
            
            if isLoading && deletedDocuments.isEmpty {
                ProgressView().tint(.white)
            } else if deletedDocuments.isEmpty {
                VStack(spacing: 20) {
                    Image(systemName: "trash")
                        .font(.system(size: 60))
                        .foregroundColor(.gray)
                    Text("最近削除した項目はありません")
                        .font(.title3)
                        .foregroundColor(.white)
                    Text("削除された項目は30日後に\n自動的に削除されます")
                        .font(.caption)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
            } else {
                List {
                    ForEach(deletedDocuments) { doc in
                        HStack {
                            Image(systemName: "doc.text")
                                .foregroundColor(.gray)
                            VStack(alignment: .leading) {
                                Text(doc.title)
                                    .font(.headline)
                                    .foregroundColor(.white)
                                .lineLimit(1)
                                Text(doc.createdAt) // or deletedAt if available
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                            Spacer()
                        }
                        .listRowBackground(Color(red: 0.1, green: 0.1, blue: 0.1))
                        .swipeActions(edge: .leading) {
                            Button {
                                Task { await restore(doc) }
                            } label: {
                                Label("復元", systemImage: "arrow.uturn.backward")
                            }
                            .tint(.blue)
                        }
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                itemToDelete = doc
                                showDeleteConfirmation = true
                            } label: {
                                Label("完全削除", systemImage: "trash.slash")
                            }
                        }
                    }
                }
                .listStyle(.plain)
                .padding(.top)
            }
        }
        .navigationTitle("最近削除した項目")
        .task {
            await fetchTrash()
        }
        .alert("完全削除しますか？", isPresented: $showDeleteConfirmation) {
            Button("削除", role: .destructive) {
                if let item = itemToDelete {
                    Task { await deletePermanently(item) }
                }
            }
            Button("キャンセル", role: .cancel) {}
        } message: {
            Text("この操作は取り消せません。")
        }
        .alert("エラー", isPresented: Binding<Bool>(
            get: { errorMessage != nil },
            set: { _ in errorMessage = nil }
        )) {
            Button("OK") {}
        } message: {
            Text(errorMessage ?? "")
        }
    }
    
    private func fetchTrash() async {
        guard let user = appState.currentUser else { return }
        isLoading = true
        do {
            let docs = try await apiService.fetchTrash(userId: user.id)
            await MainActor.run {
                self.deletedDocuments = docs
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "取得に失敗しました: \(error.localizedDescription)"
            }
        }
        isLoading = false
    }
    
    private func restore(_ doc: KnowledgeDocument) async {
        guard let user = appState.currentUser else { return }
        do {
            _ = try await apiService.restoreFile(fileId: doc.id, userId: user.id)
            await fetchTrash() // Reload
        } catch {
            errorMessage = "復元に失敗しました: \(error.localizedDescription)"
        }
    }
    
    private func deletePermanently(_ doc: KnowledgeDocument) async {
        guard let user = appState.currentUser else { return }
        do {
            _ = try await apiService.deleteFilePermanently(fileId: doc.id, userId: user.id)
            await fetchTrash() // Reload
        } catch {
            errorMessage = "削除に失敗しました: \(error.localizedDescription)"
        }
    }
}
