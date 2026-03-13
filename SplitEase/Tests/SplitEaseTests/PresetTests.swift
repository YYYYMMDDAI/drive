// PresetTests.swift
// プリセット関連のユニットテスト

import XCTest
@testable import SplitEase

final class PresetTests: XCTestCase {

    // MARK: - デフォルトプリセット

    func testDefaultPresetsCount() {
        XCTAssertEqual(Preset.defaults.count, 3, "デフォルトプリセットは3つ")
    }

    func testDefaultPresetsHaveValidTopURLs() {
        for preset in Preset.defaults {
            XCTAssertFalse(preset.topURL.isEmpty, "\(preset.name) のtopURLが空")
            XCTAssertTrue(
                preset.topURL.hasPrefix("https://"),
                "\(preset.name) のtopURLがhttps://で始まっていない"
            )
            XCTAssertNotNil(
                URL(string: preset.topURL),
                "\(preset.name) のtopURLが不正"
            )
        }
    }

    func testDefaultPresetsAreMarkedAsDefault() {
        for preset in Preset.defaults {
            XCTAssertTrue(preset.isDefault, "\(preset.name) がデフォルトフラグでない")
        }
    }

    func testDefaultPresetsHaveUniqueIDs() {
        let ids = Preset.defaults.map { $0.id }
        XCTAssertEqual(ids.count, Set(ids).count, "デフォルトプリセットにID重複がある")
    }

    func testDefaultPresetsHaveNames() {
        for preset in Preset.defaults {
            XCTAssertFalse(preset.name.isEmpty, "プリセット名が空")
        }
    }

    func testDefaultPresetsHaveDescriptions() {
        for preset in Preset.defaults {
            XCTAssertFalse(preset.description.isEmpty, "\(preset.name) の説明が空")
        }
    }

    // MARK: - 個別プリセット検証

    func testPresetA() {
        let preset = Preset.defaults[0]
        XCTAssertTrue(preset.name.contains("動画"))
        XCTAssertTrue(preset.name.contains("SNS"))
        XCTAssertTrue(preset.topURL.contains("youtube"))
        XCTAssertFalse(preset.bottomURL.isEmpty)
    }

    func testPresetBHasMemoMode() {
        let preset = Preset.defaults[1]
        XCTAssertTrue(preset.bottomURL.isEmpty, "プリセットBの下URLが空でない（メモモード）")
        XCTAssertTrue(preset.name.contains("メモ"), "プリセットBにメモが含まれていない")
    }

    func testPresetC() {
        let preset = Preset.defaults[2]
        XCTAssertTrue(preset.name.contains("検索"))
        XCTAssertTrue(preset.name.contains("辞書"))
        XCTAssertTrue(preset.topURL.contains("google"))
        XCTAssertFalse(preset.bottomURL.isEmpty)
    }

    // MARK: - カスタムプリセット

    func testCreateCustomPreset() {
        let preset = Preset(
            name: "テスト",
            topURL: "https://example.com",
            bottomURL: "https://example.org",
            description: "テスト用"
        )
        XCTAssertEqual(preset.name, "テスト")
        XCTAssertEqual(preset.topURL, "https://example.com")
        XCTAssertEqual(preset.bottomURL, "https://example.org")
        XCTAssertEqual(preset.description, "テスト用")
        XCTAssertFalse(preset.isDefault)
    }

    func testCustomPresetDefaultValues() {
        let preset = Preset(
            name: "A",
            topURL: "https://a.com",
            bottomURL: "https://b.com",
            description: "desc"
        )
        XCTAssertFalse(preset.isDefault, "カスタムプリセットはデフォルトfalse")
        XCTAssertNotNil(preset.id, "IDが自動生成される")
    }

    func testPresetEquality() {
        let id = UUID()
        let a = Preset(id: id, name: "A", topURL: "https://a.com", bottomURL: "", description: "")
        let b = Preset(id: id, name: "A", topURL: "https://a.com", bottomURL: "", description: "")
        XCTAssertEqual(a, b)
    }

    func testPresetInequality() {
        let a = Preset(name: "A", topURL: "https://a.com", bottomURL: "", description: "")
        let b = Preset(name: "B", topURL: "https://b.com", bottomURL: "", description: "")
        XCTAssertNotEqual(a, b)
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

    // MARK: - Codable

    func testPresetEncodeDecode() throws {
        let original = Preset(
            name: "テスト",
            topURL: "https://example.com",
            bottomURL: "https://example.org",
            description: "エンコードテスト"
        )
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(Preset.self, from: data)

        XCTAssertEqual(original.id, decoded.id)
        XCTAssertEqual(original.name, decoded.name)
        XCTAssertEqual(original.topURL, decoded.topURL)
        XCTAssertEqual(original.bottomURL, decoded.bottomURL)
        XCTAssertEqual(original.description, decoded.description)
        XCTAssertEqual(original.isDefault, decoded.isDefault)
    }
}
