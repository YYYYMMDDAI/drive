// DualViewModelTests.swift
// 分割画面ViewModelのユニットテスト

import XCTest
@testable import SplitEase

final class DualViewModelTests: XCTestCase {

    var viewModel: DualViewModel!

    override func setUp() {
        super.setUp()
        viewModel = DualViewModel()
    }

    override func tearDown() {
        viewModel = nil
        super.tearDown()
    }

    // MARK: - 初期状態
    func testInitialSplitRatio() {
        XCTAssertEqual(viewModel.splitRatio, 0.5, "初期比率は50%")
    }

    func testInitialPreset() {
        XCTAssertEqual(viewModel.currentPreset.name, Preset.defaults[0].name)
    }

    // MARK: - 比率調整
    func testUpdateRatioWithinBounds() {
        viewModel.updateRatio(dragValue: 300, totalHeight: 1000)
        XCTAssertEqual(viewModel.splitRatio, 0.3)
    }

    func testUpdateRatioMinimumClamp() {
        viewModel.updateRatio(dragValue: 50, totalHeight: 1000)
        XCTAssertEqual(viewModel.splitRatio, 0.2, "最小値は0.2")
    }

    func testUpdateRatioMaximumClamp() {
        viewModel.updateRatio(dragValue: 950, totalHeight: 1000)
        XCTAssertEqual(viewModel.splitRatio, 0.8, "最大値は0.8")
    }

    // MARK: - プリセット適用
    func testApplyPresetA() {
        viewModel.applyPreset(Preset.defaults[0])
        XCTAssertEqual(viewModel.currentPreset.name, "A: 動画 + SNS")
        if case .web = viewModel.topContent {} else {
            XCTFail("上パネルがWebでない")
        }
    }

    func testApplyPresetBWithMemo() {
        viewModel.applyPreset(Preset.defaults[1])
        if case .memo = viewModel.bottomContent {} else {
            XCTFail("プリセットBの下パネルがメモでない")
        }
    }

    func testApplyPresetResetsSplitRatio() {
        viewModel.splitRatio = 0.7
        viewModel.applyPreset(Preset.defaults[2])
        XCTAssertEqual(viewModel.splitRatio, 0.5, "プリセット適用で比率リセット")
    }

    // MARK: - URL読み込み
    func testLoadTopURLWithHttps() {
        viewModel.topURL = "https://example.com"
        viewModel.loadTopURL()
        if case .web(let url) = viewModel.topContent {
            XCTAssertEqual(url.absoluteString, "https://example.com")
        } else {
            XCTFail("URLが読み込まれていない")
        }
    }

    func testLoadTopURLWithoutProtocol() {
        viewModel.topURL = "example.com"
        viewModel.loadTopURL()
        if case .web(let url) = viewModel.topContent {
            XCTAssertEqual(url.absoluteString, "https://example.com")
        } else {
            XCTFail("プロトコル自動補完が機能していない")
        }
    }

    func testLoadEmptyURLDoesNothing() {
        viewModel.topURL = ""
        viewModel.loadTopURL()
        if case .empty = viewModel.topContent {} else {
            XCTFail("空URLで状態が変わってしまった")
        }
    }

    // MARK: - パネルクリア
    func testClearTop() {
        viewModel.topURL = "https://example.com"
        viewModel.loadTopURL()
        viewModel.clearTop()

        XCTAssertTrue(viewModel.topURL.isEmpty)
        if case .empty = viewModel.topContent {} else {
            XCTFail("クリア後にemptyでない")
        }
    }

    func testClearBottom() {
        viewModel.bottomURL = "https://example.com"
        viewModel.loadBottomURL()
        viewModel.clearBottom()

        XCTAssertTrue(viewModel.bottomURL.isEmpty)
        if case .empty = viewModel.bottomContent {} else {
            XCTFail("クリア後にemptyでない")
        }
    }

    // MARK: - 画面回転
    func testUpdateOrientation() {
        viewModel.updateOrientation(true)
        XCTAssertTrue(viewModel.isLandscape)

        viewModel.updateOrientation(false)
        XCTAssertFalse(viewModel.isLandscape)
    }
}
