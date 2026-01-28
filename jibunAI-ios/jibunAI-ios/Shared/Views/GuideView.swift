//
//  GuideView.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI

struct GuideView: View {
    var body: some View {
        ZStack {
            Color(red: 0.05, green: 0.05, blue: 0.05)
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("使い方ガイド")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.top, 20)

                    GuideSection(
                        number: 1,
                        title: "授業ノート・文字起こし",
                        description: "授業や会議の音声をアップロードして、自動で文字起こしと要約ができます。サイドバーの「授業ノート」メニューから行えます。"
                    )

                    GuideSection(
                        number: 2,
                        title: "知識を登録する",
                        description: "PDFやテキストデータを登録できます。サイドバーの「知識登録」メニューから行えます。"
                    )
                }
                .padding(.horizontal, 20)
            }
        }
    }
}

struct GuideSection: View {
    let number: Int
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Text("\(number)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(Color(red: 0.5, green: 0.6, blue: 1.0))
                .frame(width: 40, height: 40)
                .background(Color.white.opacity(0.1))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.white)

                Text(description)
                    .font(.body)
                    .foregroundColor(.white.opacity(0.7))
                    .lineSpacing(4)
            }
        }
        .padding()
        .background(Color(red: 0.1, green: 0.1, blue: 0.1))
        .cornerRadius(12)
    }
}
