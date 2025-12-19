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

// メイン機能画面
struct MainAppView: View {
    @EnvironmentObject var appState: AppStateManager
    
    // サイドバーで選択中のページを管理する
    @State private var selectedPage: Page = .chat
    @State private var isSidebarCollapsed = false
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            HStack(spacing: 0) {
                // サイドバー
                if !isSidebarCollapsed {
                    SidebarView(selectedPage: $selectedPage, appState: appState)
                        .frame(width: 260)
                        .transition(.move(edge: .leading))
                }
                
                // メインコンテンツエリア
                VStack(spacing: 0) {
                    // トップバー
                    TopBarView(
                        isSidebarCollapsed: $isSidebarCollapsed,
                        currentPage: selectedPage
                    )
                    
                    // ページコンテンツ
                    selectedPage.view
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}

// MARK: - Sidebar View

struct SidebarView: View {
    @Binding var selectedPage: Page
    let appState: AppStateManager
    
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
                        // 設定やメニューボタン
                    } label: {
                        Image(systemName: "chevron.left")
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
                }
            }
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

struct TopBarView: View {
    @Binding var isSidebarCollapsed: Bool
    let currentPage: Page
    
    var body: some View {
        HStack {
            if isSidebarCollapsed {
                Button {
                    withAnimation {
                        isSidebarCollapsed.toggle()
                    }
                } label: {
                    Image(systemName: "sidebar.left")
                        .foregroundColor(.white)
                }
                .padding(.leading, 16)
            }
            
            Text(currentPage.title)
                .font(.headline)
                .foregroundColor(.white)
            
            Spacer()
        }
        .padding(.vertical, 16)
        .background(Color(red: 0.08, green: 0.08, blue: 0.08))
    }
}

// ページ種別
enum Page: CaseIterable {
    case landing, chat, knowledge, data, note, guide, feedback, settings

    var title: String {
        switch self {
        case .landing: return "LP"
        case .chat: return "チャット"
        case .knowledge: return "知識ベース"
        case .data: return "学習データ"
        case .note: return "授業ノート"
        case .guide: return "使い方ガイド"
        case .feedback: return "フィードバック"
        case .settings: return "設定"
        }
    }
    var icon: String {
        switch self {
        case .landing: return "house"
        case .chat: return "bubble.left"
        case .knowledge: return "books.vertical"
        case .data: return "list.bullet.rectangle"
        case .note: return "mic"
        case .guide: return "questionmark.circle"
        case .feedback: return "envelope"
        case .settings: return "gear"
        }
    }
}

// 以下、各ページのダミービュー（全て日本語コメント付き）

struct LandingDummyView: View {
    var body: some View {
        VStack {
            Text("LP ダミー表示")
                .font(.largeTitle)
            Text("ここにランディングページ内容を配置予定")
        }
    }
}

struct ChatDummyView: View {
    var body: some View {
        VStack {
            Text("チャット画面ダミー")
                .font(.largeTitle)
            Text("チャット履歴・入力欄などをここに配置予定")
        }
    }
}

struct KnowledgeDummyView: View {
    var body: some View {
        VStack {
            Text("知識ベース ダミー")
                .font(.largeTitle)
            Text("知識追加・管理機能をここに配置予定")
        }
    }
}

struct DataDummyView: View {
    var body: some View {
        VStack {
            Text("学習データ ダミー")
                .font(.largeTitle)
            Text("学習済みデータ一覧などをここに配置予定")
        }
    }
}

struct NoteDummyView: View {
    var body: some View {
        VStack {
            Text("授業ノート ダミー")
                .font(.largeTitle)
            Text("音声メモ録音・要約などをここに配置予定")
        }
    }
}

struct GuideDummyView: View {
    var body: some View {
        VStack {
            Text("使い方ガイド ダミー")
                .font(.largeTitle)
            Text("ガイダンス文や説明コンテンツをここに配置予定")
        }
    }
}

struct FeedbackDummyView: View {
    var body: some View {
        VStack {
            Text("フィードバック ダミー")
                .font(.largeTitle)
            Text("意見投稿フォームなどをここに配置予定")
        }
    }
}

struct SettingsDummyView: View {
    var body: some View {
        VStack {
            Text("設定 ダミー")
                .font(.largeTitle)
            Text("アカウント・連携・通知設定などをここに配置予定")
        }
    }
}
