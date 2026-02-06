# SplitEase DualPane (Independent iOS Tool)

`note-generator` とは無関係な、独立ディレクトリです。  
iOS向けに「9:16フレームを上下分割し、システムアプリへ遷移可能なユーティリティ」を実装します。

## この版での実装方針
- HIG/OOUI/SwiftUIパターン文書を先に定義
- `ViewModel` 中心に状態を集約
- `Pane` / `Preset` / `UserPreference` を中心にOOUIで設計

## 追加ドキュメント（先に読んでから実装）
- `HIG_GUIDELINES.md`
- `OOUI_DESIGN.md`
- `SWIFTUI_PATTERNS.md`

## ディレクトリ構成

- `SplitEaseDualPane/SplitEaseDualPaneApp.swift`: エントリポイント
- `SplitEaseDualPane/Views/DualPaneRootView.swift`: 9:16コンテナ + 上下分割UI
- `SplitEaseDualPane/ViewModels/DualPaneViewModel.swift`: 画面状態管理
- `SplitEaseDualPane/Models/SystemAppTarget.swift`: システムアプリ定義 + Preset/Pane定義
- `SplitEaseDualPane/Services/SystemAppLauncher.swift`: URL Scheme経由起動
- `docs/IMPLEMENTATION_NOTES.md`: 実装意図・iOS制約
- `docs/HIG_OOUI_REDESIGN_CONTEXT.md`: HIG/OOUI再設計コンテキスト

## 注意
- iOSでは他アプリのUIをアプリ内に埋め込むことはできません。
- 本ツールは「上下ペインUI + システムアプリ起動導線」を提供します。
- 実機動作にはXcodeでのプロジェクト作成/署名設定が必要です。
