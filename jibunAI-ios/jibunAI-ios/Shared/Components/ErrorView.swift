import SwiftUI

struct ErrorView: View {
    var error: Error?
    var retryAction: (() -> Void)? = nil
    
    var body: some View {
        if let error = error {
            VStack(spacing: 16) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.largeTitle)
                    .foregroundColor(.yellow)
                
                Text("エラーが発生しました")
                    .font(.headline)
                    .foregroundColor(.white)
                
                Text(error.localizedDescription)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                
                if let retry = retryAction {
                    Button(action: retry) {
                        Text("再試行")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 10)
                            .background(Color.white.opacity(0.2))
                            .cornerRadius(8)
                    }
                }
            }
            .padding()
            .background(Color(red: 0.15, green: 0.15, blue: 0.15))
            .cornerRadius(16)
            .padding()
        }
    }
}

#Preview {
    ZStack {
        Color.black
        ErrorView(
            error: NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: "ネットワーク接続に失敗しました"]),
            retryAction: {}
        )
    }
}
