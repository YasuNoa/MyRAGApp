//
//  View+Paywall.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI

extension View {
    @ViewBuilder
    func adaptivePaywallSheet(isPresented: Binding<Bool>, onPurchaseCompleted: @escaping () -> Void) -> some View {
        if UIDevice.current.userInterfaceIdiom == .pad {
            self.fullScreenCover(isPresented: isPresented) {
                PaywallView(onPurchaseCompleted: onPurchaseCompleted)
            }
        } else {
            self.sheet(isPresented: isPresented) {
                PaywallView(onPurchaseCompleted: onPurchaseCompleted)
            }
        }
    }
}
