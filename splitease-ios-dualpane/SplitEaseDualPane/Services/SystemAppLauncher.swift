import SwiftUI

struct SystemAppLauncher {
    func launch(_ target: SystemAppTarget, openURL: OpenURLAction) {
        guard let url = target.deepLink else { return }
        openURL(url)
    }
}
