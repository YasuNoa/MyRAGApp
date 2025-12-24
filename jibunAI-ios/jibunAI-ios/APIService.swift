//
//  APIService.swift
//  jibunAI-ios
//
//  OpenAPI仕様に基づくAPIクライアント
//  FastAPIバックエンドとの通信を担当
//

import Foundation
import Combine

/// APIエラー
enum APIError: LocalizedError {
    case invalidURL
    case noData
    case decodingError(Error)
    case serverError(String)
    case networkError(Error)
    case unauthorized
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "無効なURLです"
        case .noData:
            return "データが受信されませんでした"
        case .decodingError(let error):
            return "データの解析に失敗しました: \(error.localizedDescription)"
        case .serverError(let message):
            return "サーバーエラー: \(message)"
        case .networkError(let error):
            return "ネットワークエラー: \(error.localizedDescription)"
        case .unauthorized:
            return "認証に失敗しました"
        }
    }
}

/// APIサービス
@MainActor
class APIService: ObservableObject {
    
    // MARK: - Properties
    
    /// ベースURL
    /// ベースURL (Python Backend - Features)
    #if DEBUG
    // 開発環境 (シミュレータ用: localhost)
    static let baseURL = "http://localhost:8000"
    // 認証用URL (Next.js Backend - Auth)
    static let authBaseURL = "http://localhost:3000"
    #else
    // 本番環境 (Cloud Run)
    static let baseURL = "https://myragapp-backend-968150096572.asia-northeast1.run.app"
    // 認証用URL (Next.js Backend - Auth) - TODO: Replace with actual Web Cloud Run URL
    static let authBaseURL = "https://myragapp-web-placeholder.run.app"
    #endif
    
    /// Firebase ID Token（認証用）
    @Published var authToken: String?
    
    // MARK: - Singleton
    
    static let shared = APIService()
    
    private init() {}
    
    // MARK: - Session
    
    // 長時間のアップロード/処理に対応するためのカスタムセッション
    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 300 // 5分
        config.timeoutIntervalForResource = 600 // 10分
        return URLSession(configuration: config)
    }()
    
    // MARK: - Private Methods
    
    /// 共通のリクエスト実行メソッド
    private func performRequest<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Data? = nil,
        requiresAuth: Bool = true,
        customBaseURL: String? = nil
    ) async throws -> T {
        
        // Use customBaseURL if provided, otherwise default to Self.baseURL
        let baseURLToUse = customBaseURL ?? Self.baseURL
        
        guard let url = URL(string: "\(baseURLToUse)\(endpoint)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // 認証トークンを付与
        if requiresAuth, let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = body
        }
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.networkError(NSError(domain: "Invalid response", code: -1))
            }
            
            // ステータスコードチェック
            switch httpResponse.statusCode {
            case 200...299:
                // 成功
                break
            case 401:
                throw APIError.unauthorized
            case 400...599:
                // エラーレスポンスをパース
                if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                    throw APIError.serverError(errorResponse.detail)
                } else {
                    throw APIError.serverError("HTTPステータスコード: \(httpResponse.statusCode)")
                }
            default:
                throw APIError.serverError("不明なエラー")
            }
            
            // レスポンスをデコード
            do {
                let decoder = JSONDecoder()
                return try decoder.decode(T.self, from: data)
            } catch {
                throw APIError.decodingError(error)
            }
            
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }
    
    /// マルチパートフォームデータのアップロード
    private func uploadMultipartData<T: Decodable>(
        endpoint: String,
        fileData: Data,
        fileName: String,
        metadata: [String: Any],
        requiresAuth: Bool = true
    ) async throws -> T {
        
        guard let url = URL(string: "\(Self.baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }
        
        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        // 認証トークン
        if requiresAuth, let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // マルチパートボディを作成
        var body = Data()
        
        // ファイルパート
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: application/octet-stream\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n".data(using: .utf8)!)
        
        // メタデータパート
        if let metadataJSON = try? JSONSerialization.data(withJSONObject: metadata, options: []),
           let metadataString = String(data: metadataJSON, encoding: .utf8) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"metadata\"\r\n\r\n".data(using: .utf8)!)
            body.append(metadataString.data(using: .utf8)!)
            body.append("\r\n".data(using: .utf8)!)
        }
        
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.networkError(NSError(domain: "Invalid response", code: -1))
            }
            
            switch httpResponse.statusCode {
            case 200...299:
                break
            case 401:
                throw APIError.unauthorized
            default:
                if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                    throw APIError.serverError(errorResponse.detail)
                } else {
                    throw APIError.serverError("HTTPステータスコード: \(httpResponse.statusCode)")
                }
            }
            
            do {
                return try JSONDecoder().decode(T.self, from: data)
            } catch {
                throw APIError.decodingError(error)
            }
            
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }
    
    /// マルチパートフォームデータのアップロード (ファイルURLからストリーム)
    private func uploadMultipartFile<T: Decodable>(
        endpoint: String,
        fileURL: URL,
        fileName: String,
        metadata: [String: Any],
        requiresAuth: Bool = true
    ) async throws -> T {
        guard let url = URL(string: "\(Self.baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }
        
        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        if requiresAuth, let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // 一時ファイルを作成してボディを書き込む
        let tempDir = FileManager.default.temporaryDirectory
        let tempFileURL = tempDir.appendingPathComponent(UUID().uuidString)
        
        do {
            let fileHandle = try FileHandle(forWritingTo: tempFileURL)
            defer { try? fileHandle.close() }
            
            // 1. Metadata Part
            if let metadataJSON = try? JSONSerialization.data(withJSONObject: metadata, options: []),
               let metadataString = String(data: metadataJSON, encoding: .utf8) {
                fileHandle.write("--\(boundary)\r\n".data(using: .utf8)!)
                fileHandle.write("Content-Disposition: form-data; name=\"metadata\"\r\n\r\n".data(using: .utf8)!)
                fileHandle.write(metadataString.data(using: .utf8)!)
                fileHandle.write("\r\n".data(using: .utf8)!)
            }
            
            // 2. File Header Part
            fileHandle.write("--\(boundary)\r\n".data(using: .utf8)!)
            fileHandle.write("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
            fileHandle.write("Content-Type: application/octet-stream\r\n\r\n".data(using: .utf8)!)
            
            // 3. File Content (Stream from original file)
            // 大きなファイルをチャンクで読み込んで書き込む
            let originalFileHandle = try FileHandle(forReadingFrom: fileURL)
            defer { try? originalFileHandle.close() }
            
            let bufferSize = 1024 * 1024 // 1MB Buffer
            while true {
                 let data = originalFileHandle.readData(ofLength: bufferSize)
                 if data.isEmpty { break }
                 fileHandle.write(data)
            }
            
            fileHandle.write("\r\n".data(using: .utf8)!)
            fileHandle.write("--\(boundary)--\r\n".data(using: .utf8)!)
            
        } catch {
            throw APIError.serverError("Failed to prepare upload body: \(error.localizedDescription)")
        }
        
        // アップロード実行
        do {
            let (data, response) = try await session.upload(for: request, fromFile: tempFileURL)
            
            // クリーンアップ
            try? FileManager.default.removeItem(at: tempFileURL)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.networkError(NSError(domain: "Invalid response", code: -1))
            }
            
            switch httpResponse.statusCode {
            case 200...299:
                break
            case 401:
                throw APIError.unauthorized
            default:
                if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                    throw APIError.serverError(errorResponse.detail)
                } else {
                    throw APIError.serverError("HTTPステータスコード: \(httpResponse.statusCode)")
                }
            }
            
            do {
                return try JSONDecoder().decode(T.self, from: data)
            } catch {
                throw APIError.decodingError(error)
            }
        } catch let error as APIError {
            try? FileManager.default.removeItem(at: tempFileURL)
            throw error
        } catch {
            try? FileManager.default.removeItem(at: tempFileURL)
            throw APIError.networkError(error)
        }
    }
    
    // MARK: - Public API Methods
    
    /// チャット (POST /ask)
    func ask(query: String, userId: String, threadId: String? = nil, tags: [String] = []) async throws -> AskResponse {
        let request = AskRequest(query: query, userId: userId, threadId: threadId, tags: tags)
        let body = try JSONEncoder().encode(request)
        return try await performRequest(endpoint: "/ask", method: "POST", body: body)
    }
    
    /// 音声処理 (POST /voice/process) - Data版 (後方互換性)
    func processVoice(audioData: Data, fileName: String, userId: String, tags: [String] = []) async throws -> VoiceProcessResponse {
        let metadata: [String: Any] = [
            "userId": userId,
            "tags": tags
        ]
        return try await uploadMultipartData(endpoint: "/voice/process", fileData: audioData, fileName: fileName, metadata: metadata)
    }
    
    /// 音声処理 (POST /voice/process) - FileURL版 (推奨: メモリ効率良)
    func processVoice(fileURL: URL, fileName: String, userId: String, tags: [String] = []) async throws -> VoiceProcessResponse {
        let metadata: [String: Any] = [
            "userId": userId,
            "tags": tags
        ]
        return try await uploadMultipartFile(endpoint: "/voice/process", fileURL: fileURL, fileName: fileName, metadata: metadata)
    }
    
    /// 音声保存 (POST /voice/save)
    func saveVoice(userId: String, transcript: String, summary: String, title: String, tags: [String] = []) async throws -> SuccessResponse {
        let request = SaveVoiceRequest(userId: userId, transcript: transcript, summary: summary, title: title, tags: tags)
        let body = try JSONEncoder().encode(request)
        return try await performRequest(endpoint: "/voice/save", method: "POST", body: body)
    }
    
    /// インテント分類 (POST /classify)
    func classify(text: String) async throws -> ClassifyResponse {
        let request = ClassifyRequest(text: text)
        let body = try JSONEncoder().encode(request)
        return try await performRequest(endpoint: "/classify", method: "POST", body: body)
    }
    
    /// 知識検索 (POST /query)
    func query(query: String, userId: String, tags: [String] = [], userPlan: String = "FREE") async throws -> QueryResponse {
        let request = QueryRequest(query: query, userId: userId, tags: tags, userPlan: userPlan)
        let body = try JSONEncoder().encode(request)
        return try await performRequest(endpoint: "/query", method: "POST", body: body)
    }
    
    /// テキストインポート (POST /import-text)
    func importText(text: String, userId: String, source: String = "manual", dbId: String? = nil, tags: [String] = [], summary: String? = nil) async throws -> SuccessResponse {
        let request = TextImportRequest(text: text, userId: userId, source: source, dbId: dbId, tags: tags, summary: summary)
        let body = try JSONEncoder().encode(request)
        return try await performRequest(endpoint: "/import-text", method: "POST", body: body)
    }
    
    /// ファイル削除 (POST /delete-file)
    func deleteFile(fileId: String, userId: String) async throws -> SuccessResponse {
        let request = DeleteRequest(fileId: fileId, userId: userId)
        let body = try JSONEncoder().encode(request)
        return try await performRequest(endpoint: "/delete-file", method: "POST", body: body)
    }
    
    /// タグ更新 (POST /update-tags)
    func updateTags(fileId: String, userId: String, tags: [String]) async throws -> SuccessResponse {
        let request = UpdateTagsRequest(fileId: fileId, userId: userId, tags: tags)
        let body = try JSONEncoder().encode(request)
        return try await performRequest(endpoint: "/update-tags", method: "POST", body: body)
    }
    
    /// カテゴリ取得 (GET /knowledge/categories)
    func fetchCategories() async throws -> CategoryResponse {
        // Categories endpoint is on Next.js Backend (authBaseURL)
        return try await performRequest(endpoint: "/api/knowledge/categories", method: "GET", customBaseURL: Self.authBaseURL)
    }
    
    /// ヘルスチェック (GET /health)
    func healthCheck() async throws -> [String: String] {
        return try await performRequest(endpoint: "/health", method: "GET", requiresAuth: false)
    }
}
