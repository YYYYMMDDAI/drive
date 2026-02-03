# Claude Code用プロンプト: Noteジェネレーターのフルスタック実装

以下は、チャット履歴を基に最適化した実装プロンプトです。Claude Code Webにコピーして実行してください。

---

## プロジェクト概要

Google Apps Scriptを廃止し、Claude Code Web + GitHubで構築されたWebアプリに刷新。note記事作成に特化し、Claude 3.5 Sonnetで本文生成、DALL-E 3で見出し画像（1280x670、サムネイル風）と補完画像（要約/瞬間認知図解）を自動生成。UIはClaude ArtifactsをTTP（徹底模倣: ダークテーマ、タブ切り替え、フェードイン、リアルタイムプレビュー）。マネタイズはStripeで無料プラン（5生成/月）+ 有料プラン（$9.99/月、無制限）。E2EテストはPlaywrightで生成フロー全カバー。デプロイはVercel（自動CI/CD）。

## 技術スタック

- **Frontend**: React + Vite（Artifacts風UI: Tailwind CSS + ガラスモーフィズム）
- **Backend**: Vercel Functions (Node.js)
- **AI**: Anthropic SDK (Claude) + OpenAI SDK (DALL-E 3)
- **マネタイズ**: Stripe SDK
- **テスト**: Playwright
- **デプロイ**: GitHub + Vercel
- **その他**: 環境変数（APIキー管理）、CORS対応

## 機能要件

- **プロンプト入力**: textareaでnoteトピック入力
- **生成フロー**: Claudeで記事本文/要約生成 → DALL-Eで見出し画像/補完画像生成 → リアルタイム表示
- **UI**: 左サイドバー（コマンドセンター）、右メイン（タブ: Article/Thumbnail/Visuals/Summary）
- **プログレス表示**: ツァイガルニク効果（未完了感による注視）
- **マネタイズ**: ユーザー認証（簡易: localStorage）+ Stripe決済ページ
- **セキュリティ**: 入力サニタイズ、APIキー隠蔽
- **アクセシビリティ**: WCAG準拠（aria属性、コントラスト）
- **エラーハンドリング**: API失敗時ユーザー通知
- **イーロン視点最適化**: 効率（自動化）、革新（リアルタイムコラボ）、スケール（サーバーレス）、UX（高速/直感的）

## 実装ステップ

1. GitHubリポジトリ作成（例: `note-generator`）
2. Claude Code Webでプロジェクト初期化
   ```bash
   npm create vite@latest note-generator -- --template react
   ```
3. 依存インストール
   ```bash
   npm install @anthropic-ai/sdk openai stripe @playwright/test
   ```
4. コード実装（以下ファイル作成/編集）
5. 環境変数設定: `.env`ファイル
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
   - `STRIPE_SECRET_KEY`
6. Vercel連携
   ```bash
   vercel --prod
   ```
7. E2Eテスト実行
   ```bash
   npx playwright install
   npm run test:e2e
   ```
8. マネタイズ設定: Stripeダッシュボードでプロダクト作成、`/subscribe`ページ追加
9. GitHub Actionsでデプロイ自動化（Vercel + 環境変数）

## 主要コード例

### package.json

```json
{
  "name": "note-generator",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "vercel --prod",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "vite": "^4.0.0",
    "@anthropic-ai/sdk": "^0.17.1",
    "openai": "^4.0.0",
    "stripe": "^14.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
}
```

### App.jsx

```jsx
import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('article');
  const [isPro, setIsPro] = useState(false); // マネタイズ簡易

  useEffect(() => {
    // 簡易認証チェック
    const proStatus = localStorage.getItem('isPro');
    setIsPro(proStatus === 'true');
  }, []);

  const handleGenerate = async () => {
    if (!isPro /* 無料制限チェック */) {
      return alert('Proプランにアップグレードしてください');
    }
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="app">
      <aside className="command-center">
        <h1>Next Artifacts for note</h1>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="noteの記事トピック..."
        />
        <button onClick={handleGenerate} disabled={loading}>
          生成を開始
        </button>
        {!isPro && (
          <a href="/subscribe">Proにアップグレード ($9.99/月)</a>
        )}
      </aside>
      <main className="artifacts">
        <div className="tabs">
          <button
            onClick={() => setActiveTab('article')}
            className={activeTab === 'article' ? 'active' : ''}
          >
            Article
          </button>
          <button
            onClick={() => setActiveTab('thumbnail')}
            className={activeTab === 'thumbnail' ? 'active' : ''}
          >
            Thumbnail
          </button>
          <button
            onClick={() => setActiveTab('visuals')}
            className={activeTab === 'visuals' ? 'active' : ''}
          >
            Visuals
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={activeTab === 'summary' ? 'active' : ''}
          >
            Summary
          </button>
        </div>
        {loading && <div className="loading">AIがArtifactsを生成中...</div>}
        {result && (
          <div className="content">
            {activeTab === 'article' && <div>{result.text}</div>}
            {activeTab === 'thumbnail' && (
              <img src={result.imageUrl} alt="Thumbnail" />
            )}
            {activeTab === 'visuals' && (
              <img src={result.infographicUrl} alt="Infographic" />
            )}
            {activeTab === 'summary' && <div>{result.summary}</div>}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
```

### api/generate.js (Vercel Function)

```js
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  try {
    // Claudeで記事生成
    const claudeRes = await anthropic.messages.create({
      model: 'claude-3-5-sonnet',
      messages: [
        {
          role: 'user',
          content: `Generate article title, body, and summary for: ${prompt}`
        }
      ],
      max_tokens: 2000
    });

    const text = claudeRes.content[0].text;
    const summary = text.substring(0, 200) + '...';

    // DALL-Eで見出し画像
    const imageRes = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `1280x670 thumbnail for article: ${text}`,
      size: '1792x1024'
    });

    // 補完画像
    const infoRes = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `Infographic summarizing: ${summary}`,
      size: '1024x1024'
    });

    res.status(200).json({
      text,
      summary,
      imageUrl: imageRes.data[0].url,
      infographicUrl: infoRes.data[0].url
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

### E2Eテスト例 (Playwright)

```ts
import { test, expect } from '@playwright/test';

test('Generate note artifacts E2E', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.fill('textarea', 'Test note topic');
  await page.click('button:has-text("生成を開始")');
  await expect(page.locator('.loading')).toBeVisible();
  await expect(page.locator('.content')).toBeVisible();
  await expect(page.locator('img')).toHaveCount(2);
  await page.click('button:has-text("Summary")');
  await expect(page.locator('.content')).toContainText('...');
});
```

### App.css

```css
.app {
  display: flex;
  height: 100vh;
  background: #020617;
  color: #f8fafc;
  font-family: Inter, sans-serif;
}
.command-center {
  width: 30%;
  padding: 2rem;
  border-right: 1px solid #334155;
}
.artifacts {
  width: 70%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.tabs {
  display: flex;
  gap: 2rem;
  padding: 1.5rem;
  border-bottom: 1px solid #1e293b;
}
.tabs button {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
}
.tabs button.active {
  color: #3b82f6;
}
.content {
  padding: 3rem;
  overflow-y: auto;
}
.loading {
  position: absolute;
  inset: 0;
  background: rgba(2, 6, 23, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
```

## 追加指示

- 上記を生成後、Vercelでデプロイ
- Stripe統合は別途実装（`/subscribe`ページ作成）
- テスト失敗時はデバッグ
- イーロン視点: コスト最適化（APIキャッシュ追加）、革新（コラボ機能検討）

## GitHub Actions デプロイフロー（Vercel）

以下のいずれかの方式で自動デプロイを構成する。

### 方式A: Vercel公式GitHub連携（最小構成）

1. VercelダッシュボードでGitHubリポジトリを連携
2. `main`へのpushで自動デプロイ（Preview/Production）
3. Vercel側で環境変数を設定

### 方式B: GitHub Actionsで明示的にデプロイ

1. Vercelでトークン/組織/プロジェクトIDを取得
2. GitHub Secretsに以下を設定
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
3. `.github/workflows/deploy.yml` を追加

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npx vercel pull --yes --environment=production --token=$VERCEL_TOKEN
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      - run: npx vercel build --prod --token=$VERCEL_TOKEN
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      - run: npx vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## Codex内での実装検証（試行手順）

Claude Code Web（Codex）上で以下の順に試行し、問題点を洗い出す。

1. Viteテンプレートの起動確認: `npm run dev`
2. APIモックでUIフロー確認（API実装前にダミー返却）
3. `/api/generate` のローカル動作確認（Vercel dev推奨）
4. Stripeページへの導線・リンク確認（ダミーでも可）
5. PlaywrightでE2Eテスト実行

## 事前に確認しておく問題点チェックリスト

- **APIキーの露出**: フロントで直接呼び出さない
- **CORS**: Vercel Functions経由に統一
- **DALL-Eサイズ**: 1280x670は非対応なので近似サイズを利用
- **Claudeレスポンス形式**: `content[0].text` 取得に注意
- **無料枠制限**: localStorageのみだと改ざんされるため将来はバックエンド保存が必要

---

このプロンプトでClaude Codeに渡せば、すぐに実装開始可能。調整が必要なら指示を。
