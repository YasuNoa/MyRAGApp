//
//  CourseDetailView.swift
//  jibunAI-ios
//
//  Created by User on 2026/01/27.
//

import SwiftUI

struct CourseDetailView: View {
    @State var course: Course // Make State to support update
    @EnvironmentObject var appState: AppStateManager
    @State private var selectedTab = 0 // 0: Documents, 1: Exams
    @State private var isImporting = false
    @State private var isLoading = false
    
    private let apiService = APIService.shared
    
    var body: some View {
        ZStack {
            Color(red: 0.05, green: 0.05, blue: 0.05)
                .ignoresSafeArea()
            
            VStack {
                // Header
                // (Navigation Title handles title)
                
                // Segments
                Picker("Tabs", selection: $selectedTab) {
                    Text("教材・データ").tag(0)
                    Text("試験・問題集").tag(1)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                
                if isLoading {
                    Spacer()
                    ProgressView().tint(.white)
                    Spacer()
                } else if selectedTab == 0 {
                    // Documents List
                     if let docs = course.documents, !docs.isEmpty {
                         DocumentList(documents: docs)
                     } else {
                         EmptyStateView(title: "教材がありません", icon: "doc.text")
                     }
                } else {
                    // Exams List
                    if let exams = course.exams, !exams.isEmpty {
                        ExamList(exams: exams)
                    } else {
                        EmptyStateView(title: "試験が作成されていません", icon: "pencil")
                    }
                }
            }
        }
        .navigationTitle(course.title)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if selectedTab == 0 {
                    Button {
                        isImporting = true
                    } label: {
                        Image(systemName: "square.and.arrow.down")
                    }
                } else {
                    Button {
                        // Create Exam Action
                    } label: {
                         Image(systemName: "plus")
                    }
                }
            }
        }
        .fileImporter(
            isPresented: $isImporting,
            allowedContentTypes: [.data], // PDF, Images, etc.
            allowsMultipleSelection: false
        ) { result in
             // Handle Import for this course
             // Logic similar to Pages.swift but passing courseId to APIService importFile?
             // Need to update importFile in APIService to accept courseId?
             // We updated backend `knowledge_service.py` to accept `courseId` in metadata.
             // APIService.importFile takes metadata. We need to pass courseId in tags or separate field.
             // APIService.importFile currently takes `tags`. Metadata dict construct:
             /*
                let metadata: [String: Any] = [
                    "userId": userId,
                    "userPlan": userPlan,
                    "tags": tags,
                    "mimeType": fileURL.mimeType()
                ]
             */
             // We need to inject `courseId` here.
             // Quick fix: Assuming we can modify APIService later or assume tags hack?
             // No, better to fix APIService importFile signature.
        }
        .task {
            // Fetch validation / updates
            await refreshCourseDetail()
        }
    }
    
    func refreshCourseDetail() async {
        isLoading = true
        do {
            let detail = try await apiService.fetchCourseDetail(courseId: course.id)
            self.course = detail
        } catch {
            print("Error fetching detail: \(error)")
        }
        isLoading = false
    }
}

// Components
struct DocumentList: View {
    let documents: [KnowledgeDocument]
    var body: some View {
        List {
            ForEach(documents) { doc in
                HStack {
                    Image(systemName: docIcon(doc.mimeType))
                        .foregroundColor(.blue)
                    VStack(alignment: .leading) {
                        Text(doc.title).font(.body).foregroundColor(.white)
                        Text(doc.createdAt).font(.caption).foregroundColor(.gray)
                    }
                }
                .listRowBackground(Color(red: 0.1, green: 0.1, blue: 0.1))
            }
        }
        .listStyle(.plain)
    }
    
    func docIcon(_ mime: String?) -> String {
        guard let mime = mime else { return "doc" }
        if mime.contains("pdf") { return "doc.text.fill" }
        if mime.contains("image") { return "photo" }
        return "doc"
    }
}

struct ExamList: View {
    let exams: [Exam]
    
    var body: some View {
        List {
            ForEach(exams) { exam in
                HStack {
                    Image(systemName: "pencil.circle.fill")
                        .foregroundColor(.green)
                    VStack(alignment: .leading) {
                        Text(exam.title).font(.body).foregroundColor(.white)
                        Text(exam.createdAt).font(.caption).foregroundColor(.gray)
                    }
                }
                .listRowBackground(Color(red: 0.1, green: 0.1, blue: 0.1))
            }
        }
        .listStyle(.plain)
    }
}

struct EmptyStateView: View {
    let title: String
    let icon: String
    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: icon)
                .font(.system(size: 50))
                .foregroundColor(.gray)
            Text(title)
                .foregroundColor(.gray)
            Spacer()
        }
    }
}
