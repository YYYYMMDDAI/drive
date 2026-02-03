# Note Generator

Claude 3.5 Sonnet + DALL·E 3でnote記事・サムネイル・図解を生成するフルスタックアプリの実装サンプルです。

## セットアップ

```bash
cd note-generator
npm install
cp .env.example .env
npm run dev
```

## ディレクトリ構成

- `src/`: React UI
- `api/`: Vercel Functions
- `public/subscribe.html`: Stripe導線（仮）
- `tests/e2e`: Playwright E2E
