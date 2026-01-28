//
//  FilterChip.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .fontWeight(isSelected ? .bold : .regular)
                .foregroundColor(isSelected ? .white : .white.opacity(0.7))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isSelected ? Color(red: 0.3, green: 0.4, blue: 0.9) : Color.white.opacity(0.1))
                .cornerRadius(20) // Chip style
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
        }
    }
}
