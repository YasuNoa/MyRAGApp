//
//  FeedbackView.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI

struct FeedbackView: View {
    @State private var feedbackText = ""
    @State private var isSending = false
    @State private var showSuccessAlert = false

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

                Text("一人で開発してるので、変なバグあったりするかもしれないです汗。すいません！！\nもしあったらすぐ修正するので、遠慮なくフィードバック送って欲しいです！！")
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
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )

                Button {
                    sendFeedback()
                } label: {
                    if isSending {
                         ProgressView().tint(.white)
                    } else {
                        Text("送信する")
                            .font(.headline)
                            .foregroundColor(.white)
                    }
                }
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
                .disabled(feedbackText.isEmpty || isSending)
                .opacity(feedbackText.isEmpty ? 0.6 : 1.0)
                .alert("送信完了", isPresented: $showSuccessAlert) {
                    Button("OK") {
                        feedbackText = ""
                    }
                } message: {
                    Text("フィードバックありがとうございます！確認して改善します。")
                }

                Spacer()
            }
            .padding(.horizontal, 20)
        }
    }
    
    private func sendFeedback() {
        guard !feedbackText.isEmpty else { return }
        
        isSending = true
        
        Task {
            do {
                try await APIService.shared.sendFeedback(content: feedbackText)
                
                await MainActor.run {
                    isSending = false
                    showSuccessAlert = true
                }
            } catch {
                await MainActor.run {
                    isSending = false
                    // Error handling could be added here (e.g. show alert)
                    print("Error sending feedback: \(error)")
                }
            }
        }
    }
}
