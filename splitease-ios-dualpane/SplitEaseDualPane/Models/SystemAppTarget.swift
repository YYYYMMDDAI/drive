import Foundation

enum SystemAppTarget: String, CaseIterable, Identifiable, Codable {
    case safari
    case maps
    case mail
    case phone
    case notes

    var id: String { rawValue }

    var title: String {
        switch self {
        case .safari: return "Safari"
        case .maps: return "Maps"
        case .mail: return "Mail"
        case .phone: return "Phone"
        case .notes: return "Notes"
        }
    }

    var actionTitle: String {
        "\(title)で開く"
    }

    var description: String {
        switch self {
        case .safari: return "Web検索や閲覧"
        case .maps: return "地図と経路確認"
        case .mail: return "メール作成"
        case .phone: return "電話アプリ起動"
        case .notes: return "メモ記録"
        }
    }

    var deepLink: URL? {
        switch self {
        case .safari:
            return URL(string: "https://www.apple.com/jp/")
        case .maps:
            return URL(string: "http://maps.apple.com/?q=Tokyo+Station")
        case .mail:
            return URL(string: "mailto:")
        case .phone:
            return URL(string: "tel://")
        case .notes:
            return URL(string: "mobilenotes://")
        }
    }
}

struct SplitPreset: Identifiable, Hashable {
    let id: String
    let name: String
    let description: String
    let topTarget: SystemAppTarget
    let bottomTarget: SystemAppTarget

    static let defaults: [SplitPreset] = [
        .init(id: "A", name: "A: 動画 + SNS", description: "Safariで動画を開きつつ下で情報確認", topTarget: .safari, bottomTarget: .safari),
        .init(id: "B", name: "B: 地図 + メモ", description: "移動確認とメモを同時に準備", topTarget: .maps, bottomTarget: .notes),
        .init(id: "C", name: "C: 連絡 + 調査", description: "Mail/PhoneとSafariを素早く切替", topTarget: .mail, bottomTarget: .phone)
    ]
}

enum PanePosition: String, Codable {
    case top
    case bottom

    var title: String {
        switch self {
        case .top: return "上ペイン"
        case .bottom: return "下ペイン"
        }
    }
}

struct PaneModel: Identifiable {
    let id = UUID()
    let position: PanePosition
    var selectedTarget: SystemAppTarget
}
