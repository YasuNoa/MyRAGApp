//
//  ConcurrencyUtils.swift
//  jibunAI-ios
//
//  Created by Automation.
//

import Foundation

/// A wrapper to blindly treat a value as Sendable.
/// Use this ONLY when you are certain that the value is used in a thread-safe manner
/// (e.g. passed between actors but not accessed concurrently, or accessed on the same serial queue).
struct UncheckedSendable<T>: @unchecked Sendable {
    let value: T
    
    init(_ value: T) {
        self.value = value
    }
}
