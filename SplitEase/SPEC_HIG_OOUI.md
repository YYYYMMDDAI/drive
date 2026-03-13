# SplitEase 設計仕様書（HIG/OOUI準拠）

> **最終更新**: 2026-02-06
> **設計原則**: Apple HIG + OOUI（オブジェクト指向UI）
> **参照文献**:
> - [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
> - [ソシオメディア オブジェクト指向UIデザイン](https://www.sociomedia.co.jp/10046)
> - [技術評論社 OOUI書籍](https://gihyo.jp/book/2020/978-4-297-11351-3)

---

## 1. プロジェクト目的

### 解決したい具体的課題

iPhoneは画面分割（Split View）に対応していないため、動画を見ながらSNSをチェックしたり、資料を見ながらメモを取るといった**ながら作業**ができない。Galaxy Z Foldのような折りたたみスマホを持たないユーザーにとって、この制約は日常的なストレスとなっている。

### 対象ユーザー

| 属性 | 詳細 |
|------|------|
| 年齢層 | 20〜40代（通勤・在宅ワーク・学習中心） |
| 地域 | 日本在住 |
| デバイス | iPhone 13〜17（iOS 16+） |
| 行動パターン | 電車内でYouTube+X、勉強中に講義動画+メモ |

### 価値仮説（他と何が違うか）

| 観点 | 競合（ブラウザタブ切替等） | SplitEase |
|------|---------------------------|-----------|
| 操作 | タブ切替が必要 | 同時表示・タップ不要 |
| プライバシー | サーバー経由 | 完全ローカル完結 |
| 起動 | ブラウザ経由 | Share Sheet/Shortcut即起動 |
| 学習コスト | 高い | Nani風シンプルUI |

---

## 2. 成果物の定義

### 最終成果

- [x] プロトタイプ
- [x] 実運用可能アプリ
- [x] **ストア公開まで含む（App Store）**

### 対応プラットフォーム

- [ ] Web
- [ ] PWA
- [x] **iOSネイティブ（SwiftUI）**
- [ ] Android

---

## 3. 技術選択の前提条件

### 処理場所

| 処理 | 場所 | 理由 |
|------|------|------|
| UI描画 | 端末内 | SwiftUI |
| データ保存 | 端末内 | Core Data（プライバシー最優先） |
| Web表示 | 端末内 | WKWebView |
| AI提案（将来） | 端末内 | MLKit（サーバー送信なし） |

### 想定データサイズ・負荷

| 項目 | 想定値 |
|------|--------|
| カスタムプリセット数 | 最大50件（Premium） |
| メモデータ | 最大10MB/件 |
| キャッシュ | 自動管理（URLCache） |
| 同時WebView数 | 最大2（プール再利用） |

### iOS/ブラウザ制約

| 制約 | 詳細 | 対策 |
|------|------|------|
| **WKWebView メモリ** | 可変（デバイスRAM・負荷依存）。超過時は白画面（アプリ終了なし） | WebViewプール（2個固定）、再利用、`webViewWebContentProcessDidTerminate`対応 |
| **X-Frame-Options** | Google/Facebook/Twitter等はiframe拒否 | ユーザーへの注意表示（「一部サイトは表示不可」） |
| **低電力モード** | リフレッシュレート・バックグラウンド制限 | `ProcessInfo.isLowPowerModeEnabled`検知、通知表示 |
| **Safari Extension上限** | 6MB（iOS 15.0）→ 80MB（iOS 15.1+） | 本アプリはExtensionではないため影響なし |

> **参照**: [WKWebView memory budget | Apple Developer Forums](https://developer.apple.com/forums/thread/133449)

### 外部API/SDK使用可否

| SDK | 使用 | 理由 |
|-----|------|------|
| StoreKit 2 | ○ | IAP（月額/年額サブスク） |
| Core Data | ○ | ローカルDB |
| WKWebView | ○ | Web表示 |
| MLKit | △（将来） | ローカルAI提案 |
| AdMob | ✕ | 広告なし（プライバシー重視） |
| Firebase | ✕ | サーバー不使用 |

---

## 4. 設計原理（必須参照ドキュメント）

### UI設計: Apple HIG 4原則

| 原則 | 日本語 | SplitEaseでの適用 |
|------|--------|-------------------|
| **Clarity** | 明瞭性 | 分割画面は2パネルのみ。混乱を防ぐため要素を最小限に |
| **Consistency** | 一貫性 | 標準UIコンポーネント使用（NavigationStack, List, Sheet） |
| **Deference** | 控えめさ | UIはコンテンツ（WebView）を引き立てる。分割バーは最小限 |
| **Depth** | 深み | Sheet/モーダルで階層表現。レイヤー感のある分割バー |

> **Liquid Glass（2025）**: iOS 26以降の透明感・流動性を意識。`ultraThinMaterial`活用。

> **参照**: [iOS App Design Guidelines for 2025](https://tapptitude.com/blog/i-os-app-design-guidelines-for-2025)

### UI設計: OOUI原則

#### タスク指向 vs オブジェクト指向

| 比較 | タスク指向（動詞先行） | OOUI（名詞先行） |
|------|----------------------|------------------|
| 操作順 | 「送る」→「相手を選ぶ」 | 「相手を選ぶ」→「送る」 |
| 画面数 | 多い（タスクごとに画面） | 少ない（オブジェクトごと） |
| 自由度 | 低い（手順固定） | 高い（ユーザーに委ねる） |

#### SplitEaseはOOUIを採用

理由：
- **オブジェクト（ペア/プリセット）を先に選択** → アクション（表示/編集/削除）を後から選択
- ユーザーが「どのペアで作業するか」を起点に操作
- 画面数を最小化し、直感的な操作を実現

> **参照**: [OOUI（オブジェクト指向UI）とは？ | ニジボックス](https://blog.nijibox.jp/article/ooui/)

### UX方針

| 項目 | 選択 | 理由 |
|------|------|------|
| タスク/オブジェクト | **オブジェクト指向** | 「ペア」を中心に設計 |
| 初回体験 | オンボーディング3画面 | 価値訴求（分割、ドラッグ、プライバシー） |
| エラー表示 | インライン＋Banner | 非破壊的、タスク中断を避ける |
| フィードバック | ハプティクス＋視覚 | 分割バー操作時に触覚フィードバック |

### アクセシビリティ要件

| 機能 | 対応 | 詳細 |
|------|------|------|
| **Dynamic Type** | ○ | 12段階（xSmall〜AX5）対応 |
| **VoiceOver** | ○ | 全UI要素に`accessibilityLabel`/`accessibilityHint` |
| **コントラスト** | ○ | 4.5:1以上（WCAG AA準拠） |
| **Reduce Motion** | ○ | アニメーション無効化オプション |
| **タッチターゲット** | ○ | 最小44×44pt |

> **参照**: [iOS Accessibility Guidelines: Best Practices for 2025](https://medium.com/@david-auerbach/ios-accessibility-guidelines-best-practices-for-2025-6ed0d256200e)

---

## 5. ドメインモデル定義（OOUI）

### Core Objects（名詞）

```
┌─────────────────────────────────────────────────────────────┐
│                      Domain Model                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐       ┌─────────────┐                     │
│  │   Preset    │◆─────▶│    Pane     │                     │
│  │  (ペア)     │  has   │  (パネル)   │                     │
│  └─────────────┘       └─────────────┘                     │
│        │                     │                              │
│        │ 1:*                 │ 1:1                          │
│        ▼                     ▼                              │
│  ┌─────────────┐       ┌─────────────┐                     │
│  │    User     │       │  Content    │                     │
│  │ (ユーザー)  │       │ (コンテンツ)│                     │
│  └─────────────┘       └─────────────┘                     │
│                              │                              │
│                              │ enum                         │
│                              ▼                              │
│                 ┌──────┬──────┬──────┐                     │
│                 │ Web  │ Memo │Empty │                     │
│                 └──────┴──────┴──────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 各オブジェクトの責務

#### Preset（ペア）- **中心オブジェクト**

| 属性 | 型 | 説明 |
|------|-----|------|
| id | UUID | 一意識別子 |
| name | String | 表示名（例: "A: 動画 + SNS"） |
| description | String | 説明文 |
| topURL | String | 上パネルのURL |
| bottomURL | String | 下パネルのURL（空=メモ） |
| isDefault | Bool | デフォルトプリセットか |
| createdAt | Date | 作成日時 |

| 責務 |
|------|
| 上下パネルの構成を定義 |
| デフォルト/カスタムの区別 |
| 永続化（Core Data） |

#### Pane（パネル）

| 属性 | 型 | 説明 |
|------|-----|------|
| content | PaneContent | Web/Memo/Empty |
| ratio | CGFloat | 占有比率（0.15〜0.85） |

| 責務 |
|------|
| コンテンツの表示 |
| サイズの管理 |

#### User（暗黙）

| 属性 | 型 | 説明 |
|------|-----|------|
| isPremium | Bool | プレミアムユーザーか |
| hasCompletedOnboarding | Bool | オンボーディング完了 |
| presets | [Preset] | 保存プリセット |

| 責務 |
|------|
| サブスクリプション状態管理 |
| 設定の永続化（AppStorage） |

---

## 6. 画面構成と遷移（OOUI視点）

### 画面一覧（責務ベース）

| 画面 | 責務 | 中心オブジェクト |
|------|------|-----------------|
| **OnboardingView** | 初回価値訴求 | - |
| **DualView** | 分割表示・操作 | Pane × 2 |
| **PresetListView** | ペア選択・管理 | Preset |
| **AddPresetView** | ペア作成 | Preset (new) |
| **SettingsView** | アプリ設定・課金 | User |

### ナビゲーション構造

```
┌─────────────────────────────────────────────────────────────┐
│                   Navigation Structure                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [App Launch]                                               │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────┐  firstTime  ┌─────────────┐              │
│  │ AppStorage  │────────────▶│ Onboarding  │              │
│  │ check       │             │ (3 pages)   │              │
│  └─────────────┘             └──────┬──────┘              │
│       │ returning                   │ complete             │
│       ▼                             ▼                       │
│  ┌─────────────────────────────────────┐                   │
│  │            DualView                  │ ← メイン画面      │
│  │  ┌─────────┐  ┌─────────┐          │                   │
│  │  │ TopPane │  │  Bottom │          │                   │
│  │  └─────────┘  │  Pane   │          │                   │
│  │  ═══════════  └─────────┘          │                   │
│  └─────────────────────────────────────┘                   │
│       │                  │                                  │
│       │ .sheet           │ .sheet                           │
│       ▼                  ▼                                  │
│  ┌──────────┐      ┌──────────┐                            │
│  │ Preset   │      │ Settings │                            │
│  │ List     │      │ View     │                            │
│  └────┬─────┘      └──────────┘                            │
│       │ .sheet                                              │
│       ▼                                                     │
│  ┌──────────┐                                              │
│  │ Add      │                                              │
│  │ Preset   │                                              │
│  └──────────┘                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 統合・分離の判断基準

| 判断 | 基準 |
|------|------|
| **統合** | 同一オブジェクトに対する複数アクション → 1画面 |
| **分離** | 異なるオブジェクト → Sheet/別画面 |
| **モーダル** | 集中すべきタスク（作成/編集） |
| **インライン** | 軽量な確認/切替 |

---

## 7. 非機能要件

### パフォーマンス基準

| 指標 | 基準値 | 計測方法 |
|------|--------|----------|
| 起動時間 | < 1.5秒 | Instruments |
| 画面遷移 | < 0.3秒 | - |
| WebView読込 | < 3秒（Wi-Fi） | URLSession metrics |
| メモリ上限 | < 120MB（アプリ本体） | Instruments |
| 分割バー応答 | < 16ms（60fps） | CADisplayLink |

### オフライン対応

| 機能 | オフライン時 |
|------|-------------|
| アプリ起動 | ○ |
| プリセット選択 | ○ |
| Web表示 | △（キャッシュ済みのみ） |
| メモ入力 | ○ |
| 課金確認 | △（StoreKit entitlement） |

### セキュリティ・プライバシー方針

| 項目 | 方針 |
|------|------|
| データ収集 | **ゼロ**（Appプライバシーレポート準拠） |
| 外部送信 | **なし** |
| WebView | 非永続データストア使用 |
| IAP | Keychain暗号化 |
| クラッシュログ | 送信なし（将来opt-in検討） |

### ログ・エラーハンドリング方針

| 種別 | 対応 |
|------|------|
| デバッグログ | `#if DEBUG`で出力、Release無効 |
| WebViewエラー | インラインメッセージ（非アラート） |
| 課金エラー | アラート + 復元誘導 |
| クラッシュ | `webViewWebContentProcessDidTerminate`対応 |

---

## 8. リリース・運用

### CI/CD自動化

| フロー | ツール | 自動化 |
|--------|--------|--------|
| ビルド | GitHub Actions (macOS) | ○ |
| ユニットテスト | XCTest | ○ |
| UIテスト | XCUITest | ○ |
| App Store Connect | altool | ○ |
| TestFlight配信 | GitHub Actions | ○ |

### ストア提出フロー

```
develop → feature branch → PR → main merge
    ↓
GitHub Actions: Build + Test
    ↓
Archive + Export IPA
    ↓
altool: App Store Connect アップロード
    ↓
TestFlight 自動配信
    ↓
App Store 審査提出（手動トリガー）
```

### 初期リリース時に「捨てる機能」

| 機能 | 状態 | 理由 |
|------|------|------|
| ローカルAI提案 | 保留 | MLKit統合は複雑、MVP不要 |
| テーマカスタム | 保留 | Premium差別化は後回し |
| Share Sheet統合 | v1.1 | 基本機能優先 |
| Widget | v1.2 | 優先度低 |
| iPad対応 | v2.0 | iPhone優先 |

---

## 9. 人間の判断ポイント（AIに任せない）

### UXの違和感判定

- [ ] 分割バーのドラッグ感触は自然か？（実機テスト必須）
- [ ] オンボーディングの文言は伝わるか？
- [ ] プリセット名は直感的か？
- [ ] メモリ不足時の白画面は許容できるか？

### 競合との差別化判断

- [ ] 「プライバシー完結」は訴求力があるか？
- [ ] 無料3プリセット → Premiumの変換率は妥当か？
- [ ] 価格（¥380/月）は日本市場で受け入れられるか？

### リリース可否の最終決定

- [ ] TestFlightでの実機テスト完了
- [ ] クラッシュ率 < 1%
- [ ] App Store審査ガイドライン遵守確認
- [ ] プライバシーラベル正確性確認

---

## 付録: OOUI設計チェックリスト

### オブジェクト抽出

- [x] 中心オブジェクトは「Preset（ペア）」
- [x] アクションは「選択」「作成」「削除」「適用」
- [x] タスク指向でないことを確認（「動画を見る」→ではなく「ペアを選ぶ」→）

### ビューとナビゲーション

- [x] オブジェクト一覧 → 詳細 → アクションの流れ
- [x] 画面数は最小限（5画面）
- [x] モーダルは集中タスクのみ

### レイアウトパターン

- [x] List（PresetList）：オブジェクト一覧
- [x] Detail（DualView）：オブジェクト操作
- [x] Form（AddPreset）：オブジェクト作成
- [x] Settings：ユーザー設定

---

## 参照文献

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [iOS App Design Guidelines for 2025](https://tapptitude.com/blog/i-os-app-design-guidelines-for-2025)
- [ソシオメディア オブジェクト指向UIデザイン](https://www.sociomedia.co.jp/10046)
- [OOUI（オブジェクト指向UI）とは？ | ニジボックス](https://blog.nijibox.jp/article/ooui/)
- [オブジェクト指向UIデザイン | 技術評論社](https://gihyo.jp/book/2020/978-4-297-11351-3)
- [WKWebView memory budget | Apple Developer Forums](https://developer.apple.com/forums/thread/133449)
- [iOS Accessibility Guidelines: Best Practices for 2025](https://medium.com/@david-auerbach/ios-accessibility-guidelines-best-practices-for-2025-6ed0d256200e)
- [Why Is WKWebView So Heavy | Embrace](https://embrace.io/blog/wkwebview-memory-leaks/)
