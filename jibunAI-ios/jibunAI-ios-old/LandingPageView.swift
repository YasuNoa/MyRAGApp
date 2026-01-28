//
//  LandingPageView.swift
//  jibunAI-ios
//
//  Created by AI Assistant on 2025/12/19.
//
//  LP（ランディングページ）画面
//  - Webアプリと同じダークテーマデザイン
//  - タイトル、キャッチコピー、サブ説明文、ボタンを配置
//  - 「無料で始める」ボタン押下でLoginViewに遷移
//

import SwiftUI

struct LandingPageView: View {
    // ログイン画面の表示制御
    @Binding var showLogin: Bool
    
    var body: some View {
        ZStack {
            // ダークな背景
            Color.black
                .ignoresSafeArea()
            
            VStack(spacing: 40) {
                Spacer()
                
                // メインコンテンツ
                VStack(spacing: 24) {
                    // ロゴ
                    Text("じぶんAI")
                        .font(.system(size: 52, weight: .bold))
                        .foregroundColor(.white)
                    
                    // メインキャッチコピー
                    VStack(spacing: 8) {
                        Text("大丈夫、")
                            .font(.system(size: 32, weight: .semibold))
                            .foregroundColor(.white)
                        
                        HStack(spacing: 0) {
                            Text("授業中")
                                .font(.system(size: 32, weight: .semibold))
                                .foregroundColor(.white)
                            Text("寝てても")
                                .font(.system(size: 32, weight: .semibold))
                                .foregroundColor(Color(red: 0.5, green: 0.6, blue: 1.0))
                            Text("。")
                                .font(.system(size: 32, weight: .semibold))
                                .foregroundColor(.white)
                        }
                    }
                    
                    // サブコピー
                    Text("あなたのためのAIアシスタント")
                        .font(.title3)
                        .foregroundColor(.white.opacity(0.7))
                        .padding(.top, 8)
                    
                    // 説明文
                    Text("授業ノート、資料、録音データ。あらゆる情報を\n「じぶんAI」に預ければ、\n授業やミーティングの内容を、全て再現できます。")
                        .font(.body)
                        .foregroundColor(.white.opacity(0.6))
                        .multilineTextAlignment(.center)
                        .lineSpacing(4)
                        .padding(.horizontal, 32)
                        .padding(.top, 16)
                }
                
                Spacer()
                
                // CTAボタン
                VStack(spacing: 16) {
                    Button {
                        showLogin = true
                    } label: {
                        Text("無料で始める")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 18)
                            .background(
                                LinearGradient(
                                    colors: [
                                        Color(red: 0.5, green: 0.6, blue: 1.0),
                                        Color(red: 0.4, green: 0.5, blue: 0.9)
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .foregroundColor(.white)
                            .cornerRadius(12)
                    }
                    
                    Button {
                        showLogin = true
                    } label: {
                        Text("ログイン")
                            .font(.body)
                            .fontWeight(.medium)
                            .foregroundColor(Color(red: 0.5, green: 0.6, blue: 1.0))
                    }
                }
                .padding(.horizontal, 40)
                .padding(.bottom, 48)
            }
        }
    }
}
