//
//  SettingsView.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var appState: AppStateManager
    @State private var showLogoutAlert = false
    @State private var showDeleteAccountAlert = false
    @State private var showPaywall = false

    var body: some View {
        ZStack {
            Color(red: 0.05, green: 0.05, blue: 0.05)
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    Text("設定")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.top, 20)

                    // プロフィールカード
                    VStack(spacing: 16) {
                        Circle()
                            .fill(Color.gray)
                            .frame(width: 80, height: 80)
                            .overlay(
                                Text(
                                    appState.currentUser?.displayName?.prefix(1).uppercased() ?? "U"
                                )
                                .font(.title)
                                .foregroundColor(.white)
                            )

                        Text(appState.currentUser?.displayName ?? "ユーザー")
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                        
                        // EmailはWeb版に合わせて非表示
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                    .background(Color(red: 0.1, green: 0.1, blue: 0.1))
                    .cornerRadius(12)
                    
                    // 現在のプラン
                    VStack(spacing: 0) {
                        SettingsRow(
                            icon: "creditcard",
                            title: "現在のプラン",
                            hasChevron: false,
                            rightContent: {
                                VStack(alignment: .trailing, spacing: 4) {
                                    Text("\(appState.userPlan) プラン")
                                        .font(.body)
                                        .fontWeight(.bold)
                                        .foregroundColor(.white)
                                    
                                    if let date = appState.expirationDate {
                                        Text("有効期限: \(date.formatted(date: .numeric, time: .omitted))")
                                            .font(.caption2)
                                            .foregroundColor(.gray)
                                    }
                                }
                            }
                        )
                        
                        // アップグレードボタン (Freeプランのみ)
                        if appState.userPlan == "FREE" {
                            Divider().background(Color.white.opacity(0.1))
                            SettingsRow(
                                icon: "arrow.up.circle.fill",
                                title: "プランをアップグレード",
                                hasChevron: true,
                                action: {
                                    showPaywall = true
                                }
                            )
                        }
                        
                        // サブスクリプション管理ボタン (FREE以外の場合)
                        if appState.userPlan != "FREE" {
                            Divider().background(Color.white.opacity(0.1))
                            HStack {
                                Spacer()
                                Button {
                                    // 管理画面を開く
                                    if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
                                        UIApplication.shared.open(url)
                                    }
                                } label: {
                                    Text("サブスクリプションの管理・解約")
                                        .font(.caption)
                                        .foregroundColor(Color.gray)
                                        .underline()
                                }
                                .padding(.vertical, 12)
                                .padding(.horizontal, 20)
                            }
                        }
                    }
                    .background(Color(red: 0.1, green: 0.1, blue: 0.1))
                    .cornerRadius(12)

                    // 設定項目
                    VStack(spacing: 0) {
                        SettingsRow(icon: "person", title: "プロフィール設定（名前変更）*開発中", hasChevron: true)
                        Divider().background(Color.white.opacity(0.1))
                        SettingsRow(
                            icon: "gearshape", title: "アカウント設定（メール・パスワード変更）*開発中", hasChevron: true)
                        Divider().background(Color.white.opacity(0.1))
                        SettingsRow(icon: "bag", title: "AIの設定（名前変更）*開発中", hasChevron: true)
                    }
                    .background(Color(red: 0.1, green: 0.1, blue: 0.1))
                    .cornerRadius(12)

                    // 連携設定
                    VStack(spacing: 0) {
                        SettingsRow(
                            icon: "link", title: "Slack連携（開発中）", hasChevron: false,
                            rightContent: {
                                Button("連携する") {
                                    // Slack連携
                                }
                                .font(.caption)
                                .foregroundColor(Color(red: 0.5, green: 0.6, blue: 1.0))
                            })
                        Divider().background(Color.white.opacity(0.1))
                        SettingsRow(
                            icon: "message", title: "LINE連携", hasChevron: false,
                            rightContent: {
                                Text("連携済み")
                                    .font(.caption)
                                    .foregroundColor(Color(red: 0.5, green: 0.6, blue: 1.0))
                            })
                        Divider().background(Color.white.opacity(0.1))
                        SettingsRow(
                            icon: "globe", title: "Google連携", hasChevron: false,
                            rightContent: {
                                Text("連携済み")
                                    .font(.caption)
                                    .foregroundColor(Color(red: 0.5, green: 0.6, blue: 1.0))
                            })
                    }
                    .background(Color(red: 0.1, green: 0.1, blue: 0.1))
                    .cornerRadius(12)
                    
                    // 利用規約・プライバシーポリシー
                    VStack(spacing: 0) {
                        Link(destination: URL(string: "https://jibun-ai.com/terms")!) {
                            HStack {
                                Image(systemName: "doc.text")
                                    .foregroundColor(.white.opacity(0.6))
                                    .frame(width: 30)
                                Text("利用規約")
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.4))
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                        }
                        
                        Divider().background(Color.white.opacity(0.1))
                        
                        Link(destination: URL(string: "https://jibun-ai.com/privacy")!) {
                            HStack {
                                Image(systemName: "hand.raised")
                                    .foregroundColor(.white.opacity(0.6))
                                    .frame(width: 30)
                                Text("プライバシーポリシー")
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.4))
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                        }
                    }
                    .background(Color(red: 0.1, green: 0.1, blue: 0.1))
                    .cornerRadius(12)

                    // ログアウトボタン
                    Button {
                        showLogoutAlert = true
                    } label: {
                        Text("ログアウト")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.red.opacity(0.8))
                            .cornerRadius(12)
                    }
                    .alert("ログアウト", isPresented: $showLogoutAlert) {
                        Button("キャンセル", role: .cancel) { }
                        Button("ログアウト", role: .destructive) {
                            appState.signOut()
                        }
                    } message: {
                        Text("ログアウトしてもよろしいですか？")
                    }
                    .padding(.top, 16)
                    
                    // アカウント削除ボタン
                    Button {
                        showDeleteAccountAlert = true
                    } label: {
                        Text("アカウント削除")
                            .font(.headline)
                            .foregroundColor(.red.opacity(0.8))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.white.opacity(0.05))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.red.opacity(0.3), lineWidth: 1)
                            )
                    }
                    .alert("アカウント削除", isPresented: $showDeleteAccountAlert) {
                        Button("キャンセル", role: .cancel) { }
                        Button("完全に削除する", role: .destructive) {
                            Task {
                                do {
                                    try await appState.deleteAccount()
                                } catch {
                                    // エラーハンドリング（必要に応じてアラート表示など）
                                    print("Delete account failed: \(error)")
                                }
                            }
                        }
                    } message: {
                        Text("アカウントを削除すると、全てのデータ（保存した知識、チャット履歴、設定）が永久に削除され、復元することはできません。\n\n本当に削除しますか？")
                    }
                    .padding(.top, 8)
                    
                    // コピーライト
                    Text("© 2025 じぶんAI")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.3))
                        .padding(.top, 8)
                        .padding(.bottom, 32)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
        }
        .sheet(isPresented: $showPaywall) {
            PaywallView(onPurchaseCompleted: {
                showPaywall = false
            })
        }
    }
}
