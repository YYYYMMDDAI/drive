// WebViewPoolTests.swift
// WebViewPool のユニットテスト

import XCTest
@testable import SplitEase

final class WebViewPoolTests: XCTestCase {

    // MARK: - シングルトン

    func testSharedInstanceIsSingleton() {
        let a = WebViewPool.shared
        let b = WebViewPool.shared
        XCTAssertTrue(a === b, "WebViewPoolはシングルトン")
    }

    // MARK: - WebView取得

    func testGetWebViewReturnsSameInstanceForSameIndex() {
        let pool = WebViewPool.shared
        let view1 = pool.getWebView(for: 0)
        let view2 = pool.getWebView(for: 0)
        XCTAssertTrue(view1 === view2, "同じインデックスでは同じインスタンスが返る")
    }

    func testGetWebViewReturnsDifferentInstancesForDifferentIndices() {
        let pool = WebViewPool.shared
        let view0 = pool.getWebView(for: 0)
        let view1 = pool.getWebView(for: 1)
        XCTAssertFalse(view0 === view1, "異なるインデックスでは異なるインスタンス")
    }

    func testWebViewAllowsInlinePlayback() {
        let pool = WebViewPool.shared
        let view = pool.getWebView(for: 0)
        XCTAssertTrue(
            view.configuration.allowsInlineMediaPlayback,
            "インライン再生が有効であること"
        )
    }

    func testWebViewUsesNonPersistentDataStore() {
        let pool = WebViewPool.shared
        let view = pool.getWebView(for: 0)
        XCTAssertFalse(
            view.configuration.websiteDataStore.isPersistent,
            "非永続データストアであること（プライバシー）"
        )
    }

    func testWebViewAllowsBackForwardGestures() {
        let pool = WebViewPool.shared
        let view = pool.getWebView(for: 0)
        XCTAssertTrue(
            view.allowsBackForwardNavigationGestures,
            "戻る/進むジェスチャーが有効であること"
        )
    }
}
