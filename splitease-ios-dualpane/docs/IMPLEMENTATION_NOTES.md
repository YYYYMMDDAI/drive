# Implementation Notes (iOS / 9:16 DualPane)

## このディレクトリの位置づけ
- `note-generator` と完全に分離した、独立プロダクトの土台です。
- iOS向けの最小実装として、9:16コンテナを上下分割するUIと、システムアプリ起動導線を持ちます。

## 要件との対応
1. **9:16画面を上下分割**
   - `GeometryReader` で横幅基準に 16:9 の縦長フレームを計算
   - 上下ペインを `ratio` で分割し、20%-80%の範囲でドラッグ調整

2. **システム内アプリ利用**
   - `SystemAppTarget` で起動先を定義（Safari/Maps/Mail/Phone）
   - `openURL` で URL Scheme / Universal URL を起動

3. **HIG/アクセシビリティ（簡易）**
   - 主要UIに一貫したラベル
   - ハンドルにアクセシビリティラベル
   - 単純な階層と明確な操作対象

## iOS制約
- 他社/システムアプリの画面を自アプリ内に直接埋め込んで同時表示することは不可。
- 本実装は「切り替えて利用する導線ツール」という意味で要件を満たす設計。

## Xcode導入時の次アクション
- `File > New > Project > iOS App` で `SplitEaseDualPane` を作成
- 本ディレクトリの `SplitEaseDualPane/` 配下を既存ファイルへ反映
- 実機で `Phone` / `Mail` スキームの権限挙動を確認
