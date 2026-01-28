//
//  DataDocumentRow.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI

struct DataDocumentRow: View {
    let document: KnowledgeDocument
    let onEdit: () -> Void
    let onDelete: () -> Void
    
    var formattedDate: String {
        let iso = document.createdAt
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: iso) {
            return date.formatted(date: .numeric, time: .omitted)
        }
        return iso.prefix(10).description
    }
    
    var iconName: String {
        if document.mimeType?.contains("audio") == true { return "waveform" }
        if document.mimeType?.contains("pdf") == true { return "doc.text.fill" }
        if document.type == "note" { return "note.text" }
        return "doc.text"
    }

    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.1))
                    .frame(width: 48, height: 48)
                Image(systemName: iconName)
                    .font(.title3)
                    .foregroundColor(.white.opacity(0.8))
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(document.title)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    Text(formattedDate)
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.5))
                    
                    if !document.tags.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 4) {
                                ForEach(document.tags, id: \.self) { tag in
                                    Text(tag)
                                        .font(.caption2)
                                        .foregroundColor(.white.opacity(0.9))
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color(red: 0.3, green: 0.4, blue: 0.8).opacity(0.5))
                                        .cornerRadius(4)
                                }
                            }
                        }
                    }
                }
            }
            
            Spacer()
            
            // Menu Button
            Menu {
                Button(action: onEdit) {
                    Label("編集", systemImage: "pencil")
                }
                
                Button(role: .destructive, action: onDelete) {
                    Label("削除", systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis")
                .font(.title3)
                .foregroundColor(.white.opacity(0.6))
                .frame(width: 30, height: 30)
                .contentShape(Rectangle())
            }
            .highPriorityGesture(TapGesture()) // Listのタップと競合しないように
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 16)
        .background(Color(red: 0.1, green: 0.1, blue: 0.1))
        .cornerRadius(12)
    }
}
