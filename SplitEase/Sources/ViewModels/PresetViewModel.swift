// PresetViewModel.swift
// プリセット管理ViewModel

import SwiftUI
import CoreData

class PresetViewModel: ObservableObject {
    @Published var presets: [Preset] = Preset.defaults
    @Published var customPresets: [Preset] = []
    @Published var showPremiumPrompt = false

    // 無料版のプリセット上限
    static let freeLimit = 3

    // MARK: - 全プリセット（デフォルト + カスタム）
    var allPresets: [Preset] {
        presets + customPresets
    }

    // MARK: - カスタムプリセット読み込み
    func loadCustomPresets(context: NSManagedObjectContext) {
        customPresets = PersistenceController.shared.fetchCustomPresets(context: context)
    }

    // MARK: - プリセット追加
    func addPreset(
        _ preset: Preset,
        isPremium: Bool,
        context: NSManagedObjectContext
    ) -> Bool {
        // 無料版で上限チェック
        if !isPremium && customPresets.count >= PresetViewModel.freeLimit {
            showPremiumPrompt = true
            return false
        }

        customPresets.append(preset)
        PersistenceController.shared.saveCustomPreset(preset, context: context)
        return true
    }

    // MARK: - プリセット削除（カスタムのみ）
    func deletePreset(id: UUID, context: NSManagedObjectContext) {
        customPresets.removeAll { $0.id == id }
        PersistenceController.shared.deletePreset(id: id, context: context)
    }

    // MARK: - カスタムプリセット追加可能か
    func canAddPreset(isPremium: Bool) -> Bool {
        isPremium || customPresets.count < PresetViewModel.freeLimit
    }
}
