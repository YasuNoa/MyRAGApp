//
//  MessageBubble.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI

struct MessageBubble: View {
    let message: ChatMessage

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            if message.isUser {
                Spacer()
            } else {
                // AIアイコン
                Circle()
                    .fill(Color(red: 0.2, green: 0.8, blue: 0.6))
                    .frame(width: 32, height: 32)
                    .overlay(Text("AI").font(.caption).bold().foregroundColor(.black))
            }

            VStack(alignment: message.isUser ? .trailing : .leading, spacing: 4) {
                if message.isThinking {
                    HStack(spacing: 4) {
                        Circle().fill(Color.white).frame(width: 6, height: 6)
                        Circle().fill(Color.white).frame(width: 6, height: 6)
                        Circle().fill(Color.white).frame(width: 6, height: 6)
                    }
                    .padding(12)
                    .background(Color(red: 0.15, green: 0.15, blue: 0.15))
                    .cornerRadius(16)
                } else {
                    Text(message.text)
                        .foregroundColor(.white)
                        .padding(12)
                        .background(
                            message.isUser
                                ? Color(red: 0.3, green: 0.4, blue: 0.9)  // ユーザー色
                                : Color(red: 0.15, green: 0.15, blue: 0.15)  // AI色
                        )
                        .cornerRadius(16)
                }
            }

            if !message.isUser {
                Spacer()
            }
        }
    }
}
