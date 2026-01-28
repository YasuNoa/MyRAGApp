//
//  VoiceNoteView.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI
import Speech

struct VoiceNoteView: View {
    @EnvironmentObject var appState: AppStateManager
    @StateObject private var viewModel = VoiceNoteViewModel()
    
    // アラート用
    @State private var showingAlert = false
    @State private var alertMessage = ""
    
    // Paywall用
    @State private var showPaywall = false

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
                                // Pre-check limit
                                // FREE plan limit: 1 voice note per day
                                if appState.userPlan == "FREE",
                                   let usage = appState.currentUser?.usage,
                                   usage.dailyVoiceCount >= 1 {
                                    print("🚫 Free plan limit reached (Pre-check)")
                                    viewModel.limitAlertMessage = "Freeプランの1日の音声利用上限（1回）に達しました。\n無制限プランにアップグレードしてください。"
                                    viewModel.showLimitAlert = true // まずアラートを表示
                                    return
                                }
                                
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
                        .alert("利用上限に達しました", isPresented: $viewModel.showLimitAlert) {
                            Button("プランを確認", role: .cancel) {
                                showPaywall = true
                            }
                        } message: {
                            Text(viewModel.limitAlertMessage ?? "")
                        }
                        .adaptivePaywallSheet(isPresented: $showPaywall) {
                            showPaywall = false
                        }
                        
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
                                .onChange(of: viewModel.transcript) {
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
        .alert("エラー", isPresented: Binding<Bool>(
            get: { viewModel.errorMessage != nil },
            set: { _ in viewModel.errorMessage = nil }
        )) {
            Button("OK") {}
        } message: {
            Text(viewModel.errorMessage ?? "")
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
