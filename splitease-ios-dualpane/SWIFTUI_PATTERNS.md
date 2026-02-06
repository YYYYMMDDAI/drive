# SWIFTUI_PATTERNS

SplitEase DualPane の実装で使うパターン。

## State Management
- 画面状態は `@StateObject ViewModel` に集約する。
- 永続化は `@AppStorage` を使い、`didSet` で自動同期する。

## Layout
- `GeometryReader` で 9:16 コンテナを算出。
- 比率変更は `DragGesture` で反映し、20%-80%にクランプ。

## Reusable Components
- `PaneSectionView`（上/下ペイン共通）
- `PresetPickerView`（プリセット選択）
- `SystemAppCard`（起動対象カード）

## UX Safeguards
- 失敗時は `alert` で行動可能な文言を表示。
- 低電力時は視覚的バナーで制限を通知する。

## Testing Hints
- ViewModelのロジック（クランプ、プリセット適用、状態保存）を単体で検証。
- UIはハンドルドラッグとプリセット適用を優先確認。
