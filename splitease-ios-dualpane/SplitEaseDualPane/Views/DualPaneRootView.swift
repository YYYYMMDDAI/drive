import SwiftUI

struct DualPaneRootView: View {
    @Environment(\.openURL) private var openURL
    @State private var ratio: CGFloat = 0.5

    private let launcher = SystemAppLauncher()

    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                Text("9:16 DualPane Tool")
                    .font(.headline)
                    .frame(maxWidth: .infinity, alignment: .leading)

                GeometryReader { proxy in
                    let frameWidth = proxy.size.width
                    let frameHeight = frameWidth * (16.0 / 9.0)

                    VStack(spacing: 0) {
                        pane(title: "上ペイン", color: .blue.opacity(0.08))
                            .frame(height: frameHeight * ratio)

                        Rectangle()
                            .fill(.gray.opacity(0.45))
                            .frame(height: 8)
                            .gesture(
                                DragGesture(minimumDistance: 0)
                                    .onChanged { value in
                                        let next = value.location.y / frameHeight
                                        ratio = min(max(next, 0.2), 0.8)
                                    }
                            )
                            .accessibilityLabel("分割ハンドル")

                        pane(title: "下ペイン", color: .green.opacity(0.08))
                            .frame(height: frameHeight * (1 - ratio))
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
        }
    }

    @ViewBuilder
    private func pane(title: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.secondary)

            LazyVGrid(columns: [.init(.adaptive(minimum: 120), spacing: 8)], spacing: 8) {
                ForEach(SystemAppTarget.allCases) { target in
                    Button {
                        launcher.launch(target, openURL: openURL)
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(target.title)
                                .font(.body.weight(.semibold))
                            Text(target.description)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10)
                        .background(.white.opacity(0.7))
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(title) \(target.title) を開く")
                }
            }

            Spacer(minLength: 0)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .background(color)
    }
}

#Preview {
    DualPaneRootView()
}
