//
//  CourseListView.swift
//  jibunAI-ios
//
//  Created by Automation on 2026/01/28.
//

import SwiftUI

struct CourseListView: View {
    @StateObject private var viewModel = CourseViewModel()
    @State private var showingAddCourseFor = false
    @State private var newCourseTitle = ""
    @State private var selectedColor = "blue"
    
    let colors = ["blue", "red", "green", "yellow", "purple", "gray"]
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(red: 0.05, green: 0.05, blue: 0.05)
                    .ignoresSafeArea()
                
                if viewModel.isLoading && viewModel.courses.isEmpty {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(1.5)
                } else if viewModel.courses.isEmpty {
                    // Empty State
                    VStack(spacing: 20) {
                        Image(systemName: "folder.badge.plus")
                        .font(.system(size: 60))
                        .foregroundColor(.gray)
                        Text("コースがまだありません")
                            .font(.title3)
                            .foregroundColor(.white)
                        Text("右上の「+」ボタンから\n新しい教科・コースを作成してください")
                            .font(.caption)
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                    }
                } else {
                    // List
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 16)], spacing: 16) {
                            ForEach(viewModel.courses) { course in
                                NavigationLink(destination: CourseDetailView(course: course)) {
                                    CourseCard(course: course)
                                }
                            }
                            
                            // Recently Deleted Folder
                            NavigationLink(destination: TrashView()) {
                                TrashCard()
                            }
                        }
                        .padding(16)
                    }
                }
            }
            .navigationTitle("学習済みデータ")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingAddCourseFor = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .foregroundColor(.white)
                    }
                }
            }
            .sheet(isPresented: $showingAddCourseFor) {
                AddCourseView(
                    isPresented: $showingAddCourseFor,
                    title: $newCourseTitle,
                    selectedColor: $selectedColor,
                    colors: colors,
                    onSave: {
                        Task {
                             let success = await viewModel.createCourse(title: newCourseTitle, color: selectedColor, icon: nil)
                            if success {
                                showingAddCourseFor = false
                                newCourseTitle = ""
                                selectedColor = "blue"
                            }
                        }
                    }
                )
            }
        }
        .task {
            await viewModel.fetchCourses()
        }
    }
}

// MARK: - Components

struct CourseCard: View {
    let course: Course
    
    var themeColor: Color {
        switch course.color {
        case "blue": return .blue
        case "red": return .red
        case "green": return .green
        case "yellow": return .yellow
        case "purple": return .purple
        case "gray": return .gray
        default: return .blue
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "folder.fill")
                    .font(.title)
                    .foregroundColor(themeColor)
                Spacer()
                if let icon = course.icon {
                    Text(icon)
                }
            }
            
            Text(course.title)
                .font(.headline)
                .foregroundColor(.white)
                .lineLimit(2)
            
            Spacer()
            
            HStack {
                Label("\(course.documentCount ?? 0)", systemImage: "doc")
                Spacer()
                Label("\(course.examCount ?? 0)", systemImage: "pencil")
            }
            .font(.caption)
            .foregroundColor(.gray)
        }
        .padding(16)
        .frame(height: 140)
        .background(Color(red: 0.1, green: 0.1, blue: 0.1))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(themeColor.opacity(0.3), lineWidth: 1)
        )
    }
}

struct TrashCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "trash.fill")
                    .font(.title)
                    .foregroundColor(.gray)
                Spacer()
            }
            
            Text("最近削除した項目")
                .font(.headline)
                .foregroundColor(.white)
                .lineLimit(2)
            
            Spacer()
            
            Text("30日後に完全削除")
                .font(.caption2)
                .foregroundColor(.gray)
        }
        .padding(16)
        .frame(height: 140)
        .background(Color(red: 0.1, green: 0.1, blue: 0.1))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.gray.opacity(0.3), lineWidth: 1)
        )
    }
}

struct AddCourseView: View {
    @Binding var isPresented: Bool
    @Binding var title: String
    @Binding var selectedColor: String
    let colors: [String]
    let onSave: () -> Void
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("コース情報")) {
                    TextField("コース名 (例: 数学 I・A)", text: $title)
                }
                
                Section(header: Text("テーマカラー")) {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(colors, id: \.self) { color in
                                Circle()
                                    .fill(colorFromString(color))
                                    .frame(width: 30, height: 30)
                                    .overlay(
                                        Circle()
                                            .stroke(Color.primary, lineWidth: selectedColor == color ? 2 : 0)
                                    )
                                    .onTapGesture {
                                        selectedColor = color
                                    }
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }
            }
            .navigationTitle("新規コース作成")
            .navigationBarItems(
                leading: Button("キャンセル") { isPresented = false },
                trailing: Button("作成") { onSave() }.disabled(title.isEmpty)
            )
        }
    }
    
    func colorFromString(_ name: String) -> Color {
        switch name {
        case "blue": return .blue
        case "red": return .red
        case "green": return .green
        case "yellow": return .yellow
        case "purple": return .purple
        case "gray": return .gray
        default: return .blue
        }
    }
}
