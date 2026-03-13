// EmptyPane.swift
// URL入力用の空パネル

import SwiftUI

struct EmptyPane: View {
    @Binding var url: String
    let onLoad: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "globe")
                .font(.system(size: 40))
                .foregroundStyle(.tertiary)

            Text("URLを入力してWebサイトを表示")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack(spacing: 8) {
                TextField("例: youtube.com", text: $url)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.URL)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .submitLabel(.go)
                    .onSubmit { onLoad() }
                    .accessibilityLabel("URL入力欄")

                Button {
                    onLoad()
                } label: {
                    Text("開く")
                        .fontWeight(.semibold)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.accentColor)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .accessibilityLabel("URLを開く")
            }
            .padding(.horizontal, 24)

            Spacer()
        }
        .background(Color(.secondarySystemBackground))
    }
}

#Preview {
    EmptyPane(url: .constant(""), onLoad: {})
        .frame(height: 300)
}
