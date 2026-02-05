// BatteryManager.swift
// バッテリー状態監視・最適化

import UIKit
import Combine

class BatteryManager: ObservableObject {
    @Published var isLowPowerMode: Bool = false
    @Published var batteryLevel: Float = 1.0
    @Published var batteryState: UIDevice.BatteryState = .unknown

    private var cancellables = Set<AnyCancellable>()

    init() {
        UIDevice.current.isBatteryMonitoringEnabled = true
        updateBatteryInfo()
        observeChanges()
    }

    private func updateBatteryInfo() {
        isLowPowerMode = ProcessInfo.processInfo.isLowPowerModeEnabled
        batteryLevel = UIDevice.current.batteryLevel
        batteryState = UIDevice.current.batteryState
    }

    private func observeChanges() {
        // 低電力モード変更を監視
        NotificationCenter.default.publisher(for: .NSProcessInfoPowerStateDidChange)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.isLowPowerMode = ProcessInfo.processInfo.isLowPowerModeEnabled
            }
            .store(in: &cancellables)

        // バッテリーレベル変更を監視
        NotificationCenter.default.publisher(for: UIDevice.batteryLevelDidChangeNotification)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.batteryLevel = UIDevice.current.batteryLevel
            }
            .store(in: &cancellables)

        // バッテリー状態変更を監視
        NotificationCenter.default.publisher(for: UIDevice.batteryStateDidChangeNotification)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.batteryState = UIDevice.current.batteryState
            }
            .store(in: &cancellables)
    }

    /// バッテリー警告が必要かどうか
    var shouldShowWarning: Bool {
        isLowPowerMode || batteryLevel < 0.2
    }

    /// バッテリー警告メッセージ
    var warningMessage: String {
        if isLowPowerMode {
            return "低電力モードのため、表示を制限しています"
        } else if batteryLevel < 0.1 {
            return "バッテリー残量が少なくなっています（\(Int(batteryLevel * 100))%）"
        } else if batteryLevel < 0.2 {
            return "バッテリー節約のため、自動更新を停止しています"
        }
        return ""
    }
}
