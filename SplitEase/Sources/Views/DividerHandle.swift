// DividerHandle.swift
// ドラッグ可能な分割バー

import SwiftUI

struct DividerHandle: View {
    @Binding var isDragging: Bool
    var isHorizontal: Bool = false
    let onDrag: (CGFloat) -> Void

    @State private var dragActive = false

    var body: some View {
        if isHorizontal {
            // 横画面: 縦方向の分割バー
            Rectangle()
                .fill(Color.clear)
                .frame(width: 24)
                .contentShape(Rectangle())
                .overlay {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(dragActive ? Color.accentColor : Color(.systemGray3))
                        .frame(width: 5, height: 40)
                }
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            dragActive = true
                            isDragging = true
                            onDrag(value.location.x)
                        }
                        .onEnded { _ in
                            dragActive = false
                            isDragging = false
                        }
                )
                .accessibilityLabel("分割バー: ドラッグで比率を調整")
                .accessibilityHint("左右にドラッグしてパネルの幅を変更できます")
        } else {
            // 縦画面: 横方向の分割バー
            Rectangle()
                .fill(Color.clear)
                .frame(height: 24)
                .contentShape(Rectangle())
                .overlay {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(dragActive ? Color.accentColor : Color(.systemGray3))
                        .frame(width: 40, height: 5)
                }
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            dragActive = true
                            isDragging = true
                            onDrag(value.location.y)
                        }
                        .onEnded { _ in
                            dragActive = false
                            isDragging = false
                        }
                )
                .accessibilityLabel("分割バー: ドラッグで比率を調整")
                .accessibilityHint("上下にドラッグしてパネルの高さを変更できます")
        }
    }
}

#Preview {
    VStack {
        Color.blue.frame(height: 200)
        DividerHandle(isDragging: .constant(false)) { _ in }
        Color.red.frame(height: 200)
    }
}
