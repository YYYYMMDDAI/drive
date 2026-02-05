// WebPane.swift
// WKWebViewラッパー（UIViewRepresentable）

import SwiftUI
import WebKit

struct WebPane: UIViewRepresentable {
    let url: URL
    let index: Int

    func makeUIView(context: Context) -> WKWebView {
        let webView = WebViewPool.shared.getWebView(for: index)
        webView.navigationDelegate = context.coordinator
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // 同じURLなら再読み込みしない
        if uiView.url != url {
            let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad)
            uiView.load(request)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            print("WebView読み込みエラー: \(error.localizedDescription)")
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            // 外部アプリへのリンクはSafariで開く
            if let url = navigationAction.request.url,
               navigationAction.navigationType == .linkActivated,
               !url.host!.contains(webView.url?.host ?? "") {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }
    }
}
