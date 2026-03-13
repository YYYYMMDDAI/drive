# SplitEase Xcodeセットアップガイド

## 前提条件

- Mac（macOS 14以上推奨）
- Xcode 17以上
- Apple Developer Program加入（年額 ¥12,800）

## 手順1: Xcodeプロジェクト作成

1. Xcodeを開く
2. 「File」→「New」→「Project」
3. 「iOS」→「App」を選択 →「Next」
4. 以下を入力：

| 項目 | 値 |
|------|-----|
| Product Name | SplitEase |
| Team | あなたのDeveloper Team |
| Organization Identifier | com.splitease |
| Interface | SwiftUI |
| Language | Swift |
| Storage | Core Data（チェックを入れる） |

5. 「Next」→ 保存先を選択 →「Create」

## 手順2: ソースコードをコピー

このリポジトリの `SplitEase/Sources/` 内のファイルを、
Xcodeプロジェクトの対応する場所にドラッグ&ドロップ：

```
Xcodeプロジェクト/
├── SplitEase/
│   ├── SplitEaseApp.swift     ← Sources/App/ から
│   ├── Views/                 ← Sources/Views/ から全ファイル
│   │   ├── DualView.swift
│   │   ├── WebPane.swift
│   │   ├── MemoPane.swift
│   │   ├── EmptyPane.swift
│   │   ├── DividerHandle.swift
│   │   ├── PresetListView.swift
│   │   ├── SettingsView.swift
│   │   └── OnboardingView.swift
│   ├── ViewModels/            ← Sources/ViewModels/ から
│   │   ├── DualViewModel.swift
│   │   └── PresetViewModel.swift
│   ├── Models/                ← Sources/Models/ から
│   │   ├── Preset.swift
│   │   └── PersistenceController.swift
│   └── Services/              ← Sources/Services/ から
│       ├── WebViewPool.swift
│       ├── IAPManager.swift
│       └── BatteryManager.swift
```

## 手順3: Core Dataモデル作成

1. Xcodeで「File」→「New」→「File」
2. 「Data Model」を選択 →「SplitEaseModel」と命名
3. エンティティを追加：

**PairEntity:**

| Attribute | Type |
|-----------|------|
| id | UUID |
| name | String |
| topURL | String |
| bottomURL | String |
| presetDescription | String |
| isDefault | Boolean |
| createdAt | Date |

## 手順4: Info.plist設定

`Resources/Info.plist` の内容をXcodeプロジェクトのInfo.plistにマージ。
特に重要：
- `NSAppTransportSecurity` → WebView用
- `NSPrivacyTracking` → プライバシー設定

## 手順5: ローカライズ設定

1. 「Project Settings」→「Info」→「Localizations」
2. 「Japanese」を追加
3. `Resources/Localizable.strings` をプロジェクトに追加

## 手順6: ビルド・実行

1. 左上でシミュレータを選択（iPhone 15推奨）
2. `Cmd + R` でビルド・実行
3. オンボーディング画面が表示されれば成功

## 手順7: App Store Connect設定

### IAP製品登録
1. App Store Connect → アプリ → 「アプリ内課金」
2. 以下を登録：

| 製品ID | タイプ | 価格 |
|--------|--------|------|
| com.splitease.premium.monthly | 自動更新サブスクリプション | ¥380/月 |
| com.splitease.premium.yearly | 自動更新サブスクリプション | ¥3,000/年 |

### プライバシーラベル
App Store Connectの「Appのプライバシー」：
- データ収集: **なし**（ローカル完結のため）

## 手順8: GitHub Actions CI/CD

### Secretsの設定

GitHubリポジトリの Settings → Secrets and variables → Actions で以下を登録：

| Secret名 | 内容 |
|-----------|------|
| APPLE_CERTIFICATE_BASE64 | .p12証明書のBase64 |
| APPLE_CERTIFICATE_PASSWORD | 証明書のパスワード |
| APPLE_PROVISIONING_PROFILE_BASE64 | プロファイルのBase64 |
| APPLE_TEAM_ID | Apple Team ID |
| APPLE_ID | Apple ID メールアドレス |
| APPLE_APP_SPECIFIC_PASSWORD | アプリ用パスワード |

### 証明書のBase64変換
```bash
base64 -i Certificates.p12 | pbcopy
```

### プロファイルのBase64変換
```bash
base64 -i SplitEase.mobileprovision | pbcopy
```

## テスト実行

```bash
# ユニットテスト
xcodebuild test -scheme SplitEase -destination 'platform=iOS Simulator,name=iPhone 15'

# UIテスト
xcodebuild test -scheme SplitEase -destination 'platform=iOS Simulator,name=iPhone 15' -only-testing:SplitEaseUITests
```

## TestFlight配信

1. Xcode → Product → Archive
2. Organizer → Distribute App → App Store Connect
3. App Store Connectでテスターを招待
