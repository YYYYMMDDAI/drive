# SplitEase Web Prototype

SplitEase（スプリットイーズ）の仕様検証向け Web MVP です。  
iOS の同時実行制約を前提に、アプリ内デュアルビュー体験（上部動画/下部ブラウザ or メモ）を再現しています。

## セットアップ

```bash
cd note-generator
npm install
cp .env.example .env
npm run dev
```

## 主な機能（MVP）

- 無料固定プリセット A/B/C
- 上下分割デュアルビュー（ドラッグ比率 20-80%）
- プレミアムアップセル（¥380/月導線）
- ローカルテーマ切替
- ローカル保存ベースの状態管理（`localStorage`）

## テスト

```bash
npm run build
npm run test:e2e
```

> Playwrightブラウザが未インストールの場合は `npx playwright install chromium` が必要です。

## iOS リリース自動化

- ワークフロー: `/.github/workflows/ios_release.yml`
- ガイド: `/SETUP.md`

`ios_release.yml` は **build_ios / upload_to_app_store の2ジョブ構成**で、
main push または手動実行をトリガに、macOS ランナーで IPA 生成→App Store Connect アップロードを行う設計です。

## ディレクトリ構成

- `src/`: React UI
- `api/`: API Functions
- `tests/e2e`: Playwright E2E
