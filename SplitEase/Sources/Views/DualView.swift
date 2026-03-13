// DualView.swift
// メインの画面分割ビュー

import SwiftUI

struct DualView: View {
    @StateObject private var viewModel = DualViewModel()
    @EnvironmentObject var iapManager: IAPManager
    @EnvironmentObject var presetViewModel: PresetViewModel

    var body: some View {
        NavigationStack {
            GeometryReader { geo in
                ZStack {
                    // メインコンテンツ
                    if viewModel.isLandscape {
                        horizontalLayout(size: geo.size)
                    } else {
                        verticalLayout(size: geo.size)
                    }

                    // バッテリー警告
                    if viewModel.batteryManager.shouldShowWarning {
                        VStack {
                            BatteryWarningBanner(message: viewModel.batteryManager.warningMessage)
                            Spacer()
                        }
                    }
                }
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        viewModel.showPresetList = true
                    } label: {
                        Image(systemName: "rectangle.split.1x2")
                            .accessibilityLabel("プリセット選択")
                    }
                }

                ToolbarItem(placement: .principal) {
                    Text(viewModel.currentPreset.name)
                        .font(.headline)
                        .lineLimit(1)
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        viewModel.showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                            .accessibilityLabel("設定")
                    }
                }
            }
            .sheet(isPresented: $viewModel.showPresetList) {
                PresetListView(
                    viewModel: viewModel,
                    presetViewModel: presetViewModel
                )
            }
            .sheet(isPresented: $viewModel.showSettings) {
                SettingsView()
            }
            .onReceive(NotificationCenter.default.publisher(for: UIDevice.orientationDidChangeNotification)) { _ in
                let orientation = UIDevice.current.orientation
                viewModel.updateOrientation(orientation.isLandscape)
            }
        }
        .accessibilityLabel("デュアルビュー: 画面分割表示")
    }

    // MARK: - 縦画面レイアウト（上下分割）
    @ViewBuilder
    private func verticalLayout(size: CGSize) -> some View {
        VStack(spacing: 0) {
            // 上パネル
            paneView(content: viewModel.topContent, index: 0, url: $viewModel.topURL) {
                viewModel.loadTopURL()
            } onClear: {
                viewModel.clearTop()
            }
            .frame(height: size.height * viewModel.splitRatio - 12)

            // 分割バー
            DividerHandle(isDragging: .constant(false)) { dragY in
                viewModel.updateRatio(dragValue: dragY, totalHeight: size.height)
            }

            // 下パネル
            paneView(content: viewModel.bottomContent, index: 1, url: $viewModel.bottomURL) {
                viewModel.loadBottomURL()
            } onClear: {
                viewModel.clearBottom()
            }
            .frame(height: size.height * (1 - viewModel.splitRatio) - 12)
        }
    }

    // MARK: - 横画面レイアウト（左右分割）
    @ViewBuilder
    private func horizontalLayout(size: CGSize) -> some View {
        HStack(spacing: 0) {
            paneView(content: viewModel.topContent, index: 0, url: $viewModel.topURL) {
                viewModel.loadTopURL()
            } onClear: {
                viewModel.clearTop()
            }
            .frame(width: size.width * viewModel.splitRatio - 12)

            DividerHandle(isDragging: .constant(false), isHorizontal: true) { dragX in
                viewModel.updateRatio(dragValue: dragX, totalHeight: size.width)
            }

            paneView(content: viewModel.bottomContent, index: 1, url: $viewModel.bottomURL) {
                viewModel.loadBottomURL()
            } onClear: {
                viewModel.clearBottom()
            }
            .frame(width: size.width * (1 - viewModel.splitRatio) - 12)
        }
    }

    // MARK: - パネルビュー
    @ViewBuilder
    private func paneView(
        content: PaneContent,
        index: Int,
        url: Binding<String>,
        onLoad: @escaping () -> Void,
        onClear: @escaping () -> Void
    ) -> some View {
        ZStack {
            switch content {
            case .web(let webURL):
                WebPane(url: webURL, index: index)
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                // 閉じるボタン
                VStack {
                    HStack {
                        Spacer()
                        Button {
                            onClear()
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.title2)
                                .foregroundStyle(.white)
                                .shadow(radius: 2)
                        }
                        .padding(8)
                        .accessibilityLabel("閉じる")
                    }
                    Spacer()
                }

            case .memo:
                MemoPane(text: $viewModel.memoText)
                    .clipShape(RoundedRectangle(cornerRadius: 8))

            case .empty:
                EmptyPane(url: url, onLoad: onLoad)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }
}

// MARK: - バッテリー警告バナー
struct BatteryWarningBanner: View {
    let message: String

    var body: some View {
        HStack {
            Image(systemName: "battery.25")
            Text(message)
                .font(.caption)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
        .padding(.top, 8)
    }
}

#Preview {
    DualView()
        .environmentObject(IAPManager())
        .environmentObject(PresetViewModel())
}
