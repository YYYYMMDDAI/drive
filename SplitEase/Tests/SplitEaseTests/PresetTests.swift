// PresetTests.swift
// プリセット関連のユニットテスト

import XCTest
@testable import SplitEase

final class PresetTests: XCTestCase {

    // MARK: - デフォルトプリセット
    func testDefaultPresetsCount() {
        XCTAssertEqual(Preset.defaults.count, 3, "デフォルトプリセットは3つ")
    }

    func testDefaultPresetsHaveValidURLs() {
        for preset in Preset.defaults {
            XCTAssertFalse(preset.topURL.isEmpty, "\(preset.name) のtopURLが空")
            XCTAssertTrue(
                preset.topURL.hasPrefix("https://"),
                "\(preset.name) のtopURLがhttps://で始まっていない"
            )
        }
    }

    func testDefaultPresetsAreMarkedAsDefault() {
        for preset in Preset.defaults {
            XCTAssertTrue(preset.isDefault, "\(preset.name) がデフォルトフラグでない")
        }
    }

    func testPresetBHasMemoMode() {
        let presetB = Preset.defaults[1]
        XCTAssertTrue(presetB.bottomURL.isEmpty, "プリセットBの下URLが空でない（メモモード）")
        XCTAssertTrue(presetB.name.contains("メモ"), "プリセットBにメモが含まれていない")
    }

    // MARK: - カスタムプリセット作成
    func testCreateCustomPreset() {
        let preset = Preset(
            name: "テスト",
            topURL: "https://example.com",
            bottomURL: "https://example.org",
            description: "テスト用"
        )

        XCTAssertEqual(preset.name, "テスト")
        XCTAssertEqual(preset.topURL, "https://example.com")
        XCTAssertFalse(preset.isDefault)
    }

    // MARK: - PaneContent
    func testPaneContentMemo() {
        let content = PaneContent.memo
        XCTAssertTrue(content.isMemo)
    }

    func testPaneContentWeb() {
        let url = URL(string: "https://example.com")!
        let content = PaneContent.web(url)
        XCTAssertFalse(content.isMemo)
    }

    func testPaneContentEmpty() {
        let content = PaneContent.empty
        XCTAssertFalse(content.isMemo)
    }
}
