# SplitEase リリース準備ガイド（このリポジトリ向け）

このリポジトリでは、**現環境で実行可能な範囲（Web MVP + E2E + CI/CD定義）**までを対象にしています。  
Xcode 実機ビルドや TestFlight 提出は macOS + Apple Developer Program が必要なため、ここでは手順のみ定義します。

## 1. GitHub Secrets を登録

`Settings -> Secrets and variables -> Actions` に以下を追加します。

- `APPLE_CERTIFICATE_BASE64`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_PROVISIONING_PROFILE_BASE64`
- `APPLE_TEAM_ID`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`

## 2. iOS プロジェクトを配置（Macで実施）

GitHub Actions の `ios_release.yml` は以下を前提にしています。

- `ios/SplitEase.xcodeproj`
- `ios/ExportOptions.plist`
- Scheme: `SplitEase`

必要に応じて `.github/workflows/ios_release.yml` の環境変数を変更してください。

## 3. ワークフロー起動条件

- `main` ブランチへの push
- `workflow_dispatch`（手動実行）

実行時は次の2ジョブです。

1. `build_ios`（archive + ipa生成）
2. `upload_to_app_store`（App Store Connectへアップロード）

## 4. 現環境で完了できる検証

以下は Linux CI/ローカルでも検証可能です。

- Web プロトタイプのビルド (`npm run build`)
- Playwright E2E（ブラウザ実体がある環境）

## 5. 現環境では未実施（Mac必須）

- Xcode 17 でのプロジェクト作成と署名設定
- iOS Simulator / 実機動作確認
- TestFlight 配布
- App Store 審査提出

