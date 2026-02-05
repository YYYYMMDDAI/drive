// Preset.swift
// プリセットモデル定義

import Foundation

struct Preset: Identifiable, Codable, Equatable {
    let id: UUID
    var name: String
    var topURL: String
    var bottomURL: String
    var description: String
    var isDefault: Bool

    init(
        id: UUID = UUID(),
        name: String,
        topURL: String,
        bottomURL: String,
        description: String,
        isDefault: Bool = false
    ) {
        self.id = id
        self.name = name
        self.topURL = topURL
        self.bottomURL = bottomURL
        self.description = description
        self.isDefault = isDefault
    }

    // デフォルトプリセット（無料版の3つ固定）
    static let defaults: [Preset] = [
        Preset(
            name: "A: 動画 + SNS",
            topURL: "https://m.youtube.com",
            bottomURL: "https://x.com",
            description: "YouTubeを見ながらXをチェック",
            isDefault: true
        ),
        Preset(
            name: "B: 動画 + メモ",
            topURL: "https://m.youtube.com",
            bottomURL: "",
            description: "動画を見ながらメモを取る",
            isDefault: true
        ),
        Preset(
            name: "C: 検索 + 辞書",
            topURL: "https://www.google.com",
            bottomURL: "https://ejje.weblio.jp",
            description: "検索しながら辞書で調べる",
            isDefault: true
        )
    ]
}

// メモパネル用の識別
enum PaneContent {
    case web(URL)
    case memo
    case empty

    var isMemo: Bool {
        if case .memo = self { return true }
        return false
    }
}
