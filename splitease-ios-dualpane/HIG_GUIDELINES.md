# HIG_GUIDELINES

SplitEase DualPane の実装時に守る簡易HIGガイド。

## 1. Clarity
- 主要操作は「プリセット選択」「分割比率調整」「アプリ起動」に限定する。
- 1画面内で現在状態（上ペイン/下ペインの対象）を常に見える化する。

## 2. Deference
- UI装飾は控えめにし、操作対象（Pane Object）を主役にする。
- カードUIは情報のラベル化に留め、不要なアニメーションを避ける。

## 3. Depth
- 画面遷移を増やしすぎず、状態変更は同一画面で完結する。
- モーダルは設定や制約説明など低頻度操作のみに使用する。

## 4. iOS Consistency
- NavigationStack + Toolbar を基本にし、標準コントロール中心で構成。
- iOS制約（他アプリUIの同時埋め込み不可）を初回説明で明示する。

## 5. Accessibility
- 分割ハンドル、各カードボタン、警告表示に accessibilityLabel を付与。
- Dynamic Type でも壊れないよう、固定高さ依存を最小化する。
