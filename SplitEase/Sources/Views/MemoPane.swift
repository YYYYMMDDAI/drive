// MemoPane.swift
// メモ入力パネル

import SwiftUI

struct MemoPane: View {
    @Binding var text: String

    var body: some View {
        VStack(spacing: 0) {
            // ヘッダー
            HStack {
                Image(systemName: "note.text")
                    .foregroundStyle(.secondary)
                Text("メモ")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(text.count)文字")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color(.systemBackground))

            Divider()

            // テキスト入力
            TextEditor(text: $text)
                .font(.body)
                .padding(8)
                .scrollContentBackground(.hidden)
                .background(Color(.systemBackground))
                .accessibilityLabel("メモ入力エリア")
        }
        .background(Color(.systemBackground))
    }
}

#Preview {
    MemoPane(text: .constant("サンプルメモ"))
        .frame(height: 300)
}
