// PresetViewModelTests.swift
// プリセットViewModel のユニットテスト

import XCTest
@testable import SplitEase

final class PresetViewModelTests: XCTestCase {

    var viewModel: PresetViewModel!

    override func setUp() {
        super.setUp()
        viewModel = PresetViewModel()
    }

    override func tearDown() {
        viewModel = nil
        super.tearDown()
    }

    // MARK: - 初期状態

    func testInitialPresetsAreDefaults() {
        XCTAssertEqual(viewModel.presets.count, 3)
        XCTAssertTrue(viewModel.customPresets.isEmpty)
    }

    func testAllPresetsIncludesDefaultAndCustom() {
        XCTAssertEqual(viewModel.allPresets.count, 3)
    }

    func testShowPremiumPromptInitiallyFalse() {
        XCTAssertFalse(viewModel.showPremiumPrompt)
    }

    // MARK: - 無料版プリセット上限

    func testFreeLimitIs3() {
        XCTAssertEqual(PresetViewModel.freeLimit, 3)
    }

    func testCanAddPresetWhenFreeAndUnderLimit() {
        XCTAssertTrue(viewModel.canAddPreset(isPremium: false))
    }

    func testCannotAddPresetWhenFreeAndAtLimit() {
        // カスタムプリセットを3つ追加したシミュレーション
        viewModel.customPresets = [
            Preset(name: "1", topURL: "https://a.com", bottomURL: "", description: ""),
            Preset(name: "2", topURL: "https://b.com", bottomURL: "", description: ""),
            Preset(name: "3", topURL: "https://c.com", bottomURL: "", description: ""),
        ]
        XCTAssertFalse(viewModel.canAddPreset(isPremium: false))
    }

    func testCanAlwaysAddPresetWhenPremium() {
        viewModel.customPresets = [
            Preset(name: "1", topURL: "https://a.com", bottomURL: "", description: ""),
            Preset(name: "2", topURL: "https://b.com", bottomURL: "", description: ""),
            Preset(name: "3", topURL: "https://c.com", bottomURL: "", description: ""),
        ]
        XCTAssertTrue(viewModel.canAddPreset(isPremium: true))
    }

    // MARK: - allPresets 結合

    func testAllPresetsWithCustom() {
        viewModel.customPresets = [
            Preset(name: "カスタム", topURL: "https://x.com", bottomURL: "", description: "")
        ]
        XCTAssertEqual(viewModel.allPresets.count, 4)
    }
}
