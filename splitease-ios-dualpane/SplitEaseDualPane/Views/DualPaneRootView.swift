import SwiftUI

struct DualPaneRootView: View {
    @Environment(\.openURL) private var openURL
    @StateObject private var viewModel = DualPaneViewModel()

    private let launcher = SystemAppLauncher()

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 12) {
                header

                if !viewModel.lowPowerMessage.isEmpty {
                    Text(viewModel.lowPowerMessage)
                        .font(.footnote)
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(.yellow.opacity(0.18))
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .accessibilityLabel("低電力モード警告")
                }

                GeometryReader { proxy in
                    let frameWidth = proxy.size.width
                    let frameHeight = frameWidth * (16.0 / 9.0)

                    VStack(spacing: 0) {
                        paneSection(pane: viewModel.topPane)
                            .frame(height: frameHeight * viewModel.ratio)

                        Rectangle()
                            .fill(.gray.opacity(0.45))
                            .frame(height: 8)
                            .gesture(
                                DragGesture(minimumDistance: 0)
                                    .onChanged { value in
                                        viewModel.updateRatio(by: value.location.y, frameHeight: frameHeight)
                                    }
                            )
                            .accessibilityLabel("分割ハンドル")
                            .accessibilityValue("現在の比率 \(Int(viewModel.ratio * 100)) パーセント")

                        paneSection(pane: viewModel.bottomPane)
                            .frame(height: frameHeight * (1 - viewModel.ratio))
                    }
                    .frame(width: frameWidth, height: frameHeight)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(.gray.opacity(0.2), lineWidth: 1)
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                }
            }
            .padding(16)
            .navigationTitle("SplitEase")
            .navigationBarTitleDisplayMode(.inline)
            .alert("起動エラー", isPresented: launchErrorBinding) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(viewModel.launchError)
            }
            .sheet(isPresented: $viewModel.showConstraintGuide) {
                constraintGuide
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("9:16 DualPane")
                .font(.headline)

            Picker("プリセット", selection: $viewModel.selectedPresetID) {
                ForEach(viewModel.presets) { preset in
                    Text(preset.name).tag(preset.id)
                }
            }
            .pickerStyle(.segmented)
            .onChange(of: viewModel.selectedPresetID) { newID in
                if let preset = viewModel.presets.first(where: { $0.id == newID }) {
                    viewModel.applyPreset(preset)
                }
            }
            .accessibilityLabel("プリセット選択")

            Text(viewModel.selectedPresetDescription)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private func paneSection(pane: PaneModel) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(pane.position.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                Text("現在: \(pane.selectedTarget.title)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            ScrollView {
                LazyVGrid(columns: [.init(.adaptive(minimum: 124), spacing: 8)], spacing: 8) {
                    ForEach(SystemAppTarget.allCases) { target in
                        Button {
                            viewModel.selectTarget(target, for: pane.position)
                            launcher.launch(target, openURL: openURL) { message in
                                viewModel.setLaunchError(message)
                            }
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(target.actionTitle)
                                    .font(.body.weight(.semibold))
                                Text(target.description)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(target == pane.selectedTarget ? .blue.opacity(0.16) : .white.opacity(0.72))
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("\(pane.position.title) \(target.actionTitle)")
                    }
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .background(pane.position == .top ? .blue.opacity(0.06) : .green.opacity(0.06))
    }

    private var launchErrorBinding: Binding<Bool> {
        Binding(
            get: { !viewModel.launchError.isEmpty },
            set: { presented in
                if !presented {
                    viewModel.launchError = ""
                }
            }
        )
    }

    private var constraintGuide: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 12) {
                Text("iOS制約のご案内")
                    .font(.title3.bold())

                Text("他アプリの画面をこのアプリ内で同時表示することはできません。SplitEaseは9:16の上下ペイン上で、各システムアプリへの最短導線を提供します。")
                    .font(.body)

                Spacer()
            }
            .padding(16)
            .navigationTitle("はじめに")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("了解") {
                        viewModel.dismissConstraintGuide()
                    }
                }
            }
        }
    }
}

#Preview {
    DualPaneRootView()
}
