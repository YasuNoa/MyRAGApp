import SwiftUI

struct LoadingView: View {
    var message: String = "Loading..."
    var progress: Double? = nil // Optional progress (0.0 - 1.0)
    
    var body: some View {
        ZStack {
            Color.black.opacity(0.8)
                .ignoresSafeArea()
            
            VStack(spacing: 20) {
                if let progress = progress {
                    ProgressView(value: progress, total: 1.0)
                        .progressViewStyle(LinearProgressViewStyle(tint: .white))
                        .frame(width: 200)
                        .scaleEffect(1.2)
                    
                    Text("\(Int(progress * 100))%")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                } else {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(1.5)
                }
                
                Text(message)
                    .font(.callout)
                    .foregroundColor(.white.opacity(0.8))
            }
        }
        .transition(.opacity)
        .zIndex(100)
    }
}

#Preview {
    ZStack {
        Color.blue
        LoadingView(message: "保存中...", progress: 0.45)
    }
}
