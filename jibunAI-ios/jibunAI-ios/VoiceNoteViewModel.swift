//
//  VoiceNoteViewModel.swift
//  jibunAI-ios
//
//  音声メモ画面のロジック
//  録音管理、リアルタイム文字起こし、APIアップロード
//

import Foundation
import Combine
import AVFoundation
import Speech

@MainActor
class VoiceNoteViewModel: NSObject, ObservableObject, SFSpeechRecognizerDelegate {
    
    // MARK: - Published Properties
    
    @Published var isRecording = false
    @Published var recordingTime: TimeInterval = 0
    
    // リアルタイム認識結果
    @Published var transcript = ""
    
    // 解析結果
    @Published var summary = ""
    @Published var tags: [String] = []
    
    // 状態
    @Published var isProcessing = false
    @Published var errorMessage: String?
    
    // MARK: - Private Properties
    
    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "ja-JP"))
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()
    
    // 録音ファイルの一時保存場所
    private var audioFileURL: URL?
    private var audioFile: AVAudioFile?
    
    private var timer: Timer?
    
    // API
    private let apiService = APIService.shared
    
    override init() {
        super.init()
        speechRecognizer?.delegate = self
    }
    
    // MARK: - Recording Methods
    
    func startRecording() {
        // 前回のタスクがあればキャンセル
        if recognitionTask != nil {
            recognitionTask?.cancel()
            recognitionTask = nil
        }
        
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            errorMessage = "音声セッションの設定に失敗しました: \(error.localizedDescription)"
            return
        }
        
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else { return }
        recognitionRequest.shouldReportPartialResults = true
        
        // 録音ファイルの保存準備
        let docDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let fileName = "recording_\(Date().timeIntervalSince1970).m4a"
        audioFileURL = docDir.appendingPathComponent(fileName)
        
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        
        // AVAudioFileの作成 (書き込み用)
        do {
            // Note: AVAudioFile using settings from inputNode
            // Cloud Runの文字起こしAPI (Whisper等) はm4a/mp3などを期待することがあるため、
            // CoreAudioのフォーマットに合わせるが、ここではcafなど扱いやすい形式で一旦保存し、
            // アップロード時に変換するか、そのまま送る。
            // 簡易的に .caf (Core Audio Format) で保存する。
            audioFile = try AVAudioFile(forWriting: audioFileURL!, settings: recordingFormat.settings)
        } catch {
            print("AudioFile init error: \(error)")
        }
        
        // 認識タスクの開始
        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }
            
            var isFinal = false
            
            if let result = result {
                self.transcript = result.bestTranscription.formattedString
                isFinal = result.isFinal
            }
            
            if error != nil || isFinal {
                self.audioEngine.stop()
                inputNode.removeTap(onBus: 0)
                
                self.recognitionRequest = nil
                self.recognitionTask = nil
                
                // 録音終了時の処理は stopRecording で行うためここでは何もしない
            }
        }
        
        // マイク入力のタップ
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] (buffer, when) in
            guard let self = self else { return }
            
            // 音声認識へ
            self.recognitionRequest?.append(buffer)
            
            // ファイル保存へ
            do {
                try self.audioFile?.write(from: buffer)
            } catch {
                print("Audio write error: \(error)")
            }
        }
        
        audioEngine.prepare()
        
        do {
            try audioEngine.start()
            isRecording = true
            errorMessage = nil
            transcript = ""
            summary = ""
            tags = []
            
            // タイマースタート
            recordingTime = 0
            timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
                Task { @MainActor in
                    self.recordingTime += 1
                }
            }
        } catch {
            errorMessage = "録音エンジンの起動に失敗しました: \(error.localizedDescription)"
        }
    }
    
    func stopRecording(userId: String) {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionTask = nil
        
        isRecording = false
        timer?.invalidate()
        timer = nil
        
        // AudioFileを閉じる (参照をnilにするだけでcloseされる)
        audioFile = nil
        
        Task {
            // 少し待ってからアップロード＆解析開始
             try? await Task.sleep(nanoseconds: 500_000_000) // 0.5s
             await processAudio(userId: userId)
        }
    }
    
    // APIへアップロードして解析
    private func processAudio(userId: String) async {
        guard let fileURL = audioFileURL else { return }
        
        isProcessing = true
        
        do {
            // アップロード＆処理
             let response = try await apiService.processVoice(
                fileURL: fileURL,
                fileName: "voice_memo.m4a", // サーバー側で拡張子を見て処理する場合に合わせて固定名または拡張子などを調整
                userId: userId,
                tags: self.tags
            )
            
            self.transcript = response.transcript
            self.summary = response.summary
            
        } catch {
            errorMessage = "解析に失敗しました: \(error.localizedDescription)"
        }
        
        isProcessing = false
    }
    
    // 解析結果を保存 (Webの "Import")
    func saveVoice(userId: String) async -> Bool {
        do {
            let _ = try await apiService.saveVoice(
                userId: userId,
                transcript: transcript,
                summary: summary,
                title: "Voice Memo \(Date().formatted())", // タイトルは日時で自動生成
                tags: tags
            )
            
            // 成功したらリセット
            reset()
            return true
        } catch {
            errorMessage = "保存に失敗しました: \(error.localizedDescription)"
            return false
        }
    }
    
    func reset() {
        transcript = ""
        summary = ""
        tags = []
        errorMessage = nil
        recordingTime = 0
        isProcessing = false
        // 一時ファイルを削除
        if let url = audioFileURL {
            try? FileManager.default.removeItem(at: url)
            audioFileURL = nil
        }
    }
}
