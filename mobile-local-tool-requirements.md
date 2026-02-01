# モバイルローカルツール要件定義書

## 概要

iPhone および Galaxy Z Fold 7 のような折りたたみ端末で動作する、アプリ内ローカル環境ツールの最低限のUI・動作環境要件を定義する。

---

## 1. ターゲットデバイス

### 1.1 対応端末

| カテゴリ | 端末例 | 画面サイズ |
|---------|--------|-----------|
| iPhone 標準 | iPhone 15/16 | 390×844 pt |
| iPhone Plus/Max | iPhone 15 Pro Max | 430×932 pt |
| iPhone SE | iPhone SE 3rd | 375×667 pt |
| 折りたたみ（閉） | Galaxy Z Fold 7 | 約375×750 dp |
| 折りたたみ（開） | Galaxy Z Fold 7 | 約900×750 dp（横長） |
| iPad mini | iPad mini 6th | 744×1133 pt |

### 1.2 画面モード対応

```
┌─────────────────────────────────────────────────────────┐
│  通常モード          折りたたみ展開        分割表示      │
│  ┌─────┐            ┌───────────┐       ┌─────┬─────┐  │
│  │     │            │           │       │     │     │  │
│  │     │            │           │       │     │     │  │
│  │     │            │           │       │     │     │  │
│  └─────┘            └───────────┘       └─────┴─────┘  │
│  ~390px             ~900px              ~450px x 2     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 技術スタック（必須）

### 2.1 コア技術

| 技術 | 用途 | 必須度 |
|-----|------|-------|
| HTML5 | 構造 | 必須 |
| CSS3 (カスタムプロパティ) | スタイリング | 必須 |
| Vanilla JavaScript (ES6+) | ロジック | 必須 |
| LocalStorage / IndexedDB | データ永続化 | 必須 |
| Service Worker | オフライン対応 | 推奨 |
| Web App Manifest | PWA化 | 推奨 |

### 2.2 禁止事項

- 外部CDNへの依存（オフライン動作不可）
- 重量級フレームワーク（React, Vue, Angular）
- サーバーサイド処理への依存
- 外部API呼び出し（初期版）

### 2.3 推奨API

```javascript
// ファイル操作
FileReader API          // 画像・ファイル読み込み
File System Access API  // 将来的なファイル保存（Safari未対応注意）

// グラフィック
Canvas 2D API          // 画像処理
WebGL / Three.js       // 3D表示（オプション）

// ストレージ
localStorage           // 軽量データ（~5MB）
IndexedDB             // 大容量データ（画像など）

// PWA
Service Worker        // オフラインキャッシュ
Cache API             // リソースキャッシュ

// デバイス
Screen Orientation API // 画面回転検知
matchMedia            // 画面サイズ検知
prefers-color-scheme  // ダークモード検知
```

---

## 3. UI要件

### 3.1 レイアウト原則

#### ブレークポイント

```css
/* モバイル（デフォルト）*/
/* 0 - 599px */

/* 折りたたみ展開・タブレット */
@media (min-width: 600px) { }

/* デスクトップ */
@media (min-width: 1024px) { }

/* 折りたたみ端末検知（将来） */
@media (horizontal-viewport-segments: 2) { }
@media (vertical-viewport-segments: 2) { }
```

#### CSS Container Queries（推奨）

```css
.tool-container {
  container-type: inline-size;
}

@container (min-width: 500px) {
  .tool-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
```

### 3.2 タッチ操作要件

| 要素 | 最小サイズ | 理由 |
|-----|----------|------|
| ボタン | 44×44 pt | Apple HIG 準拠 |
| タップ領域 | 48×48 dp | Material Design 準拠 |
| 入力フィールド高さ | 44pt 以上 | タップ精度確保 |
| 要素間スペース | 8pt 以上 | 誤タップ防止 |

### 3.3 ジェスチャー対応

```javascript
// 必須対応
- タップ (click/touch)
- スワイプ (touchstart/touchmove/touchend)
- ロングプレス (touchstart + setTimeout)

// 推奨対応
- ピンチズーム (touch with 2 fingers)
- ダブルタップ (dblclick)
```

### 3.4 最低限のUIコンポーネント

```
┌────────────────────────────────────────┐
│ [Header]                               │
│  ロゴ / タイトル        [≡] メニュー   │
├────────────────────────────────────────┤
│ [Main Content Area]                    │
│                                        │
│  ツール固有のコンテンツ                │
│                                        │
│  - 入力エリア                          │
│  - プレビューエリア                    │
│  - コントロールパネル                  │
│                                        │
├────────────────────────────────────────┤
│ [Action Bar / Footer]                  │
│  [Primary Action]  [Secondary Action]  │
└────────────────────────────────────────┘
```

---

## 4. オフライン動作要件

### 4.1 Service Worker 構成

```javascript
// sw.js - 最小構成
const CACHE_NAME = 'tool-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/app.css',
  '/app.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// インストール時にキャッシュ
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

// オフライン時はキャッシュから返す
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request)
      .then(res => res || fetch(e.request))
  );
});
```

### 4.2 Web App Manifest

```json
{
  "name": "ツール名",
  "short_name": "ツール",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0f",
  "theme_color": "#6b5b95",
  "orientation": "any",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## 5. データ永続化要件

### 5.1 ストレージ戦略

| データ種別 | 推奨ストレージ | 容量目安 |
|-----------|--------------|---------|
| 設定・プリファレンス | localStorage | < 100KB |
| テキストデータ | localStorage | < 1MB |
| 画像データ | IndexedDB | < 50MB |
| キャッシュ | Cache API | < 100MB |

### 5.2 IndexedDB 基本構造

```javascript
// データベース初期化
const dbPromise = indexedDB.open('ToolDB', 1);

dbPromise.onupgradeneeded = (e) => {
  const db = e.target.result;

  // オブジェクトストア作成
  if (!db.objectStoreNames.contains('items')) {
    const store = db.createObjectStore('items', { keyPath: 'id' });
    store.createIndex('createdAt', 'createdAt');
  }
};
```

---

## 6. パフォーマンス要件

### 6.1 目標値

| 指標 | 目標 | 測定方法 |
|-----|------|---------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3.0s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| JavaScript Bundle | < 100KB | 圧縮後 |
| 初期HTMLサイズ | < 50KB | gzip後 |
| メモリ使用量 | < 100MB | DevTools |

### 6.2 画像処理最適化

```javascript
// Canvas処理の最大サイズ制限
const MAX_CANVAS_SIZE = 1024; // モバイルでは800推奨

function resizeIfNeeded(img) {
  const scale = Math.min(
    MAX_CANVAS_SIZE / img.width,
    MAX_CANVAS_SIZE / img.height,
    1
  );
  return {
    width: img.width * scale,
    height: img.height * scale
  };
}

// 出力品質設定
canvas.toDataURL('image/jpeg', 0.8); // 80%品質
canvas.toDataURL('image/webp', 0.85); // WebP対応時
```

---

## 7. セキュリティ要件

### 7.1 必須対策

| 項目 | 対策 |
|-----|------|
| XSS防止 | innerHTML使用時のサニタイズ |
| CSP | Content-Security-Policy ヘッダー設定 |
| HTTPS | 本番環境では必須 |
| 入力検証 | ファイルタイプ・サイズの検証 |

### 7.2 推奨CSPヘッダー

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'unsafe-inline';
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: blob:;">
```

---

## 8. 折りたたみ端末対応

### 8.1 画面分割検知

```javascript
// 画面セグメント検知（Chromium系）
if ('getWindowSegments' in visualViewport) {
  const segments = visualViewport.getWindowSegments();
  if (segments.length > 1) {
    // 折りたたみ展開状態
    enableDualPaneLayout();
  }
}

// メディアクエリでの検知（将来標準）
const foldQuery = window.matchMedia('(horizontal-viewport-segments: 2)');
foldQuery.addEventListener('change', (e) => {
  if (e.matches) {
    // 水平に2分割された状態
  }
});
```

### 8.2 デュアルペインレイアウト

```css
/* 折りたたみ展開時の2ペイン表示 */
@media (min-width: 600px) {
  .dual-pane-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .pane-left {
    /* 入力・編集エリア */
  }

  .pane-right {
    /* プレビュー・結果エリア */
  }
}
```

---

## 9. アクセシビリティ要件

### 9.1 必須対応

```html
<!-- セマンティックHTML -->
<main role="main">
<nav role="navigation">
<button aria-label="メニューを開く">

<!-- フォーカス管理 -->
<button tabindex="0">
<input aria-describedby="hint-text">

<!-- 色コントラスト -->
/* WCAG AA準拠: 4.5:1以上 */
```

### 9.2 ダークモード対応

```css
:root {
  /* ライトモード */
  --bg-primary: #ffffff;
  --text-primary: #1a1a1a;
  --accent: #6b5b95;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #0a0a0f;
    --text-primary: #e8e8ed;
    --accent: #8b7bb5;
  }
}
```

---

## 10. 最低限の実装チェックリスト

### Phase 1: 基本構造（必須）

- [ ] 単一HTMLファイル構成
- [ ] viewport メタタグ設定
- [ ] モバイルファーストCSS
- [ ] タッチフレンドリーなボタンサイズ (44pt+)
- [ ] LocalStorage によるデータ保存
- [ ] ダークモード対応

### Phase 2: PWA化（推奨）

- [ ] Service Worker 実装
- [ ] Web App Manifest 作成
- [ ] オフライン動作確認
- [ ] ホーム画面追加対応
- [ ] アプリアイコン作成 (192x192, 512x512)

### Phase 3: 折りたたみ対応（オプション）

- [ ] 画面サイズ変更検知
- [ ] デュアルペインレイアウト
- [ ] 画面回転対応
- [ ] 分割表示モード対応

---

## 11. ファイル構成テンプレート

### 11.1 単一ファイル構成（推奨・初期）

```
tool.html          # 全てを含む単一ファイル
```

### 11.2 PWA構成（推奨・発展）

```
/
├── index.html     # メインHTML
├── app.css        # スタイル
├── app.js         # ロジック
├── sw.js          # Service Worker
├── manifest.json  # PWAマニフェスト
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## 12. 参考リソース

### ドキュメント
- [Apple Human Interface Guidelines - iOS](https://developer.apple.com/design/human-interface-guidelines/ios)
- [Material Design 3](https://m3.material.io/)
- [Foldables and large screens - Android Developers](https://developer.android.com/guide/topics/large-screens)
- [PWA - web.dev](https://web.dev/progressive-web-apps/)

### 既存実装参考
- `fff.html` - Canvas API画像処理、ギャラリー機能
- `todo.html` - CRUD操作、フィルタリング、ダークモード

---

## 更新履歴

| 日付 | バージョン | 変更内容 |
|-----|-----------|---------|
| 2026-02-01 | 1.0.0 | 初版作成 |
