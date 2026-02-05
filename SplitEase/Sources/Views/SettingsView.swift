// SettingsView.swift
// 設定画面（プレミアム購入含む）

import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var iapManager: IAPManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                // プレミアムセクション
                Section {
                    if iapManager.isPremium {
                        HStack {
                            Image(systemName: "checkmark.seal.fill")
                                .foregroundStyle(.green)
                            Text("プレミアム有効")
                                .fontWeight(.semibold)
                        }
                    } else {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "star.fill")
                                    .foregroundStyle(.yellow)
                                Text("SplitEase プレミアム")
                                    .font(.headline)
                            }

                            VStack(alignment: .leading, spacing: 6) {
                                benefitRow("無制限のカスタムプリセット")
                                benefitRow("広告なし")
                                benefitRow("テーマカスタマイズ")
                            }
                            .padding(.vertical, 4)
                        }

                        // 購入ボタン
                        ForEach(iapManager.products) { product in
                            Button {
                                Task { await iapManager.purchase(product) }
                            } label: {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text(product.displayName)
                                            .font(.subheadline)
                                            .fontWeight(.medium)
                                        Text(product.description)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Text(product.displayPrice)
                                        .font(.subheadline)
                                        .fontWeight(.bold)
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(Color.accentColor)
                                        .clipShape(Capsule())
                                }
                            }
                        }

                        // 購入復元
                        Button("購入を復元") {
                            Task { await iapManager.restore() }
                        }
                        .font(.subheadline)
                    }
                } header: {
                    Text("サブスクリプション")
                }

                // アプリ情報
                Section {
                    LabeledContent("バージョン", value: appVersion)
                    LabeledContent("対応OS", value: "iOS 16.0+")
                } header: {
                    Text("アプリ情報")
                }

                // プライバシー
                Section {
                    HStack {
                        Image(systemName: "lock.shield.fill")
                            .foregroundStyle(.green)
                        VStack(alignment: .leading, spacing: 4) {
                            Text("プライバシー保護")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            Text("すべてのデータはデバイス内に保存され、外部サーバーには送信されません")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                } header: {
                    Text("プライバシー")
                }

                // サポート
                Section {
                    Link(destination: URL(string: "https://splitease.app/support")!) {
                        Label("サポート・お問い合わせ", systemImage: "envelope")
                    }
                    Link(destination: URL(string: "https://splitease.app/privacy")!) {
                        Label("プライバシーポリシー", systemImage: "doc.text")
                    }
                    Link(destination: URL(string: "https://splitease.app/terms")!) {
                        Label("利用規約", systemImage: "doc.plaintext")
                    }
                } header: {
                    Text("サポート")
                }
            }
            .navigationTitle("設定")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("閉じる") { dismiss() }
                }
            }
        }
    }

    private func benefitRow(_ text: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .font(.caption)
                .foregroundStyle(.green)
            Text(text)
                .font(.subheadline)
        }
    }

    private var appVersion: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }
}

#Preview {
    SettingsView()
        .environmentObject(IAPManager())
}
