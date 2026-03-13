// WebViewPool.swift
// WKWebViewプール管理（パフォーマンス・バッテリー最適化）

import WebKit

class WebViewPool: ObservableObject {
    static let shared = WebViewPool()

    private var pool: [Int: WKWebView] = [:]

    private init() {}

    /// 指定インデックスのWebViewを取得（再利用）
    func getWebView(for index: Int) -> WKWebView {
        if let existing = pool[index] {
            return existing
        }

        let config = WKWebViewConfiguration()
        // 動画インライン再生を許可（ながら見に必須）
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        // プライバシー: 非永続データストア
        config.websiteDataStore = .nonPersistent()
        // JavaScript有効
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        pool[index] = webView
        return webView
    }

    /// WebViewをリセット
    func reset(index: Int) {
        pool[index]?.stopLoading()
        pool[index]?.load(URLRequest(url: URL(string: "about:blank")!))
    }

    /// 全WebViewを解放
    func releaseAll() {
        pool.values.forEach { $0.stopLoading() }
        pool.removeAll()
    }

    /// URLをキャッシュ（オフライン準備）
    func preloadURL(_ url: URL) {
        let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad)
        URLSession.shared.dataTask(with: request) { _, _, _ in }.resume()
    }
}
