//
//  APIModels.swift
//  jibunAI-ios
//
//  OpenAPI仕様に基づくAPIのリクエスト・レスポンスモデル定義
//

import Foundation

// MARK: - Request Models

/// チャットリクエスト (/ask)
struct AskRequest: Codable {
    let query: String
    let userId: String
    let threadId: String?
    let tags: [String]
}

/// 音声保存リクエスト (/voice/save)
struct SaveVoiceRequest: Codable {
    let userId: String
    let transcript: String
    let summary: String
    let title: String
    let tags: [String]
}

/// インテント分類リクエスト (/classify)
struct ClassifyRequest: Codable {
    let text: String
}

/// クエリリクエスト (/query)
struct QueryRequest: Codable {
    let query: String
    let userId: String
    let tags: [String]
    let userPlan: String
}

/// テキストインポートリクエスト (/import-text)
struct TextImportRequest: Codable {
    let text: String
    let userId: String
    let source: String
    let dbId: String?
    let tags: [String]
    let summary: String?
}

/// ファイル削除リクエスト (/delete-file)
struct DeleteRequest: Codable {
    let fileId: String
    let userId: String
}

/// タグ更新リクエスト (/update-tags)
struct UpdateTagsRequest: Codable {
    let fileId: String
    let userId: String
    let tags: [String]
}

// MARK: - Response Models

/// チャットレスポンス
struct AskResponse: Codable {
    let answer: String
    let sources: [String]?
    let threadId: String?
}

/// 音声処理レスポンス
struct VoiceProcessResponse: Codable {
    let transcript: String
    let summary: String
}

/// インテント分類レスポンス
struct ClassifyResponse: Codable {
    let intent: String
    let confidence: Double?
}

/// クエリレスポンス
struct QueryResponse: Codable {
    let answer: String
    let sources: [SearchResult]?
}

/// 検索結果
struct SearchResult: Codable {
    let content: String
    let source: String?
    let score: Double?
    let metadata: [String: String]?
}

/// 一般的な成功レスポンス
struct SuccessResponse: Codable {
    let message: String
    let data: [String: AnyCodable]?
}

/// エラーレスポンス
struct ErrorResponse: Codable {
    let detail: String
}

// MARK: - Helper Types

/// 動的なJSONデータを扱うためのヘルパー
struct AnyCodable: Codable {
    let value: Any
    
    init(_ value: Any) {
        self.value = value
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if let intValue = try? container.decode(Int.self) {
            value = intValue
        } else if let doubleValue = try? container.decode(Double.self) {
            value = doubleValue
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else if let boolValue = try? container.decode(Bool.self) {
            value = boolValue
        } else if let arrayValue = try? container.decode([AnyCodable].self) {
            value = arrayValue.map { $0.value }
        } else if let dictValue = try? container.decode([String: AnyCodable].self) {
            value = dictValue.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        switch value {
        case let intValue as Int:
            try container.encode(intValue)
        case let doubleValue as Double:
            try container.encode(doubleValue)
        case let stringValue as String:
            try container.encode(stringValue)
        case let boolValue as Bool:
            try container.encode(boolValue)
        case let arrayValue as [Any]:
            try container.encode(arrayValue.map { AnyCodable($0) })
        case let dictValue as [String: Any]:
            try container.encode(dictValue.mapValues { AnyCodable($0) })
        default:
            try container.encodeNil()
        }
    }
}
