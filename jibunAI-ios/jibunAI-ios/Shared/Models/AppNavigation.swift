//
//  AppNavigation.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import Foundation
import SwiftUI

// MARK: - Page Enum

enum Page: CaseIterable, Hashable {
    case chat
    case knowledge
    case note
    case data
    case guide
    case feedback
    case settings

    var title: String {
        switch self {
        case .chat: return "チャット"
        case .knowledge: return "知識登録"
        case .note: return "授業ノート"
        case .data: return "コース一覧"
        case .guide: return "使い方"
        case .feedback: return "フィードバック"
        case .settings: return "設定"
        }
    }

    var icon: String {
        switch self {
        case .chat: return "message"
        case .knowledge: return "plus.circle"
        case .note: return "book"
        case .data: return "folder"
        case .guide: return "questionmark.circle"
        case .feedback: return "envelope.open"
        case .settings: return "gearshape"
        }
    }

    @ViewBuilder
    var view: some View {
        switch self {
        case .chat: ChatView()
        case .knowledge: KnowledgeView()
        case .note: VoiceNoteView()
        case .data: CourseListView()
        case .guide: GuideView()
        case .feedback: FeedbackView()
        case .settings: SettingsView()
        }
    }
}
