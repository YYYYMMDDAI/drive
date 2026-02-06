import SwiftUI

struct SystemAppLauncher {
    func launch(_ target: SystemAppTarget, openURL: OpenURLAction, onFailure: @escaping (String) -> Void) {
        guard let url = target.deepLink else {
            onFailure("\(target.title) の起動URLが無効です。")
            return
        }

        openURL(url) { accepted in
            if !accepted {
                onFailure("\(target.title) を起動できませんでした。設定や端末制限を確認してください。")
            }
        }
    }
}
