// PresetListView.swift
// プリセット選択画面（Nani風シンプルリスト）

import SwiftUI

struct PresetListView: View {
    @ObservedObject var viewModel: DualViewModel
    @ObservedObject var presetViewModel: PresetViewModel
    @EnvironmentObject var iapManager: IAPManager
    @Environment(\.dismiss) private var dismiss
    @Environment(\.managedObjectContext) private var context

    @State private var showAddPreset = false

    var body: some View {
        NavigationStack {
            List {
                // デフォルトプリセット
                Section {
                    ForEach(Preset.defaults) { preset in
                        presetRow(preset)
                    }
                } header: {
                    Text("標準プリセット")
                }

                // カスタムプリセット
                if !presetViewModel.customPresets.isEmpty {
                    Section {
                        ForEach(presetViewModel.customPresets) { preset in
                            presetRow(preset)
                                .swipeActions(edge: .trailing) {
                                    Button(role: .destructive) {
                                        presetViewModel.deletePreset(id: preset.id, context: context)
                                    } label: {
                                        Label("削除", systemImage: "trash")
                                    }
                                }
                        }
                    } header: {
                        Text("カスタムプリセット")
                    }
                }

                // プリセット追加ボタン
                Section {
                    Button {
                        if presetViewModel.canAddPreset(isPremium: iapManager.isPremium) {
                            showAddPreset = true
                        } else {
                            presetViewModel.showPremiumPrompt = true
                        }
                    } label: {
                        HStack {
                            Image(systemName: "plus.circle.fill")
                                .foregroundStyle(.green)
                            Text("新しいペアを追加")
                            if !iapManager.isPremium {
                                Spacer()
                                Image(systemName: "lock.fill")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .accessibilityLabel("新しいプリセットを追加")
                }
            }
            .navigationTitle("プリセット")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("閉じる") { dismiss() }
                }
            }
            .sheet(isPresented: $showAddPreset) {
                AddPresetView(presetViewModel: presetViewModel)
            }
            .alert("プレミアムにアップグレード", isPresented: $presetViewModel.showPremiumPrompt) {
                Button("詳細を見る") {
                    viewModel.showSettings = true
                    dismiss()
                }
                Button("あとで", role: .cancel) {}
            } message: {
                Text("無料版ではカスタムプリセットは\(PresetViewModel.freeLimit)個まで。プレミアムで無制限にできます。")
            }
        }
    }

    @ViewBuilder
    private func presetRow(_ preset: Preset) -> some View {
        Button {
            viewModel.applyPreset(preset)
            dismiss()
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text(preset.name)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)
                Text(preset.description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 4)
        }
        .accessibilityLabel("\(preset.name): \(preset.description)")
    }
}

// MARK: - プリセット追加画面
struct AddPresetView: View {
    @ObservedObject var presetViewModel: PresetViewModel
    @EnvironmentObject var iapManager: IAPManager
    @Environment(\.dismiss) private var dismiss
    @Environment(\.managedObjectContext) private var context

    @State private var name = ""
    @State private var topURL = ""
    @State private var bottomURL = ""
    @State private var description = ""
    @State private var useMemo = false

    var body: some View {
        NavigationStack {
            Form {
                Section("プリセット名") {
                    TextField("例: ニュース + メモ", text: $name)
                }

                Section("上パネル") {
                    TextField("URL（例: youtube.com）", text: $topURL)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                }

                Section("下パネル") {
                    Toggle("メモを表示", isOn: $useMemo)

                    if !useMemo {
                        TextField("URL（例: x.com）", text: $bottomURL)
                            .keyboardType(.URL)
                            .textInputAutocapitalization(.never)
                    }
                }

                Section("説明（任意）") {
                    TextField("例: ニュースを見ながらメモ", text: $description)
                }
            }
            .navigationTitle("新しいペア")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        let preset = Preset(
                            name: name,
                            topURL: topURL.hasPrefix("http") ? topURL : "https://\(topURL)",
                            bottomURL: useMemo ? "" : (bottomURL.hasPrefix("http") ? bottomURL : "https://\(bottomURL)"),
                            description: description.isEmpty ? "\(name)" : description
                        )
                        let _ = presetViewModel.addPreset(preset, isPremium: iapManager.isPremium, context: context)
                        dismiss()
                    }
                    .disabled(name.isEmpty || topURL.isEmpty)
                }
            }
        }
    }
}
