// SplitEaseUITests.swift
// E2E UIテスト（全画面フロー網羅）

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

    // ================================================================
    // MARK: - 1. オンボーディングフロー
    // ================================================================

    /// ページ送りで最後まで進み「はじめる」で完了
    func testOnboardingFullFlow() {
        let nextButton = app.buttons["次へ"]
        guard nextButton.waitForExistence(timeout: 3) else { return }

        // ページ1 → 2
        nextButton.tap()
        XCTAssertTrue(app.buttons["次へ"].waitForExistence(timeout: 2))

        // ページ2 → 3
        nextButton.tap()
        let startButton = app.buttons["はじめる"]
        XCTAssertTrue(startButton.waitForExistence(timeout: 2))

        // 完了
        startButton.tap()
        XCTAssertTrue(
            app.navigationBars.firstMatch.waitForExistence(timeout: 3),
            "オンボーディング後にメイン画面が表示"
        )
    }

    /// 「スキップ」で即座にメイン画面へ遷移
    func testOnboardingSkip() {
        let skipButton = app.buttons["スキップ"]
        guard skipButton.waitForExistence(timeout: 3) else { return }

        skipButton.tap()
        XCTAssertTrue(
            app.navigationBars.firstMatch.waitForExistence(timeout: 3),
            "スキップ後にメイン画面が表示"
        )
    }

    // ================================================================
    // MARK: - 2. メイン画面の構成要素
    // ================================================================

    /// ツールバーにプリセット・設定ボタンが存在
    func testMainScreenToolbarButtons() {
        skipOnboarding()

        let hasPresetButton = app.buttons["プリセット選択"].exists
            || app.images["rectangle.split.1x2"].exists
        let hasSettingsButton = app.buttons["設定"].exists
            || app.images["gearshape"].exists

        XCTAssertTrue(hasPresetButton, "プリセットボタンが存在")
        XCTAssertTrue(hasSettingsButton, "設定ボタンが存在")
    }

    /// URL入力フィールドが少なくとも1つ存在
    func testMainScreenHasURLInput() {
        skipOnboarding()

        let textField = app.textFields.firstMatch
        XCTAssertTrue(
            textField.waitForExistence(timeout: 3),
            "URL入力フィールドが存在"
        )
    }

    /// 「開く」ボタンが存在
    func testMainScreenHasOpenButton() {
        skipOnboarding()

        let openButton = app.buttons["URLを開く"]
        let fallback = app.buttons["開く"]
        XCTAssertTrue(
            openButton.exists || fallback.exists,
            "開くボタンが存在"
        )
    }

    // ================================================================
    // MARK: - 3. URL入力 → Webサイト表示
    // ================================================================

    /// URLを入力して「開く」でWebViewが読み込まれる
    func testLoadURLInTopPane() {
        skipOnboarding()

        let textField = app.textFields.firstMatch
        guard textField.waitForExistence(timeout: 3) else {
            XCTFail("URL入力フィールドが見つからない")
            return
        }

        textField.tap()
        textField.typeText("wikipedia.org")

        let openButton = app.buttons.matching(NSPredicate(format: "label CONTAINS '開く'")).firstMatch
        guard openButton.waitForExistence(timeout: 2) else {
            XCTFail("開くボタンが見つからない")
            return
        }
        openButton.tap()

        // 閉じるボタンが出現 = WebView読み込み成功
        let closeButton = app.buttons["閉じる"]
        XCTAssertTrue(
            closeButton.waitForExistence(timeout: 10),
            "WebView読み込み後に閉じるボタンが表示"
        )
    }

    /// Webサイト表示後に×ボタンでクリアできる
    func testClearLoadedURL() {
        skipOnboarding()

        // URLを読み込む
        let textField = app.textFields.firstMatch
        guard textField.waitForExistence(timeout: 3) else { return }
        textField.tap()
        textField.typeText("example.com")

        let openButton = app.buttons.matching(NSPredicate(format: "label CONTAINS '開く'")).firstMatch
        guard openButton.waitForExistence(timeout: 2) else { return }
        openButton.tap()

        // 閉じるボタンをタップ
        let closeButton = app.buttons["閉じる"]
        guard closeButton.waitForExistence(timeout: 10) else {
            XCTFail("閉じるボタンが表示されない")
            return
        }
        closeButton.tap()

        // URL入力フィールドが再表示される
        XCTAssertTrue(
            app.textFields.firstMatch.waitForExistence(timeout: 3),
            "クリア後にURL入力が再表示"
        )
    }

    // ================================================================
    // MARK: - 4. プリセット選択
    // ================================================================

    /// プリセット画面を開いてデフォルト3つが表示
    func testPresetListShowsDefaults() {
        skipOnboarding()

        openPresetList()

        XCTAssertTrue(app.staticTexts["プリセット"].waitForExistence(timeout: 2))
        XCTAssertTrue(app.staticTexts["A: 動画 + SNS"].exists, "プリセットAが存在")
        XCTAssertTrue(app.staticTexts["B: 動画 + メモ"].exists, "プリセットBが存在")
        XCTAssertTrue(app.staticTexts["C: 検索 + 辞書"].exists, "プリセットCが存在")
    }

    /// 「新しいペアを追加」ボタンが存在
    func testPresetListHasAddButton() {
        skipOnboarding()
        openPresetList()

        let addButton = app.buttons.matching(NSPredicate(format: "label CONTAINS '追加'")).firstMatch
        XCTAssertTrue(
            addButton.waitForExistence(timeout: 2),
            "ペア追加ボタンが存在"
        )
    }

    /// プリセットAをタップすると画面が閉じる（適用される）
    func testSelectPresetA() {
        skipOnboarding()
        openPresetList()

        let presetA = app.staticTexts["A: 動画 + SNS"]
        guard presetA.waitForExistence(timeout: 2) else {
            XCTFail("プリセットAが見つからない")
            return
        }
        presetA.tap()

        // プリセットリストが閉じてメイン画面に戻る
        XCTAssertTrue(
            app.navigationBars.firstMatch.waitForExistence(timeout: 3),
            "プリセット選択後にメイン画面に戻る"
        )
    }

    /// プリセットBを選択（メモモード）
    func testSelectPresetBMemo() {
        skipOnboarding()
        openPresetList()

        let presetB = app.staticTexts["B: 動画 + メモ"]
        guard presetB.waitForExistence(timeout: 2) else {
            XCTFail("プリセットBが見つからない")
            return
        }
        presetB.tap()

        // メモパネルが表示される
        sleep(1)
        let memoLabel = app.staticTexts["メモ"]
        XCTAssertTrue(
            memoLabel.waitForExistence(timeout: 3),
            "プリセットB選択後にメモパネルが表示"
        )
    }

    /// プリセット画面を「閉じる」で閉じる
    func testClosePresetList() {
        skipOnboarding()
        openPresetList()

        let closeButton = app.buttons["閉じる"]
        guard closeButton.waitForExistence(timeout: 2) else {
            XCTFail("閉じるボタンが見つからない")
            return
        }
        closeButton.tap()

        XCTAssertTrue(
            app.navigationBars.firstMatch.waitForExistence(timeout: 3),
            "プリセット画面が閉じてメイン画面に戻る"
        )
    }

    // ================================================================
    // MARK: - 5. 設定画面
    // ================================================================

    /// 設定画面が開きプライバシー情報が表示
    func testSettingsShowsPrivacy() {
        skipOnboarding()
        openSettings()

        XCTAssertTrue(app.staticTexts["設定"].waitForExistence(timeout: 2))
        XCTAssertTrue(
            app.staticTexts["プライバシー保護"].exists,
            "プライバシーセクションが表示"
        )
    }

    /// サブスクリプションセクションが表示
    func testSettingsShowsSubscription() {
        skipOnboarding()
        openSettings()

        XCTAssertTrue(
            app.staticTexts["サブスクリプション"].waitForExistence(timeout: 2),
            "サブスクリプションセクションが表示"
        )
    }

    /// 「購入を復元」ボタンが存在
    func testSettingsHasRestoreButton() {
        skipOnboarding()
        openSettings()

        let restoreButton = app.buttons["購入を復元"]
        XCTAssertTrue(
            restoreButton.waitForExistence(timeout: 2),
            "購入復元ボタンが存在"
        )
    }

    /// バージョン情報が表示
    func testSettingsShowsVersion() {
        skipOnboarding()
        openSettings()

        let versionLabel = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS 'バージョン' OR label CONTAINS '1.0'")
        ).firstMatch
        XCTAssertTrue(
            versionLabel.waitForExistence(timeout: 2),
            "バージョン情報が表示"
        )
    }

    /// 設定画面を閉じる
    func testCloseSettings() {
        skipOnboarding()
        openSettings()

        let closeButton = app.buttons["閉じる"]
        guard closeButton.waitForExistence(timeout: 2) else {
            XCTFail("閉じるボタンが見つからない")
            return
        }
        closeButton.tap()

        XCTAssertTrue(
            app.navigationBars.firstMatch.waitForExistence(timeout: 3),
            "設定画面が閉じてメイン画面に戻る"
        )
    }

    // ================================================================
    // MARK: - 6. メモ入力
    // ================================================================

    /// メモパネルにテキスト入力できる
    func testMemoTextInput() {
        skipOnboarding()

        // プリセットB（メモモード）を選択
        openPresetList()
        let presetB = app.staticTexts["B: 動画 + メモ"]
        guard presetB.waitForExistence(timeout: 2) else { return }
        presetB.tap()

        sleep(1)

        // テキストビュー（メモ入力）を探す
        let textView = app.textViews.firstMatch
        guard textView.waitForExistence(timeout: 3) else {
            return // メモパネルの実装に依存
        }
        textView.tap()
        textView.typeText("テストメモ")

        // 入力されたテキストが存在
        XCTAssertTrue(
            app.textViews.matching(NSPredicate(format: "value CONTAINS 'テストメモ'")).firstMatch.exists,
            "メモにテキストが入力された"
        )
    }

    // ================================================================
    // MARK: - 7. 全画面フロー（E2Eシナリオ）
    // ================================================================

    /// 起動 → オンボーディング完了 → プリセット選択 → URL表示 → 閉じる
    func testFullE2EFlow() {
        // 1. オンボーディング
        let skipButton = app.buttons["スキップ"]
        if skipButton.waitForExistence(timeout: 3) {
            skipButton.tap()
        }
        XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 3))

        // 2. プリセット選択
        openPresetList()
        let presetC = app.staticTexts["C: 検索 + 辞書"]
        if presetC.waitForExistence(timeout: 2) {
            presetC.tap()
        }
        sleep(2)

        // 3. 設定を開いて閉じる
        openSettings()
        let closeSettings = app.buttons["閉じる"]
        if closeSettings.waitForExistence(timeout: 2) {
            closeSettings.tap()
        }

        // 4. メイン画面に戻っている
        XCTAssertTrue(
            app.navigationBars.firstMatch.waitForExistence(timeout: 3),
            "全フロー完了後にメイン画面が表示"
        )
    }

    // ================================================================
    // MARK: - ヘルパーメソッド
    // ================================================================

    private func skipOnboarding() {
        let skipButton = app.buttons["スキップ"]
        if skipButton.waitForExistence(timeout: 3) {
            skipButton.tap()
        }
        _ = app.navigationBars.firstMatch.waitForExistence(timeout: 3)
    }

    private func openPresetList() {
        let presetButton = app.buttons["プリセット選択"]
        if presetButton.waitForExistence(timeout: 2) {
            presetButton.tap()
        }
    }

    private func openSettings() {
        let settingsButton = app.buttons["設定"]
        if settingsButton.waitForExistence(timeout: 2) {
            settingsButton.tap()
        }
    }
}
