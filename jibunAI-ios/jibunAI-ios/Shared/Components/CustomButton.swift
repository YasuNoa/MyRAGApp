import SwiftUI

struct CustomButton: View {
    var title: String
    var icon: String? = nil
    var action: () -> Void
    var isLoading: Bool = false
    var isDisabled: Bool = false
    var style: ButtonStyle = .primary
    
    enum ButtonStyle {
        case primary
        case secondary
        case danger
        
        var backgroundColor: Color {
            switch self {
            case .primary: return Color(red: 0.5, green: 0.6, blue: 1.0)
            case .secondary: return Color.white.opacity(0.1)
            case .danger: return Color.red.opacity(0.8)
            }
        }
        
        var textColor: Color {
            switch self {
            case .primary: return .white
            case .secondary: return .white
            case .danger: return .white
            }
        }
    }
    
    var body: some View {
        Button(action: action) {
            HStack {
                if isLoading {
                    ProgressView().tint(.white)
                } else {
                    if let icon = icon {
                        Image(systemName: icon)
                    }
                    Text(title)
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(isDisabled ? Color.gray : style.backgroundColor)
            .foregroundColor(style.textColor)
            .cornerRadius(12)
            .opacity(isDisabled ? 0.6 : 1.0)
        }
        .disabled(isDisabled || isLoading)
        .scaleEffect(isLoading ? 0.98 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isLoading)
    }
}

#Preview {
    VStack {
        CustomButton(title: "Primary Button", action: {})
        CustomButton(title: "Secondary Button", style: .secondary, action: {})
        CustomButton(title: "Loading", isLoading: true, action: {})
        CustomButton(title: "Disabled", isDisabled: true, action: {})
    }
    .padding()
    .background(Color.black)
}
