# SplitEase DualPane (Independent iOS Tool)

`note-generator` とは無関係な、独立ディレクトリです。  
iOS向けに「9:16フレームを上下分割し、システムアプリへ遷移可能なユーティリティ」を実装するための最小構成を定義しています。

## 目的
- 9:16の縦画面を明示的に扱う
- 上下2ペインをドラッグで調整（20%-80%）
- 各ペインから iOS のシステムアプリ（Safari / Maps / Mail / Phone）へ遷移

## ディレクトリ構成

- `SplitEaseDualPane/SplitEaseDualPaneApp.swift`: エントリポイント
- `SplitEaseDualPane/Views/DualPaneRootView.swift`: 9:16コンテナ + 上下分割UI
- `SplitEaseDualPane/Models/SystemAppTarget.swift`: システムアプリ定義
- `SplitEaseDualPane/Services/SystemAppLauncher.swift`: URL Scheme経由起動
- `docs/IMPLEMENTATION_NOTES.md`: 実装意図・iOS制約

## 注意
- iOSでは他アプリのUIをアプリ内に埋め込むことはできません。
- 本ツールは「上下ペインUI + システムアプリ起動導線」を提供します。
- 実機動作にはXcodeでのプロジェクト作成/署名設定が必要です。
