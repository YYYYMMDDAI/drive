import SwiftUI

final class DualPaneViewModel: ObservableObject {
    @AppStorage("splitease.dualpane.ratio") private var storedRatio: Double = 0.5
    @AppStorage("splitease.dualpane.selectedPreset") private var storedPresetID: String = "A"
    @AppStorage("splitease.dualpane.hasShownConstraintGuide") private var hasShownConstraintGuideStorage: Bool = false

    @Published var topPane: PaneModel
    @Published var bottomPane: PaneModel
    @Published var ratio: CGFloat {
        didSet {
            storedRatio = Double(ratio)
        }
    }
    @Published var selectedPresetID: String {
        didSet {
            storedPresetID = selectedPresetID
        }
    }
    @Published var lowPowerMessage: String = ""
    @Published var showConstraintGuide: Bool
    @Published var launchError: String = ""

    let presets = SplitPreset.defaults
    let minRatio: CGFloat = 0.2
    let maxRatio: CGFloat = 0.8

    init() {
        let initialPreset = SplitPreset.defaults.first(where: { $0.id == storedPresetID }) ?? SplitPreset.defaults[0]
        topPane = PaneModel(position: .top, selectedTarget: initialPreset.topTarget)
        bottomPane = PaneModel(position: .bottom, selectedTarget: initialPreset.bottomTarget)
        ratio = CGFloat(min(max(storedRatio, 0.2), 0.8))
        selectedPresetID = initialPreset.id
        showConstraintGuide = !hasShownConstraintGuideStorage

        if ProcessInfo.processInfo.isLowPowerModeEnabled {
            lowPowerMessage = "低電力モード中は表示更新が制限される場合があります。"
        }
    }

    var selectedPresetDescription: String {
        presets.first(where: { $0.id == selectedPresetID })?.description ?? ""
    }

    func updateRatio(by y: CGFloat, frameHeight: CGFloat) {
        guard frameHeight > 0 else { return }
        let next = y / frameHeight
        ratio = min(max(next, minRatio), maxRatio)
    }

    func applyPreset(_ preset: SplitPreset) {
        selectedPresetID = preset.id
        topPane.selectedTarget = preset.topTarget
        bottomPane.selectedTarget = preset.bottomTarget
    }

    func selectTarget(_ target: SystemAppTarget, for position: PanePosition) {
        switch position {
        case .top: topPane.selectedTarget = target
        case .bottom: bottomPane.selectedTarget = target
        }
    }

    func dismissConstraintGuide() {
        hasShownConstraintGuideStorage = true
        showConstraintGuide = false
    }

    func setLaunchError(_ message: String) {
        launchError = message
    }
}
