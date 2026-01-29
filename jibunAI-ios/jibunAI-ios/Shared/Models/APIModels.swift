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
    
    enum CodingKeys: String, CodingKey {
        case query
        case userId
        case threadId
        case tags
    }
}

/// 音声保存リクエスト (/voice/save)
struct SaveVoiceRequest: Codable {
    let userId: String
    let transcript: String
    let summary: String
    let title: String
    let tags: [String]
    
    enum CodingKeys: String, CodingKey {
        case userId
        case transcript
        case summary
        case title
        case tags
    }
}

/// インテント分類リクエスト (/classify)
struct ClassifyRequest: Codable {
    let text: String
    
    enum CodingKeys: String, CodingKey {
        case text
    }
}

/// クエリリクエスト (/query)
struct QueryRequest: Codable {
    let query: String
    let userId: String
    let tags: [String]
    let userPlan: String
    
    enum CodingKeys: String, CodingKey {
        case query
        case userId
        case tags
        case userPlan
    }
}

/// テキストインポートリクエスト (/import-text)
struct TextImportRequest: Codable {
    let text: String
    let userId: String
    let courseId: String? // Added
    let source: String
    let dbId: String?
    let tags: [String]
    let summary: String?
    
    enum CodingKeys: String, CodingKey {
        case text
        case userId
        case courseId // Added
        case source
        case dbId
        case tags
        case summary
    }
}

/// ファイル削除リクエスト (/delete-file)
struct DeleteRequest: Codable {
    let fileId: String
    let userId: String
    
    enum CodingKeys: String, CodingKey {
        case fileId
        case userId
    }
}

/// タグ更新リクエスト (/update-tags)
struct UpdateTagsRequest: Codable {
    let fileId: String
    let userId: String
    let tags: [String]
    
    enum CodingKeys: String, CodingKey {
        case fileId
        case userId
        case tags
    }
}

// MARK: - Response Models

/// チャットレスポンス
struct AskResponse: Codable {
    let answer: String
    let sources: [String]?
    let threadId: String?
    
    enum CodingKeys: String, CodingKey {
        case answer
        case sources
        case threadId
    }
}

/// 音声処理レスポンス
struct VoiceProcessResponse: Codable {
    let transcript: String
    let summary: String
    
    enum CodingKeys: String, CodingKey {
        case transcript
        case summary
    }
}

/// 音声保存レスポンス
struct VoiceSaveResponse: Codable {
    let id: String
    let status: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case status
    }
}

/// インテント分類レスポンス
struct ClassifyResponse: Codable {
    let intent: String
    let confidence: Double?
    
    enum CodingKeys: String, CodingKey {
        case intent
        case confidence
    }
}

/// クエリレスポンス
struct QueryResponse: Codable {
    let answer: String
    let sources: [SearchResult]?
    
    enum CodingKeys: String, CodingKey {
        case answer
        case sources
    }
}

/// 検索結果
struct SearchResult: Codable {
    let content: String
    let source: String?
    let score: Double?
    let metadata: [String: AnyCodable]?
    
    enum CodingKeys: String, CodingKey {
        case content
        case source
        case score
        case metadata
    }
}

/// 一般的な成功レスポンス
struct SuccessResponse: Codable {
    let status: String?
    let message: String?
    let fileId: String?
    let chunks_count: Int?
    
    enum CodingKeys: String, CodingKey {
        case status
        case message
        case fileId
        case chunks_count
    }
}

/// エラーレスポンス
struct ErrorResponse: Codable {
    let detail: String
    
    enum CodingKeys: String, CodingKey {
        case detail
    }
}

/// カテゴリ（タグ）レスポンス
struct CategoryResponse: Codable {
    let tags: [String]
    
    enum CodingKeys: String, CodingKey {
        case tags
    }
}

// MARK: - Helper Types

/// 動的なJSONデータを扱うためのヘルパー
struct AnyCodable: Codable, Equatable {
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
            // Null handle
            if container.decodeNil() {
                value = NSNull()
            } else {
                throw DecodingError.dataCorruptedError(in: container, debugDescription: "AnyCodable value cannot be decoded")
            }
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
        case is NSNull:
            try container.encodeNil()
        default:
            throw EncodingError.invalidValue(value, EncodingError.Context(codingPath: container.codingPath, debugDescription: "AnyCodable value cannot be encoded"))
        }
    }
    
    static func == (lhs: AnyCodable, rhs: AnyCodable) -> Bool {
        switch (lhs.value, rhs.value) {
        case (let l as Int, let r as Int):
            return l == r
        case (let l as Double, let r as Double):
            return l == r
        case (let l as String, let r as String):
            return l == r
        case (let l as Bool, let r as Bool):
            return l == r
        case (let l as [Any], let r as [Any]):
            return l.map { AnyCodable($0) } == r.map { AnyCodable($0) }
        case (let l as [String: Any], let r as [String: Any]):
            return l.mapValues { AnyCodable($0) } == r.mapValues { AnyCodable($0) }
        case (is NSNull, is NSNull):
            return true
        default:
            return false
        }
    }
}

// MARK: - Knowledge Base Models

struct KnowledgeDocument: Codable, Identifiable, Equatable {
    let id: String
    let userId: String
    let title: String
    let content: String?
    let summary: String?
    let type: String
    let tags: [String]
    let source: String
    let mimeType: String?
    let createdAt: String // ISO8601 String
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId
        case title
        case content
        case summary
        case type
        case tags
        case source
        case mimeType
        case createdAt
    }
}

struct KnowledgeListResponse: Codable {
    let documents: [KnowledgeDocument]
}

struct DeleteKnowledgeRequest: Codable {
    let id: String
}

struct UpdateKnowledgeRequest: Codable {
    let id: String
    let tags: [String]?
    let title: String?
}

struct WebSuccessResponse: Codable {
    let success: Bool
    let error: String?
}

// MARK: - Course & Exam Models

struct Course: Codable, Identifiable, Equatable {
    let id: String
    let userId: String
    let title: String
    let color: String // blue, red, green, etc.
    let icon: String?
    let createdAt: String
    let documentCount: Int? // Optional counts
    let examCount: Int?
    
    // Detailed list
    let documents: [KnowledgeDocument]?
    let exams: [Exam]?
}

struct CourseCreateRequest: Codable {
    let title: String
    let color: String
    let icon: String?
}

struct Exam: Codable, Identifiable, Equatable {
    let id: String
    let courseId: String
    let title: String
    let createdAt: String
    let questions: [Question]?
}

struct Question: Codable, Identifiable, Equatable {
    let id: String
    let examId: String
    let type: String // MULTIPLE_CHOICE, FILL_IN, ESSAY
    let text: String
    let order: Int
    let data: AnyCodable // JSON Data
}
