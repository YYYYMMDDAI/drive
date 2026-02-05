// SplitEaseApp.swift
// SplitEase - 簡単画面分割・動画ながら見
// エントリーポイント

import SwiftUI

@main
struct SplitEaseApp: App {
    @StateObject private var iapManager = IAPManager()
    @StateObject private var presetViewModel = PresetViewModel()
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false

    let persistenceController = PersistenceController.shared

    var body: some Scene {
        WindowGroup {
            if hasCompletedOnboarding {
                DualView()
                    .environmentObject(iapManager)
                    .environmentObject(presetViewModel)
                    .environment(\.managedObjectContext, persistenceController.container.viewContext)
            } else {
                OnboardingView(hasCompleted: $hasCompletedOnboarding)
            }
        }
    }
}
