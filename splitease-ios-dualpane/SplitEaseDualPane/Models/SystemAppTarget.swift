import Foundation

enum SystemAppTarget: String, CaseIterable, Identifiable {
    case safari
    case maps
    case mail
    case phone

    var id: String { rawValue }

    var title: String {
        switch self {
        case .safari: return "Safari"
        case .maps: return "Maps"
        case .mail: return "Mail"
        case .phone: return "Phone"
        }
    }

    var description: String {
        switch self {
        case .safari: return "Webを開く"
        case .maps: return "地図アプリを開く"
        case .mail: return "メール作成画面を開く"
        case .phone: return "電話アプリを開く"
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
        }
    }
}
