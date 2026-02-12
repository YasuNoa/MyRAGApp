//
//  KnowledgeViewModel.swift
//  jibunAI-ios
//
//  Created by 田中正造 on 2026/01/27.
//

import Foundation
import SwiftUI
import Combine

@MainActor
class KnowledgeViewModel: ObservableObject {
    
    enum Tab {
        case text
        case file
    }
    
    // MARK: - Published Properties
    
    @Published var selectedTab: Tab = .text
    @Published var inputText = ""
    @Published var selectedTags: [String] = []
    
    // Course Selection
    @Published var selectedCourseId: String = ""
    
    // UI State
    @Published var isSaving = false
    @Published var errorMessage: String?
    @Published var showLimitAlert = false
    @Published var uploadProgress: Double = 0.0
    
    // View Control
    @Published var isImporting = false
    @Published var showPaywall = false
    
    // Dependencies
    private let apiService = APIService.shared
    
    // MARK: - Methods
    
    func startImport() {
        if selectedCourseId.isEmpty {
            errorMessage = "コースを選択してください"
            return
        }
        isImporting = true
    }
    
    func saveText(userId: String, userPlan: String) async -> Bool {
        guard !inputText.isEmpty else { return false }
        guard !selectedCourseId.isEmpty else {
            errorMessage = "コースを選択してください"
            return false
        }
        
        isSaving = true
        uploadProgress = 0.0
        errorMessage = nil
        
        // Progress Simulation Task
        let progressTask = Task {
            var progress = 0.0
            while progress < 0.9 {
                try Task.checkCancellation() // 協調的キャンセル
                try? await Task.sleep(nanoseconds: 300_000_000) // 0.3s
                
                progress += 0.1
                let current = progress
                
                await MainActor.run {
                    // Check cancellation again before update? Not strictly necessary due to checkCancellation above,
                    // but safer if we want to avoid update after cancel.
                    if !Task.isCancelled {
                        self.uploadProgress = min(current, 0.9)
                    }
                }
            }
        }
        
        // Cleanup Block (Always executed)
        defer {
            progressTask.cancel()
            isSaving = false
        }
        
        do {
            let _ = try await apiService.importText(
                text: inputText,
                userId: userId,
                courseId: selectedCourseId,
                source: "manual",
                tags: selectedTags,
                summary: nil
            )
            
            // Success
            uploadProgress = 1.0
            try? await Task.sleep(nanoseconds: 300_000_000)
            
            inputText = ""
            selectedTags = []
            errorMessage = "保存完了！"
            return true
            
        } catch {
            if let apiError = error as? APIError, case .forbidden(let detail) = apiError {
                // Limit handling
                AppLogger.knowledge.warning("Limit reached: \(detail)")
                showLimitAlert = true
            } else {
                errorMessage = "保存に失敗しました: \(error.localizedDescription)"
            }
            return false
        }
    }
    
    func handleFileImport(result: Result<[URL], Error>, userId: String, userPlan: String) async {
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }
            
            // Check extension
            let invalidExtensions = ["gdoc", "gsheet", "gslides"]
            if invalidExtensions.contains(url.pathExtension.lowercased()) {
                errorMessage = "Googleドキュメントなどのショートカットファイルは直接アップロードできません。\nGoogleアプリやPCから「PDF」などに書き出してから選択してください。"
                return
            }
            
            guard url.startAccessingSecurityScopedResource() else {
                errorMessage = "ファイルへのアクセス権限がありません"
                return
            }
            
            // Copy to temp
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
            url.stopAccessingSecurityScopedResource()
            
            // Upload
            isSaving = true
            uploadProgress = 0.0
            errorMessage = nil
            
            guard !selectedCourseId.isEmpty else {
                errorMessage = "コースが選択されていません"
                isSaving = false
                return
            }
            
            let currentCourseId = selectedCourseId
            
            // Task wrap not needed here as this function is async, but api call is blocking
            do {
                let _ = try await apiService.importFile(
                    fileURL: tempURL,
                    userId: userId,
                    courseId: currentCourseId,
                    userPlan: userPlan,
                    tags: selectedTags,
                    progressHandler: { progress in
                        Task { @MainActor in
                            self.uploadProgress = progress
                        }
                    }
                )
                
                try? FileManager.default.removeItem(at: tempURL)
                
                isSaving = false
                uploadProgress = 0.0
                selectedTags = []
                errorMessage = "アップロード完了！"
                
            } catch {
                isSaving = false
                try? FileManager.default.removeItem(at: tempURL)
                
                if let apiError = error as? APIError, case .forbidden(let detail) = apiError {
                    AppLogger.knowledge.debug("Limit Check: \(detail)")
                    showLimitAlert = true
                } else {
                    errorMessage = "インポートに失敗しました: \(error.localizedDescription)"
                }
            }
            
        case .failure(let error):
            errorMessage = "ファイル選択エラー: \(error.localizedDescription)"
        }
    }
}
