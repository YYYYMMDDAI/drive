// OnboardingView.swift
// 初回起動時のオンボーディング画面

import SwiftUI

struct OnboardingView: View {
    @Binding var hasCompleted: Bool
    @State private var currentPage = 0

    private let pages: [(icon: String, title: String, body: String)] = [
        (
            "rectangle.split.1x2.fill",
            "画面を2つに分割",
            "動画を見ながらSNSをチェック。\niPhoneで画面分割を実現します。"
        ),
        (
            "hand.draw.fill",
            "ドラッグで自由に調整",
            "分割バーをドラッグして\n上下の大きさを自由に変えられます。"
        ),
        (
            "lock.shield.fill",
            "プライバシー保護",
            "すべてのデータはあなたのデバイス内。\n外部サーバーへの送信はゼロです。"
        )
    ]

    var body: some View {
        VStack(spacing: 0) {
            // ページコンテンツ
            TabView(selection: $currentPage) {
                ForEach(0..<pages.count, id: \.self) { index in
                    VStack(spacing: 24) {
                        Spacer()

                        Image(systemName: pages[index].icon)
                            .font(.system(size: 64))
                            .foregroundStyle(.accent)
                            .padding(.bottom, 8)

                        Text(pages[index].title)
                            .font(.title)
                            .fontWeight(.bold)
                            .multilineTextAlignment(.center)

                        Text(pages[index].body)
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)

                        Spacer()
                        Spacer()
                    }
                    .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .always))

            // 開始ボタン
            VStack(spacing: 16) {
                if currentPage == pages.count - 1 {
                    Button {
                        withAnimation { hasCompleted = true }
                    } label: {
                        Text("はじめる")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.accentColor)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .padding(.horizontal, 24)
                } else {
                    Button {
                        withAnimation { currentPage += 1 }
                    } label: {
                        Text("次へ")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.accentColor)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .padding(.horizontal, 24)
                }

                Button {
                    withAnimation { hasCompleted = true }
                } label: {
                    Text("スキップ")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.bottom, 32)
        }
    }
}

#Preview {
    OnboardingView(hasCompleted: .constant(false))
}
