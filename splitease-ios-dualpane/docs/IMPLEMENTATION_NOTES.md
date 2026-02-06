# Implementation Notes (iOS / 9:16 DualPane)

## このディレクトリの位置づけ
- `note-generator` と完全に分離した、独立プロダクトの土台です。
- iOS向けの最小実装として、9:16コンテナを上下分割するUIと、システムアプリ起動導線を持ちます。

## 実装前に参照するドキュメント
- `../HIG_GUIDELINES.md`
- `../OOUI_DESIGN.md`
- `../SWIFTUI_PATTERNS.md`
- `./HIG_OOUI_REDESIGN_CONTEXT.md`

## 要件との対応
1. **9:16画面を上下分割**
   - `GeometryReader` で横幅基準に 16:9 の縦長フレームを計算
   - 上下ペインを `ratio` で分割し、20%-80%の範囲でドラッグ調整

2. **システム内アプリ利用**
   - `SystemAppTarget` で起動先を定義（Safari/Maps/Mail/Phone/Notes）
   - `openURL` で URL Scheme / Universal URL を起動

3. **HIG/アクセシビリティ（簡易）**
   - 主要UIに一貫したラベル
   - ハンドルにアクセシビリティラベル + 現在比率の読み上げ
   - iOS制約説明を初回モーダルで明示

4. **OOUI**
   - `PaneModel` / `SplitPreset` / `UserPreference(AppStorage)` 中心に状態設計
   - Viewは表示とイベント送信、状態更新は ViewModel へ集約

## iOS制約
- 他社/システムアプリの画面を自アプリ内に直接埋め込んで同時表示することは不可。
- 本実装は「切り替えて利用する導線ツール」という意味で要件を満たす設計。

## Xcode導入時の次アクション
- `File > New > Project > iOS App` で `SplitEaseDualPane` を作成
- 本ディレクトリの `SplitEaseDualPane/` 配下を既存ファイルへ反映
- 実機で URL Scheme の可否差分（端末設定・制限）を確認
