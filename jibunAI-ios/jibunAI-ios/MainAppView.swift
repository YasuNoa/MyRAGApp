//
//  MainAppView.swift
//  jibunAI-ios
//
//  Created by AI Assistant on 2025/12/19.
//
//  Webアプリ相当のメイン画面（サイドバー＋各ページ）
//  - サイドバーでページ選択
//  - 中央に各機能画面を表示
//  - Webアプリと同じダークテーマデザイン
//

import SwiftUI
import AppTrackingTransparency

// メイン機能画面
struct MainAppView: View {
    @EnvironmentObject var appState: AppStateManager

    // サイドバーで選択中のページを管理する
    @State private var selectedPage: Page = .chat
    @State private var isSidebarCollapsed = true
    
    // 課金画面の表示制御
    @State private var showPaywall = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // メインコンテンツエリア (常に背面に表示)
            NavigationStack {
                selectedPage.view
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .navigationTitle(selectedPage.title)
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Button {
                                withAnimation {
                                    isSidebarCollapsed.toggle()
                                }
                            } label: {
                                Image(systemName: "line.3.horizontal")
                                    .foregroundColor(.white)
                                    .opacity(isSidebarCollapsed ? 1 : 0) // 開いている時は見えないようにする
                            }
                            .disabled(!isSidebarCollapsed) // 開いている時は押せない
                        }
                    }
                    .toolbarBackground(Color(red: 0.08, green: 0.08, blue: 0.08), for: .navigationBar)
                    .toolbarBackground(.visible, for: .navigationBar)
            }
            .zIndex(0)

            // サイドバーオーバーレイ
            if !isSidebarCollapsed {
                // ディマー背景（タップで閉じる）
                Color.black.opacity(0.5)
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation {
                            isSidebarCollapsed = true
                        }
                    }
                    .zIndex(1)
                
                // サイドバー
                HStack {
                    SidebarView(
                        selectedPage: $selectedPage,
                        isSidebarCollapsed: $isSidebarCollapsed,
                        appState: appState,
                        showPaywall: $showPaywall
                    )
                    .frame(width: 280)
                    .frame(maxHeight: .infinity) // 縦一杯に広げる
                    .background(Color(red: 0.08, green: 0.08, blue: 0.08)) // 背景色を確保
                    .ignoresSafeArea() // 安全領域を無視して画面端まで表示
                    
                    Spacer()
                }
                .transition(.move(edge: .leading))
                .zIndex(2)
            }
        }
        .preferredColorScheme(.dark)
        // 課金画面のシート表示
        .sheet(isPresented: $showPaywall) {
            SubscriptionView()
        }
    .onAppear {
        // ATTリクエスト (少し遅延させる)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            ATTrackingManager.requestTrackingAuthorization { status in
                switch status {
                case .authorized:
                    print("ATT: Authorized")
                case .denied:
                    print("ATT: Denied")
                case .notDetermined:
                    print("ATT: Not Determined")
                case .restricted:
                    print("ATT: Restricted")
                @unknown default:
                    print("ATT: Unknown")
                }
            }
        }
    }
    }
}

// MARK: - Sidebar View

struct SidebarView: View {
    @Binding var selectedPage: Page
    @Binding var isSidebarCollapsed: Bool
    let appState: AppStateManager
    @Binding var showPaywall: Bool

    var body: some View {
        ZStack {
            Color(red: 0.08, green: 0.08, blue: 0.08)

            VStack(alignment: .leading, spacing: 0) {
                // ロゴ・タイトル
                HStack {
                    Text("じぶんAI")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)

                    Spacer()

                    Button {
                        withAnimation {
                            isSidebarCollapsed = true
                        }
                    } label: {
                        Image(systemName: "sidebar.left")
                            .foregroundColor(.white.opacity(0.6))
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 20)

                Divider()
                    .background(Color.white.opacity(0.1))

                // ナビゲーションメニュー
                ScrollView {
                    VStack(spacing: 4) {
                        ForEach(Page.allCases, id: \.self) { page in
                            SidebarMenuItem(
                                page: page,
                                isSelected: selectedPage == page
                            ) {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    selectedPage = page
                                    isSidebarCollapsed = true // 選択したら閉じる
                                }
                            }
                        }
                    }
                    .padding(.vertical, 8)
                }

                Spacer()

                // 最近のチャット（将来実装）
                VStack(alignment: .leading, spacing: 8) {
                    Divider()
                        .background(Color.white.opacity(0.1))

                    Text("最近のチャット")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                        .padding(.horizontal, 20)
                        .padding(.top, 12)

                    // ダミーチャット履歴
                    VStack(spacing: 4) {
                        RecentChatItem(title: "?")
                        RecentChatItem(title: "今日のいテスト受けた")
                    }
                    .padding(.bottom, 12)

                    // アップグレードボタン (Freeプランのみ)
                    if appState.userPlan == "FREE" {
                        Button {
                            // RevenueCat Paywallを表示
                            showPaywall = true
                        } label: {
                            HStack {
                                Image(systemName: "crown.fill")
                                    .foregroundColor(.yellow)
                                Text("プレミアムにアップグレード")
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                                Spacer()
                            }
                            .padding()
                            .background(
                                LinearGradient(
                                    colors: [
                                        Color(red: 0.3, green: 0.1, blue: 0.5),
                                        Color(red: 0.5, green: 0.2, blue: 0.8)
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(12)
                            .padding(.horizontal, 16)
                        }
                    }
                }
            }
            .padding(.top, 50) // ノッチ回避
            .padding(.bottom, 30) // ホームバー回避
        }
    }
}

// MARK: - Sidebar Menu Item

struct SidebarMenuItem: View {
    let page: Page
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: page.icon)
                    .font(.body)
                    .frame(width: 20)
                    .foregroundColor(isSelected ? .white : .white.opacity(0.7))

                Text(page.title)
                    .font(.body)
                    .foregroundColor(isSelected ? .white : .white.opacity(0.7))

                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(
                isSelected
                    ? Color.white.opacity(0.1)
                    : Color.clear
            )
            .cornerRadius(8)
        }
        .padding(.horizontal, 12)
    }
}

// MARK: - Recent Chat Item

struct RecentChatItem: View {
    let title: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "message")
                .font(.caption)
                .foregroundColor(.white.opacity(0.5))

            Text(title)
                .font(.caption)
                .foregroundColor(.white.opacity(0.7))
                .lineLimit(1)

            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 6)
    }
}

// MARK: - Top Bar View


