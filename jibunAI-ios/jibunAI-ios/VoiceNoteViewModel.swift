//
//  VoiceNoteViewModel.swift
//  jibunAI-ios
//
//  音声メモ画面のロジック
//  録音管理とAPIアップロード
//

import Foundation
import Combine
import AVFoundation

@MainActor
class VoiceNoteViewModel: NSObject, ObservableObject, AVAudioRecorderDelegate {
    
    @Published var isRecording = false
    @Published var recordingTime: TimeInterval = 0
    @Published var transcript = ""
    @Published var summary = ""
    @Published var isProcessing = false
    @Published var errorMessage: String?
    
    // 録音ファイル
    private var audioRecorder: AVAudioRecorder?
    private var timer: Timer?
    
    // API
    private let apiService = APIService.shared
    
    // 録音開始
    func startRecording() {
        let audioSession = AVAudioSession.sharedInstance()
        
        do {
            try audioSession.setCategory(.playAndRecord, mode: .default)
            try audioSession.setActive(true)
            
            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 12000,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
            ]
            
            let filename = getDocumentsDirectory().appendingPathComponent("recording.m4a")
            
            audioRecorder = try AVAudioRecorder(url: filename, settings: settings)
            audioRecorder?.delegate = self
            audioRecorder?.record()
            
            isRecording = true
            errorMessage = nil
            
            // タイマースタート
            recordingTime = 0
            timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
                Task { @MainActor in
                    self.recordingTime += 1
                }
            }
            
        } catch {
            errorMessage = "録音を開始できませんでした: \(error.localizedDescription)"
        }
    }
    
    // 録音停止
    func stopRecording(userId: String) {
        audioRecorder?.stop()
        audioRecorder = nil
        isRecording = false
        timer?.invalidate()
        timer = nil
        
        // AudioSessionを非アクティブ化 (マイクをオフにする)
        try? AVAudioSession.sharedInstance().setActive(false)
        
        // 即座にアップロード (少し待ってから実行)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.uploadRecording(userId: userId)
        }
    }
    
    // 録音ファイルをアップロード
    private func uploadRecording(userId: String) {
        guard let path = getDocumentsDirectory().appendingPathComponent("recording.m4a") as URL? else { return }
        
        isProcessing = true
        
        Task {
            do {
                // ファイルURLを直接渡す (メモリ効率化)
                let response = try await apiService.processVoice(
                    fileURL: path,
                    fileName: "recording.m4a",
                    userId: userId,
                    tags: ["iOS", "VoiceMemo"]
                )
                
                // 結果を表示
                self.transcript = response.transcript
                self.summary = response.summary
                
            } catch {
                errorMessage = "アップロードに失敗しました: \(error.localizedDescription)"
            }
            
            isProcessing = false
        }
    }
    
    private func getDocumentsDirectory() -> URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }
}
