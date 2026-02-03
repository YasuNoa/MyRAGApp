//
//  EditKnowledgeView.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI

struct EditKnowledgeView: View {
    @Environment(\.dismiss) var dismiss
    let document: KnowledgeDocument
    let onSave: (String, [String]) -> Void
    
    @State private var title: String
    @State private var selectedTags: [String]
    
    init(document: KnowledgeDocument, onSave: @escaping (String, [String]) -> Void) {
        self.document = document
        self.onSave = onSave
        _title = State(initialValue: document.title)
        _selectedTags = State(initialValue: document.tags)
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(red: 0.05, green: 0.05, blue: 0.05).ignoresSafeArea()
                
                Form {
                    Section(header: Text("基本情報")) {
                        TextField("タイトル", text: $title)
                    }
                    
                    Section(header: Text("タグ")) {
                        TagInputView(tags: $selectedTags)
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("編集")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        onSave(title, selectedTags)
                        dismiss()
                    }
                    .disabled(title.isEmpty)
                }
            }
        }
    }
}
