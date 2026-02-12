import SwiftUI

/// アプリ起動時に致命的な設定エラー（Info.plistの不備など）があった場合に表示する画面
struct CriticalErrorView: View {
    let errors: [String]
    
    var body: some View {
        ZStack {
            Color(red: 0.1, green: 0, blue: 0).ignoresSafeArea() // Dark Red Background
            
            VStack(spacing: 24) {
                Image(systemName: "xmark.octagon.fill")
                    .font(.system(size: 64))
                    .foregroundColor(.red)
                
                Text("設定エラー")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Text("アプリの起動に必要な設定が見つかりません。\n開発者に連絡するか、ビルド設定（Info.plist）を確認してください。")
                    .multilineTextAlignment(.center)
                    .foregroundColor(.white.opacity(0.8))
                    .padding(.horizontal)
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(errors, id: \.self) { error in
                            HStack(alignment: .top) {
                                Image(systemName: "exclamationmark.circle")
                                    .foregroundColor(.orange)
                                Text(error)
                                    .font(.system(.body, design: .monospaced))
                                    .foregroundColor(.white)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .padding()
                }
                .frame(maxHeight: 200)
                .background(Color.black.opacity(0.3))
                .cornerRadius(12)
                .padding(.horizontal)
                
                Button(action: {
                    // クリップボードにコピー
                    UIPasteboard.general.string = errors.joined(separator: "\n")
                }) {
                    Label("エラー内容をコピー", systemImage: "doc.on.doc")
                        .foregroundColor(.white)
                        .padding()
                        .background(Color.white.opacity(0.2))
                        .cornerRadius(8)
                }
            }
            .padding()
        }
    }
}

#Preview {
    CriticalErrorView(errors: [
        "APIBaseURL not set in Info.plist",
        "AuthBaseURL not set in Info.plist",
        "LineChannelID not set in Info.plist"
    ])
}
