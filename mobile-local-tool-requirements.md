# モバイルローカルツール要件定義書

## 概要

iPhone 13〜17 シリーズで、LTE/4G/5G 環境下において**端末標準機能のように動作する**ローカルツールの要件を定義する。

**想定利用**: 開発者個人による利用（App Store公開は想定しない）

### 設計原則

```
┌───────────────────────────────────────────┐
│              設計の基本方針               │
├───────────────────────────────────────────┤
│  1. オフラインファースト - 完全ローカル動作│
│  2. 即時起動 - ネイティブ同等の体験       │
│  3. 最小構成 - 必要な機能のみ実装         │
│  4. 自己完結 - 外部サービス依存なし       │
└───────────────────────────────────────────┘
```

---

## 1. ターゲットデバイス

### 1.1 対応端末

| モデル | 画面サイズ (pt) | 通信規格 |
|-------|---------------|----------|
| iPhone 13 mini | 375×812 | 5G/LTE |
| iPhone 13/14/15/16 | 390〜393×844〜852 | 5G/LTE |
| iPhone 14/15/16 Pro Max | 430×932 | 5G/LTE |
| iPhone 17（想定） | 393〜430×852〜932 | 5G |

### 1.2 画面サイズ範囲

```
最小幅: 375pt
標準幅: 393pt
最大幅: 430pt
```

### 1.3 Safe Area

```
┌─────────────────────────────────┐
│▓▓▓▓▓▓▓ Dynamic Island ▓▓▓▓▓▓▓│ ← 59pt
├─────────────────────────────────┤
│      コンテンツエリア           │
├─────────────────────────────────┤
│         Home Indicator          │ ← 34pt
└─────────────────────────────────┘
```

---

## 2. 技術スタック

### 2.1 必須技術

| 技術 | 用途 |
|-----|------|
| HTML5 | 構造 |
| CSS3 | スタイリング |
| Vanilla JavaScript | ロジック |
| LocalStorage | 設定保存 |
| IndexedDB | データ永続化 |
| Service Worker | オフライン対応 |

### 2.2 対応iOS

**最低要件: iOS 15.0+**（iPhone 13以降の初期OS）

### 2.3 禁止事項

- 外部CDN/ライブラリへの依存
- サーバーサイド処理
- 外部API呼び出し
- 重量級フレームワーク

---

## 3. ネイティブ体験

### 3.1 PWA設定（最小構成）

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport"
        content="width=device-width, initial-scale=1.0,
                 viewport-fit=cover, user-scalable=no">

  <!-- PWA必須設定 -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="ツール名">
  <link rel="apple-touch-icon" href="icon-180.png">
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#000000">
</head>
```

### 3.2 manifest.json（最小構成）

```json
{
  "name": "ツール名",
  "short_name": "ツール",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    { "src": "icon-180.png", "sizes": "180x180", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 3.3 Service Worker（最小構成）

```javascript
// sw.js
const CACHE_NAME = 'tool-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-512.png'
];

// インストール時にキャッシュ
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 古いキャッシュ削除
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// オフライン対応
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request))
  );
});
```

### 3.4 Service Worker 登録

```javascript
// index.html 内
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
```

---

## 4. ネットワーク対応

### 4.1 オンライン/オフライン検知（シンプル版）

```javascript
// ネットワーク状態管理
const network = {
  isOnline: navigator.onLine,

  init() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateUI();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateUI();
    });
  },

  updateUI() {
    const indicator = document.getElementById('network-status');
    if (indicator) {
      indicator.textContent = this.isOnline ? '' : 'オフライン';
      indicator.hidden = this.isOnline;
    }
  }
};

network.init();
```

### 4.2 ネットワークステータス表示（最小UI）

```html
<div id="network-status" hidden
     style="position:fixed; top:env(safe-area-inset-top);
            left:0; right:0; background:#ff3b30; color:#fff;
            text-align:center; padding:4px; font-size:12px; z-index:9999;">
  オフライン
</div>
```

---

## 5. データ永続化

### 5.1 ストレージ選択

| データ種別 | ストレージ | 容量目安 |
|-----------|----------|---------|
| 設定値 | localStorage | < 1MB |
| コンテンツ | IndexedDB | < 50MB |

### 5.2 localStorage 使用例

```javascript
// 設定の保存・読み込み
const settings = {
  save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  load(key, defaultValue = null) {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  }
};
```

### 5.3 IndexedDB 使用例（シンプル版）

```javascript
class SimpleDB {
  constructor(name = 'ToolDB') {
    this.name = name;
    this.db = null;
  }

  async open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.name, 1);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore('data', { keyPath: 'id' });
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async put(item) {
    const tx = this.db.transaction('data', 'readwrite');
    tx.objectStore('data').put(item);
  }

  async get(id) {
    return new Promise((resolve) => {
      const tx = this.db.transaction('data', 'readonly');
      const req = tx.objectStore('data').get(id);
      req.onsuccess = () => resolve(req.result);
    });
  }

  async getAll() {
    return new Promise((resolve) => {
      const tx = this.db.transaction('data', 'readonly');
      const req = tx.objectStore('data').getAll();
      req.onsuccess = () => resolve(req.result);
    });
  }

  async delete(id) {
    const tx = this.db.transaction('data', 'readwrite');
    tx.objectStore('data').delete(id);
  }
}
```

---

## 6. UI要件

### 6.1 CSS基本設定

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);

  /* Safe Area対応 */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);

  /* タッチ最適化 */
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
  -webkit-overflow-scrolling: touch;
}
```

### 6.2 カラーテーマ（ダークモード対応）

```css
:root {
  color-scheme: light dark;

  --bg-primary: #ffffff;
  --bg-secondary: #f2f2f7;
  --text-primary: #000000;
  --text-secondary: #666666;
  --accent: #007aff;
  --border: rgba(0, 0, 0, 0.1);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #000000;
    --bg-secondary: #1c1c1e;
    --text-primary: #ffffff;
    --text-secondary: #999999;
    --accent: #0a84ff;
    --border: rgba(255, 255, 255, 0.1);
  }
}
```

### 6.3 タッチターゲット

```css
/* ボタン・タップ可能要素は最低44pt */
button, .tappable {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
  border-radius: 10px;
}
```

### 6.4 基本レイアウト

```css
.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app-header {
  flex-shrink: 0;
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
}

.app-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.app-footer {
  flex-shrink: 0;
  padding: 8px 16px;
  border-top: 1px solid var(--border);
}
```

---

## 7. 実装チェックリスト

### 必須項目

- [ ] viewport + Safe Area メタタグ
- [ ] PWA メタタグ（apple-mobile-web-app-*）
- [ ] manifest.json
- [ ] Service Worker（オフライン対応）
- [ ] アイコン（180px, 512px）
- [ ] ダークモード対応
- [ ] タッチターゲット 44pt 以上
- [ ] ローカルストレージによるデータ保存

### 推奨項目

- [ ] オフライン状態表示
- [ ] スプラッシュスクリーン画像

---

## 8. ファイル構成（最小構成）

```
/
├── index.html      # メインHTML（CSS/JS埋め込み可）
├── manifest.json   # PWAマニフェスト
├── sw.js           # Service Worker
├── icon-180.png    # iOS用アイコン
└── icon-512.png    # PWA用アイコン
```

### 単一ファイル構成（開発初期向け）

```
tool.html           # 全てを含む単一ファイル
                    # ※manifest.json とアイコンは別途必要
```

---

## 9. テスト方法

### 9.1 ローカル開発サーバー

```bash
# Python
python3 -m http.server 8080

# Node.js (npx)
npx serve

# macOS
open http://localhost:8080
```

### 9.2 iPhoneでのテスト

1. Mac と iPhone を同一ネットワークに接続
2. `http://<MacのIPアドレス>:8080` にアクセス
3. Safari の「共有」→「ホーム画面に追加」
4. ホーム画面からアプリとして起動

### 9.3 オフラインテスト

1. ホーム画面に追加した状態で起動
2. 機内モードをON
3. アプリが正常に動作することを確認

---

## 10. 運用

### 10.1 アップデート方法

1. `sw.js` の `CACHE_NAME` を更新（例: `tool-v2`）
2. ファイルをサーバーに配置
3. アプリを開くと自動更新

### 10.2 キャッシュクリア

開発中にキャッシュをクリアしたい場合:
- Safari → 設定 → Webサイトデータを消去
- または開発者ツールから Service Worker を削除

---

## 更新履歴

| 日付 | バージョン | 変更内容 |
|-----|-----------|---------|
| 2026-02-01 | 1.0.0 | 初版作成 |
| 2026-02-01 | 1.1.0 | iPhone 13〜17 特化版 |
| 2026-02-01 | 2.0.0 | ネットワーク対応追加 |
| 2026-02-01 | 2.1.0 | 開発者個人利用向けに簡素化 |
