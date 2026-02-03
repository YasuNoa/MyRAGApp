//
//  ViewModifiers.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/02/03.
//

import SwiftUI

struct TextLimiter: ViewModifier {
    @Binding var text: String
    let limit: Int
    
    func body(content: Content) -> some View {
        content
            .onChange(of: text) { newValue in
                if newValue.count > limit {
                    text = String(newValue.prefix(limit))
                }
            }
    }
}

extension View {
    func limitText(_ text: Binding<String>, limit: Int) -> some View {
        self.modifier(TextLimiter(text: text, limit: limit))
    }
}
