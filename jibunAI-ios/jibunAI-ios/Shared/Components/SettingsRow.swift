//
//  SettingsRow.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI

struct SettingsRow<Content: View>: View {
    let icon: String
    let title: String
    let hasChevron: Bool
    let rightContent: (() -> Content)?
    let action: (() -> Void)? // タップ時のアクション

    init(
        icon: String, title: String, hasChevron: Bool,
        action: (() -> Void)? = nil,
        @ViewBuilder rightContent: @escaping () -> Content
    ) {
        self.icon = icon
        self.title = title
        self.hasChevron = hasChevron
        self.action = action
        self.rightContent = rightContent
    }

    init(icon: String, title: String, hasChevron: Bool, action: (() -> Void)? = nil) where Content == EmptyView {
        self.icon = icon
        self.title = title
        self.hasChevron = hasChevron
        self.action = action
        self.rightContent = nil
    }

    var body: some View {
        Button {
            action?() // アクション実行
        } label: {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(.white.opacity(0.6))
                    .frame(width: 30)
                
                Text(title)
                    .font(.body)
                    .foregroundColor(.white)
                
                Spacer()
                
                if let rightContent = rightContent {
                    rightContent()
                }
                
                if hasChevron {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.4))
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .disabled(action == nil) // アクションがない場合はボタン無効化（見た目はそのまま）
    }
}
