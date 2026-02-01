# モバイルローカルツール要件定義書

## 概要

iPhone 13〜17 シリーズで動作する、アプリ内ローカル環境ツールの最低限のUI・動作環境要件を定義する。

---

## 1. ターゲットデバイス

### 1.1 対応端末

| モデル | 画面サイズ (pt) | 解像度 (px) | 特記事項 |
|-------|---------------|-------------|----------|
| iPhone 13 mini | 375×812 | 1125×2436 | 5.4インチ |
| iPhone 13 / 14 | 390×844 | 1170×2532 | 6.1インチ |
| iPhone 13 Pro / 14 Pro | 393×852 | 1179×2556 | Dynamic Island |
| iPhone 14 Plus | 428×926 | 1284×2778 | 6.7インチ |
| iPhone 14 Pro Max | 430×932 | 1290×2796 | Dynamic Island |
| iPhone 15 / 16 | 393×852 | 1179×2556 | Dynamic Island |
| iPhone 15 Pro / 16 Pro | 393×852 | 1179×2556 | ProMotion 120Hz |
| iPhone 15 Pro Max / 16 Pro Max | 430×932 | 1290×2796 | ProMotion 120Hz |
| iPhone 17（想定） | 393〜430×852〜932 | - | 将来対応 |

### 1.2 画面サイズ範囲

```
最小幅: 375pt (iPhone 13 mini)
標準幅: 393pt (iPhone 15/16)
最大幅: 430pt (Pro Max)

高さ範囲: 812pt 〜 932pt
```

### 1.3 Safe Area 対応

```
┌─────────────────────────────────┐
│▓▓▓▓▓▓▓ Dynamic Island ▓▓▓▓▓▓▓│ ← 59pt (14 Pro以降)
├─────────────────────────────────┤
│                                 │
│                                 │
│      コンテンツエリア           │
│                                 │
│                                 │
├─────────────────────────────────┤
│         Home Indicator          │ ← 34pt
└─────────────────────────────────┘

/* CSS Safe Area対応 */
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
```

---

## 2. 技術スタック

### 2.1 コア技術（必須）

| 技術 | 用途 | 対応iOS |
|-----|------|--------|
| HTML5 | 構造 | 15.0+ |
| CSS3 (カスタムプロパティ) | スタイリング | 15.0+ |
| Vanilla JavaScript (ES6+) | ロジック | 15.0+ |
| LocalStorage / IndexedDB | データ永続化 | 15.0+ |
| Service Worker | オフライン対応 | 15.0+ |
| Web App Manifest | PWA化 | 15.0+ |

### 2.2 iOS Safari 対応バージョン

| iPhone | 最低iOS | Safari バージョン |
|--------|---------|------------------|
| iPhone 13 | iOS 15.0 | Safari 15 |
| iPhone 14 | iOS 16.0 | Safari 16 |
| iPhone 15 | iOS 17.0 | Safari 17 |
| iPhone 16 | iOS 18.0 | Safari 18 |
| iPhone 17 | iOS 19.0+ | Safari 19+ |

**最低動作要件: iOS 15.0 / Safari 15**

### 2.3 禁止事項

- 外部CDNへの依存（オフライン動作不可）
- 重量級フレームワーク（React, Vue, Angular）
- サーバーサイド処理への依存
- 外部API呼び出し（初期版）
- WebKit非対応のAPI使用

### 2.4 推奨API

```javascript
// ファイル操作
FileReader API          // 画像・ファイル読み込み ✅ iOS 15+
// ※ File System Access API は Safari 未対応

// グラフィック
Canvas 2D API          // 画像処理 ✅ iOS 15+
WebGL 2.0              // 3D表示 ✅ iOS 15+

// ストレージ
localStorage           // 軽量データ（~5MB）✅ iOS 15+
IndexedDB             // 大容量データ ✅ iOS 15+

// PWA
Service Worker        // オフラインキャッシュ ✅ iOS 15+
Cache API             // リソースキャッシュ ✅ iOS 15+

// デバイス
matchMedia            // 画面サイズ検知 ✅ iOS 15+
prefers-color-scheme  // ダークモード検知 ✅ iOS 15+
DeviceOrientationEvent // 画面回転検知 ✅ iOS 15+

// iOS 16+ 推奨
Web Push Notifications // プッシュ通知 ✅ iOS 16.4+
Container Queries      // コンテナクエリ ✅ iOS 16+
```

---

## 3. UI要件

### 3.1 レイアウト原則

#### viewport 設定（必須）

```html
<meta name="viewport"
      content="width=device-width, initial-scale=1.0,
               viewport-fit=cover, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

#### ブレークポイント（iPhone専用）

```css
/* iPhone 13 mini（最小） */
/* 375px - デフォルト */

/* iPhone 13/14/15/16 標準 */
@media (min-width: 390px) { }

/* iPhone Plus / Pro Max */
@media (min-width: 428px) { }

/* 横向き（ランドスケープ） */
@media (orientation: landscape) { }
```

### 3.2 タッチ操作要件（Apple HIG準拠）

| 要素 | 最小サイズ | 推奨サイズ |
|-----|----------|----------|
| タップターゲット | 44×44 pt | 48×48 pt |
| ボタン高さ | 44 pt | 50 pt |
| 入力フィールド高さ | 44 pt | 48 pt |
| 要素間スペース | 8 pt | 12 pt |
| リスト行高さ | 44 pt | 56 pt |

### 3.3 ジェスチャー対応

```javascript
// 必須対応
- タップ (touchend / click)
- スワイプ (touchstart → touchmove → touchend)
- ロングプレス (touchstart + 500ms delay)

// 推奨対応
- ピンチズーム (gesturestart/gesturechange/gestureend)
- ダブルタップ (300ms内の連続タップ検知)
- エッジスワイプ (画面端からのスワイプ ※ネイティブと競合注意)
```

### 3.4 基本UIレイアウト

```
┌─────────────────────────────────┐
│░░░░░░░░ Safe Area Top ░░░░░░░░│
├─────────────────────────────────┤
│ [Header Bar]           44pt    │
│  タイトル          [Action]    │
├─────────────────────────────────┤
│                                 │
│ [Main Content Area]             │
│                                 │
│  スクロール可能なコンテンツ     │
│                                 │
│  - 入力エリア                   │
│  - プレビューエリア             │
│  - コントロール                 │
│                                 │
├─────────────────────────────────┤
│ [Bottom Action Bar]    56pt    │
│  [Primary]  [Secondary]        │
├─────────────────────────────────┤
│░░░░░░ Safe Area Bottom ░░░░░░░│
└─────────────────────────────────┘
```

### 3.5 iOS ネイティブ風スタイリング

```css
/* システムフォント */
font-family: -apple-system, BlinkMacSystemFont,
             'SF Pro Text', 'SF Pro Display', sans-serif;

/* iOS標準の角丸 */
border-radius: 12px;  /* カード */
border-radius: 10px;  /* ボタン */
border-radius: 8px;   /* 入力フィールド */

/* ぼかし効果（iOS風） */
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);

/* バウンススクロール */
-webkit-overflow-scrolling: touch;
overscroll-behavior: contain;

/* タップハイライト無効化 */
-webkit-tap-highlight-color: transparent;

/* テキスト選択カスタマイズ */
-webkit-user-select: none;
user-select: none;
```

---

## 4. オフライン動作要件

### 4.1 Service Worker 構成

```javascript
// sw.js
const CACHE_NAME = 'ios-tool-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request)
      .then(res => res || fetch(e.request))
  );
});
```

### 4.2 Web App Manifest（iOS対応）

```json
{
  "name": "ツール名",
  "short_name": "ツール",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-180.png", "sizes": "180x180", "type": "image/png" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 4.3 iOS専用メタタグ

```html
<!-- ホーム画面追加時のアイコン -->
<link rel="apple-touch-icon" href="/icons/icon-180.png">

<!-- スプラッシュスクリーン -->
<link rel="apple-touch-startup-image" href="/splash.png">

<!-- ステータスバー -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

<!-- アプリタイトル -->
<meta name="apple-mobile-web-app-title" content="ツール名">
```

---

## 5. データ永続化要件

### 5.1 ストレージ戦略

| データ種別 | 推奨ストレージ | 容量目安 |
|-----------|--------------|---------|
| 設定・プリファレンス | localStorage | < 100KB |
| テキストデータ | localStorage | < 1MB |
| 画像データ | IndexedDB | < 50MB |
| キャッシュ | Cache API | < 50MB |

**注意**: iOS Safari では、7日間未使用のサイトのストレージが削除される可能性あり（PWAとしてホーム画面に追加すれば回避可能）

### 5.2 IndexedDB 基本構造

```javascript
class StorageManager {
  constructor(dbName = 'ToolDB', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('items')) {
          const store = db.createObjectStore('items', { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async save(item) {
    const tx = this.db.transaction('items', 'readwrite');
    tx.objectStore('items').put(item);
    return tx.complete;
  }

  async getAll() {
    const tx = this.db.transaction('items', 'readonly');
    return tx.objectStore('items').getAll();
  }
}
```

---

## 6. パフォーマンス要件

### 6.1 目標値

| 指標 | 目標 | 備考 |
|-----|------|-----|
| First Contentful Paint | < 1.0s | iOS Safari |
| Time to Interactive | < 2.0s | iOS Safari |
| Largest Contentful Paint | < 2.0s | iOS Safari |
| Total Bundle Size | < 100KB | gzip後 |
| メモリ使用量 | < 150MB | Safari制限考慮 |
| 60fps維持 | 必須 | スクロール・アニメーション |

### 6.2 最適化テクニック

```javascript
// 画像処理の最大サイズ制限（iPhone向け）
const MAX_CANVAS_SIZE = 2048; // iPhone は 4096 まで対応
const RECOMMENDED_SIZE = 1024; // パフォーマンス考慮

// WebP 出力（iOS 14+対応）
canvas.toDataURL('image/webp', 0.85);

// 遅延読み込み
const img = new Image();
img.loading = 'lazy';

// requestAnimationFrame 活用
function animate() {
  // アニメーション処理
  requestAnimationFrame(animate);
}

// Passive Event Listener（スクロール性能向上）
element.addEventListener('touchstart', handler, { passive: true });
```

---

## 7. セキュリティ要件

### 7.1 必須対策

| 項目 | 対策 |
|-----|------|
| XSS防止 | innerHTML使用時のサニタイズ、textContent推奨 |
| CSP | Content-Security-Policy メタタグ設定 |
| HTTPS | 本番環境では必須（PWA要件） |
| 入力検証 | ファイルタイプ・サイズの検証 |

### 7.2 推奨CSPヘッダー

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'unsafe-inline';
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: blob:;
               connect-src 'self';">
```

---

## 8. アクセシビリティ要件

### 8.1 VoiceOver対応（必須）

```html
<!-- セマンティックHTML -->
<main role="main">
<nav role="navigation">
<button aria-label="メニューを開く">

<!-- 動的コンテンツ通知 -->
<div aria-live="polite" aria-atomic="true">

<!-- フォーカス管理 -->
<button tabindex="0">
<input aria-describedby="hint-text">
```

### 8.2 Dynamic Type対応

```css
/* iOS Dynamic Type対応 */
font: -apple-system-body;

/* または相対単位使用 */
font-size: 1rem;  /* 16px基準 */
line-height: 1.5;

/* 最小・最大サイズ制限 */
font-size: clamp(14px, 1rem, 24px);
```

### 8.3 ダークモード対応

```css
:root {
  color-scheme: light dark;

  /* ライトモード */
  --bg-primary: #ffffff;
  --bg-secondary: #f2f2f7;
  --text-primary: #000000;
  --text-secondary: #3c3c43;
  --separator: rgba(60, 60, 67, 0.29);
  --accent: #007aff;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #000000;
    --bg-secondary: #1c1c1e;
    --text-primary: #ffffff;
    --text-secondary: #ebebf5;
    --separator: rgba(84, 84, 88, 0.65);
    --accent: #0a84ff;
  }
}
```

---

## 9. 最低限の実装チェックリスト

### Phase 1: 基本構造（必須）

- [ ] viewport + Safe Area メタタグ設定
- [ ] iOS システムフォント使用
- [ ] タッチターゲット 44pt 以上
- [ ] Safe Area 対応（env()）
- [ ] ダークモード対応
- [ ] LocalStorage によるデータ保存
- [ ] VoiceOver 基本対応

### Phase 2: PWA化（推奨）

- [ ] Service Worker 実装
- [ ] Web App Manifest 作成
- [ ] apple-touch-icon 設定
- [ ] オフライン動作確認
- [ ] ホーム画面追加テスト

### Phase 3: 最適化（推奨）

- [ ] 60fps スクロール確認
- [ ] メモリ使用量 < 150MB
- [ ] Passive Event Listener 適用
- [ ] 画像遅延読み込み

---

## 10. ファイル構成テンプレート

### 10.1 単一ファイル構成（開発初期）

```
tool.html          # 全てを含む単一ファイル
```

### 10.2 PWA構成（本番推奨）

```
/
├── index.html
├── manifest.json
├── sw.js
└── icons/
    ├── icon-180.png   # iOS用
    ├── icon-192.png   # Android/PWA用
    └── icon-512.png   # スプラッシュ用
```

---

## 11. テスト環境

### 11.1 実機テスト（推奨）

| デバイス | 優先度 |
|---------|-------|
| iPhone 15 / 16 | 高（標準サイズ） |
| iPhone 15 Pro Max | 高（最大サイズ） |
| iPhone 13 mini | 中（最小サイズ） |
| iPhone 14 | 中（Dynamic Island無し） |

### 11.2 シミュレータテスト

```bash
# Xcode Simulator 起動
open -a Simulator

# Safari Web Inspector でデバッグ
# Safari → 開発 → シミュレータ → ページ選択
```

---

## 12. 参考リソース

### Apple 公式ドキュメント
- [Human Interface Guidelines - iOS](https://developer.apple.com/design/human-interface-guidelines/ios)
- [Safari Web Content Guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/)
- [Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)

### Web標準
- [PWA - web.dev](https://web.dev/progressive-web-apps/)
- [CSS env() - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/env)

---

## 更新履歴

| 日付 | バージョン | 変更内容 |
|-----|-----------|---------|
| 2026-02-01 | 1.0.0 | 初版作成 |
| 2026-02-01 | 1.1.0 | iPhone 13〜17 特化版に更新 |
