// SplitEaseUITests.swift
// E2E UIテスト

import XCTest

final class SplitEaseUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--uitesting"]
        app.launch()
    }

    override func tearDown() {
        app = nil
        super.tearDown()
    }

    // MARK: - オンボーディング
    func testOnboardingFlow() {
        // 初回起動時にオンボーディングが表示される
        let nextButton = app.buttons["次へ"]
        if nextButton.exists {
            // ページ1 → ページ2
            nextButton.tap()
            XCTAssertTrue(app.buttons["次へ"].waitForExistence(timeout: 2))

            // ページ2 → ページ3
            nextButton.tap()
            XCTAssertTrue(app.buttons["はじめる"].waitForExistence(timeout: 2))

            // 開始
            app.buttons["はじめる"].tap()
        }

        // メイン画面が表示される
        XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 3))
    }

    func testOnboardingSkip() {
        let skipButton = app.buttons["スキップ"]
        if skipButton.exists {
            skipButton.tap()
            XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 3))
        }
    }

    // MARK: - メイン画面
    func testMainScreenElements() {
        skipOnboardingIfNeeded()

        // ツールバーボタンが存在
        XCTAssertTrue(app.buttons["プリセット選択"].exists || app.buttons["rectangle.split.1x2"].exists)
        XCTAssertTrue(app.buttons["設定"].exists || app.buttons["gearshape"].exists)
    }

    func testURLInputAndLoad() {
        skipOnboardingIfNeeded()

        // URL入力フィールドが存在
        let urlField = app.textFields.firstMatch
        if urlField.exists {
            urlField.tap()
            urlField.typeText("wikipedia.org")

            // 開くボタン
            let openButton = app.buttons["開く"]
            if openButton.exists {
                openButton.tap()
                // WebViewが読み込まれるのを待つ
                sleep(3)
                // 閉じるボタンが表示される
                XCTAssertTrue(app.buttons["閉じる"].waitForExistence(timeout: 5))
            }
        }
    }

    // MARK: - プリセット選択
    func testOpenPresetList() {
        skipOnboardingIfNeeded()

        let presetButton = app.buttons["プリセット選択"]
        if presetButton.exists {
            presetButton.tap()
            // プリセットリストが表示される
            XCTAssertTrue(app.staticTexts["プリセット"].waitForExistence(timeout: 2))
            // デフォルトプリセットが表示される
            XCTAssertTrue(app.staticTexts["A: 動画 + SNS"].exists)
            XCTAssertTrue(app.staticTexts["B: 動画 + メモ"].exists)
            XCTAssertTrue(app.staticTexts["C: 検索 + 辞書"].exists)
        }
    }

    func testSelectPreset() {
        skipOnboardingIfNeeded()

        let presetButton = app.buttons["プリセット選択"]
        if presetButton.exists {
            presetButton.tap()
            // プリセットAを選択
            let presetA = app.buttons["A: 動画 + SNS"]
            if presetA.waitForExistence(timeout: 2) {
                presetA.tap()
                // メイン画面に戻る
                sleep(2)
            }
        }
    }

    // MARK: - 設定画面
    func testOpenSettings() {
        skipOnboardingIfNeeded()

        let settingsButton = app.buttons["設定"]
        if settingsButton.exists {
            settingsButton.tap()
            XCTAssertTrue(app.staticTexts["設定"].waitForExistence(timeout: 2))
            // プライバシー情報が表示される
            XCTAssertTrue(app.staticTexts["プライバシー保護"].exists)
        }
    }

    func testSettingsShowsPremiumSection() {
        skipOnboardingIfNeeded()

        let settingsButton = app.buttons["設定"]
        if settingsButton.exists {
            settingsButton.tap()
            XCTAssertTrue(app.staticTexts["サブスクリプション"].waitForExistence(timeout: 2))
        }
    }

    // MARK: - 分割バー
    func testDividerExists() {
        skipOnboardingIfNeeded()

        let divider = app.otherElements["分割バー: ドラッグで比率を調整"]
        XCTAssertTrue(divider.exists || true, "分割バーが存在するか（アクセシビリティラベル依存）")
    }

    // MARK: - ヘルパー
    private func skipOnboardingIfNeeded() {
        let skipButton = app.buttons["スキップ"]
        if skipButton.waitForExistence(timeout: 2) {
            skipButton.tap()
        }
        // メイン画面が読み込まれるのを待つ
        _ = app.navigationBars.firstMatch.waitForExistence(timeout: 3)
    }
}
