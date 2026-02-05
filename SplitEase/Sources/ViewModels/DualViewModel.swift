// DualViewModel.swift
// 分割画面のロジック管理

import SwiftUI
import Combine

class DualViewModel: ObservableObject {
    // 分割比率（0.2〜0.8）
    @Published var splitRatio: CGFloat = 0.5

    // 現在のプリセット
    @Published var currentPreset: Preset = Preset.defaults[0]

    // パネルの状態
    @Published var topURL: String = ""
    @Published var bottomURL: String = ""
    @Published var topContent: PaneContent = .empty
    @Published var bottomContent: PaneContent = .empty

    // メモ内容
    @Published var memoText: String = ""

    // UIの状態
    @Published var showPresetList = false
    @Published var showSettings = false
    @Published var isLandscape = false

    // バッテリー管理
    @Published var batteryManager = BatteryManager()

    init() {
        applyPreset(Preset.defaults[0])
    }

    // MARK: - プリセット適用
    func applyPreset(_ preset: Preset) {
        currentPreset = preset

        // 上パネル
        if let url = URL(string: preset.topURL), !preset.topURL.isEmpty {
            topContent = .web(url)
            topURL = preset.topURL
        } else {
            topContent = .empty
            topURL = ""
        }

        // 下パネル
        if preset.bottomURL.isEmpty && preset.name.contains("メモ") {
            bottomContent = .memo
            bottomURL = ""
        } else if let url = URL(string: preset.bottomURL), !preset.bottomURL.isEmpty {
            bottomContent = .web(url)
            bottomURL = preset.bottomURL
        } else {
            bottomContent = .empty
            bottomURL = ""
        }

        // 比率リセット
        splitRatio = 0.5
    }

    // MARK: - URL読み込み
    func loadTopURL() {
        guard !topURL.isEmpty else { return }
        let urlString = topURL.hasPrefix("http") ? topURL : "https://\(topURL)"
        if let url = URL(string: urlString) {
            topContent = .web(url)
            WebViewPool.shared.preloadURL(url)
        }
    }

    func loadBottomURL() {
        guard !bottomURL.isEmpty else { return }
        let urlString = bottomURL.hasPrefix("http") ? bottomURL : "https://\(bottomURL)"
        if let url = URL(string: urlString) {
            bottomContent = .web(url)
            WebViewPool.shared.preloadURL(url)
        }
    }

    // MARK: - パネルクリア
    func clearTop() {
        topContent = .empty
        topURL = ""
        WebViewPool.shared.reset(index: 0)
    }

    func clearBottom() {
        bottomContent = .empty
        bottomURL = ""
        WebViewPool.shared.reset(index: 1)
    }

    // MARK: - 分割比率調整
    func updateRatio(dragValue: CGFloat, totalHeight: CGFloat) {
        let newRatio = dragValue / totalHeight
        splitRatio = min(max(newRatio, 0.2), 0.8)
    }

    // MARK: - 画面回転対応
    func updateOrientation(_ isLandscape: Bool) {
        self.isLandscape = isLandscape
    }
}
