//
//  CourseViewModel.swift
//  jibunAI-ios
//
//  Created by User on 2026/01/27.
//

import Foundation
import Combine
import SwiftUI

@MainActor
class CourseViewModel: ObservableObject {
    @Published var courses: [Course] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiService = APIService.shared
    
    /// コース一覧を取得
    func fetchCourses() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let fetched = try await apiService.fetchCourses()
            self.courses = fetched
        } catch {
            print("❌ Failed to fetch courses: \(error.localizedDescription)")
            self.errorMessage = "コースの取得に失敗しました: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    /// 新しいコースを作成
    func createCourse(title: String, color: String, icon: String?) async -> Bool {
        isLoading = true
        errorMessage = nil
        
        do {
            let newCourse = try await apiService.createCourse(title: title, color: color, icon: icon)
            self.courses.insert(newCourse, at: 0) // 先頭に追加
            isLoading = false
            return true
        } catch {
            print("❌ Failed to create course: \(error.localizedDescription)")
            self.errorMessage = "コースの作成に失敗しました: \(error.localizedDescription)"
            isLoading = false
            return false
        }
    }
    
    /// コースを削除
    func deleteCourse(courseId: String) async {
        guard let index = courses.firstIndex(where: { $0.id == courseId }) else { return }
        
        // Optimistic update
        let removed = courses.remove(at: index)
        
        do {
             let success = try await apiService.deleteCourse(courseId: courseId)
             if !success {
                 // Revert if failed (though silent failure might be ok for delete)
                 courses.insert(removed, at: index)
                 errorMessage = "削除に失敗しました"
             }
        } catch {
            courses.insert(removed, at: index)
            errorMessage = "削除エラー: \(error.localizedDescription)"
        }
    }
}
