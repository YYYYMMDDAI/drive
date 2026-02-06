# SplitEase DualPane: HIG + OOUI 再設計コンテキスト（簡易）

作成日: 2026-02-06
対象: `splitease-ios-dualpane`（`note-generator` とは独立）

---

## 1) Web Search 実施ログ（文献探索）

以下の一次/準一次ソースへアクセスを試行:

1. Apple Human Interface Guidelines
   - https://developer.apple.com/design/human-interface-guidelines
2. Apple HIG: Designing for iOS
   - https://developer.apple.com/design/human-interface-guidelines/designing-for-ios
3. OOUI 参考（A List Apart）
   - https://alistapart.com/article/orientedtowardobjects/
4. OOUI 参考（UXmatters）
   - https://www.uxmatters.com/mt/archives/2010/01/object-oriented-ui-design.php

結果:
- 本環境では上記すべて `HTTP/1.1 403 Forbidden`。
- したがって本資料は、一般に広く合意される HIG / OOUI の要点を簡易整理した「実装前コンテキスト」として扱う。

---

## 2) HIG 観点の要点（SplitEase向けに解釈）

### Clarity（明瞭さ）
- 主目的を一目で理解できる構造にする。
- SplitEaseでは「上下2ペイン」「分割比率調整」「起動先アプリ選択」の3要素を最上位に置く。

### Deference（コンテンツ優先）
- 装飾より内容を優先。
- ツールバー・カード・ラベルは最小限、ペイン領域を最大化する。

### Depth（階層と遷移の自然さ）
- 画面遷移を増やさず、同一画面で状態変化を見せる。
- アプリ起動導線はモーダル深掘りでなく、ペイン内カードタップで完了させる。

### Platform Consistency（iOSらしさ）
- iOS標準ナビゲーションと文言に寄せる。
- 物理的に不可能な要件（他アプリUIの同時埋め込み）は期待値調整を明記。

### Accessibility
- VoiceOverラベル（ペイン名、ハンドル、起動アクション）を必須化。
- Dynamic Type 拡大時でもボタンが潰れないレイアウトを採用。

---

## 3) OOUI 観点の要点（オブジェクト中心設計）

タスク列挙から始めず、先に「何を操作するか」を定義する。

### Core Objects
1. **Pane**
   - 状態: `position(top|bottom)`, `ratio`, `selectedTarget`
   - 責務: どの領域で何を起動するかを保持

2. **AppTarget**
   - 状態: `id`, `title`, `description`, `deepLink`
   - 責務: システムアプリ起動先の定義

3. **SplitLayout**
   - 状態: `aspectRatio(9:16)`, `minRatio(0.2)`, `maxRatio(0.8)`
   - 責務: 画面分割ルールを保証

4. **LaunchPolicy**
   - 状態: `canOpen`, `fallbackMessage`
   - 責務: 起動可否判定と失敗時の説明

5. **UserPreference**
   - 状態: `lastTopTarget`, `lastBottomTarget`, `preferredRatio`
   - 責務: 再起動時の復元

---

## 4) 現在実装（scaffold）への再設計方針

### 現状
- 9:16フレーム + 上下分割 + 20-80%ハンドル調整
- Safari/Maps/Mail/Phone 起動導線

### 追加/改善方針（次の実装フェーズ）
1. **Paneを独立オブジェクト化**
   - 上/下で別々に「最後に選んだ起動先」を保持する。
2. **起動ポリシー導入**
   - `openURL` 失敗時のユーザー向けメッセージ統一。
3. **HIG文言への調整**
   - ボタン文言を動詞起点に統一（例: 「Safariで開く」）。
4. **アクセシビリティ拡張**
   - ハンドルの `accessibilityValue` に現在比率を読み上げさせる。

---

## 5) 仕様テンプレ（今回の対象に合わせた簡易版）

### プロジェクト目的
- iOSで9:16画面を上下分割し、システムアプリへ最短導線で遷移できるツールを提供。

### 成果物
- SwiftUI の独立ツールディレクトリ + Xcode取り込み可能なコード雛形。

### 技術前提
- iOSの制約上、外部アプリUI埋め込みは不可。`openURL` ベース導線を採用。

### 設計原理
- HIG: Clarity / Deference / Depth
- OOUI: Pane, AppTarget, SplitLayout を中心に設計

### 非機能
- 高速起動（初期表示1秒台目標）
- ローカル保存（設定のみ）
- エラー時は「何が起きたか + どうすればよいか」を提示

---

## 6) この資料の使い方
- 実装前レビューで「オブジェクト定義が曖昧でないか」を確認。
- 画面追加時は、先にオブジェクト責務と状態遷移を更新してからUI実装。
- iOS実機検証時に、`openURL` の可否差分（端末設定・権限）を追記する。
