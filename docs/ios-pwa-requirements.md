# iOS PWA スタンドアロンモード — 機能要件定義書 v2

## 0. この文書の目的

iPhoneの「ホーム画面に追加」（PWAスタンドアロンモード）で、
**音声認識（STT）と自動コピー（Clipboard）が安定動作する**ためのアーキテクチャ設計と改修計画。

---

## 1. 現状の問題と根本原因

### 1.1 音声認識が動作しない問題

| 項目 | 内容 |
|------|------|
| **症状** | 音声入力を認識できない時がある。1回目・3回目・4回目など不安定 |
| **根本原因** | **Web Speech API（SpeechRecognition）はiOS PWAスタンドアロンモードで動作しない** |
| **WebKitバグ** | [Bug 225298](https://bugs.webkit.org/show_bug.cgi?id=225298) — "Speech recognition service is not available" |
| **詳細** | Safari ブラウザ内では動作するが、「ホーム画面に追加」で起動するWKWebViewでは、マイク権限の確認画面すら表示されずにエラーになる |
| **確認情報源** | Apple Developer Forums、react-speech-recognition Issue #104、MDN dom-examples Issue #219 |

### 1.2 自動コピーが動作しない問題

| 項目 | 内容 |
|------|------|
| **症状** | 自動コピーONでもクリップボードにコピーされない |
| **根本原因1** | iOS PWAスタンドアロンモードでは `navigator.clipboard` が `undefined` になる場合がある |
| **根本原因2** | ユーザージェスチャーから非同期処理を挟むと `NotAllowedError` が発生 |
| **確認情報源** | Apple Developer Forums、Wolfgang Rittner記事、SiteLint記事 |

### 1.3 まとめ — Safari vs PWAスタンドアロンのAPI差異

| API | Safari ブラウザ | PWA スタンドアロン |
|-----|---------------|-------------------|
| `SpeechRecognition` | ✅ 動作（iOS 14.5+） | ❌ **動作しない** |
| `getUserMedia` | ✅ 動作 | ✅ **動作する** |
| `navigator.clipboard` | ✅ 動作 | ⚠️ **undefinedの場合あり** |
| `document.execCommand('copy')` | ✅ 動作 | ✅ **動作する**（ジェスチャー内） |
| `MediaRecorder` | ✅ 動作 | ✅ **動作する** |
| Push Notifications | ❌ | ✅ iOS 16.4+ |

**重要な発見**: `getUserMedia`（マイクアクセス）はPWAで動作する。動作しないのは`SpeechRecognition`だけ。
→ マイクで音声を取得して、**別の方法で文字起こし**すれば解決可能。

---

## 2. 解決アーキテクチャ

### 2.1 音声認識（STT）の新方式

**現在**: Web Speech API（ブラウザ内蔵） ← PWAで動作しない
**新方式**: `getUserMedia` + 外部STTサービス

#### 選択肢の比較

| 方式 | 精度 | コスト | オフライン | 遅延 | 実装難度 |
|------|------|--------|-----------|------|---------|
| **A. Web Speech API (現行)** | ◎ | 無料 | × | リアルタイム | 済 |
| **B. Whisper API (OpenAI)** | ◎ | $0.006/分 | × | 1-3秒 | 中 |
| **C. Google Cloud STT** | ◎ | $0.006/15秒 | × | リアルタイム | 中 |
| **D. Deepgram** | ◎ | 無料枠あり | × | リアルタイム | 中 |
| **E. Whisper.cpp (WASM)** | ○ | 無料 | ✅ | 3-10秒 | 高 |
| **F. Transformers.js (Whisper)** | ○ | 無料 | ✅ | 5-15秒 | 高 |

#### 推奨アプローチ: **ハイブリッド方式**

```
┌─────────────────────────────────────────────────┐
│              アプリ起動時の判定                     │
│                                                   │
│  SpeechRecognition が使える？                      │
│    ├── YES (Safari ブラウザ / Chrome / デスクトップ)  │
│    │   → 従来通り Web Speech API を使用             │
│    │                                               │
│    └── NO (iOS PWA スタンドアロン等)                 │
│        → getUserMedia + 外部STT を使用              │
│        → 選択肢B〜Fのいずれかを利用                  │
└─────────────────────────────────────────────────┘
```

**推奨: 選択肢B（Whisper API）**
- 理由: 高精度、多言語対応、シンプルなREST API、個人利用なら月額微小
- 代替: 無料にこだわるなら選択肢E（Whisper.cpp WASM）だが、iOSでのメモリ制約あり

### 2.2 クリップボードの新方式

**3段階フォールバック戦略:**

```
1. ClipboardItem + Promise<Blob>    ← Safari 16.4+ (現行実装)
   ↓ 失敗時
2. navigator.clipboard.writeText()  ← 基本的なClipboard API
   ↓ 失敗 or undefined時
3. document.execCommand('copy')     ← レガシーだが最も確実
   + textarea (opacity:0, position:fixed, top:0, left:0)
   + setSelectionRange(0, 99999)
```

**iOS PWA固有の注意点:**
- textareaを`left: -9999px`にしてはダメ → `opacity: 0; position: fixed; top: 0; left: 0`
- `select()` と `setSelectionRange(0, 99999)` を**両方**呼ぶ
- ジェスチャーハンドラから**同期的**に呼ぶ

---

## 3. ファイル構成（改修後）

### 3.1 現在のファイル構成

```
drive/
├── index.html          ← メインHTML
├── app.js              ← 全ロジック（793行の単一ファイル）
├── style.css           ← スタイル
├── sw.js               ← Service Worker
├── manifest.json       ← PWA設定
├── docs/
│   └── requirements.md ← MVP要件定義
└── icons/              ← アイコン群
```

### 3.2 改修後のファイル構成（推奨）

```
drive/
├── index.html              ← メインHTML（変更なし）
├── style.css               ← スタイル（変更なし）
├── manifest.json           ← PWA設定（変更なし）
├── sw.js                   ← Service Worker（STT API キャッシュ除外追加）
│
├── js/
│   ├── app.js              ← メインエントリ（初期化・イベントバインド）
│   ├── platform.js         ← プラットフォーム検出・定数定義
│   ├── stt-web-speech.js   ← Web Speech API による STT（従来方式）
│   ├── stt-whisper.js      ← Whisper API による STT（PWA用）
│   ├── stt-manager.js      ← STTの抽象化層（使用する方式を自動選択）
│   ├── clipboard.js        ← クリップボード操作（3段階フォールバック）
│   ├── translation.js      ← 翻訳ロジック（MyMemory API）
│   ├── history.js          ← 履歴管理（localStorage）
│   └── ui.js               ← UI操作（トースト、状態表示等）
│
├── docs/
│   ├── requirements.md         ← MVP要件定義（既存）
│   └── ios-pwa-requirements.md ← 本ドキュメント
│
└── icons/                  ← アイコン群（変更なし）
```

### 3.3 ファイル分割の根拠

| 現状の問題 | 改修方針 |
|-----------|---------|
| app.js が793行の単一ファイルで、STT・クリップボード・翻訳・履歴・UIが混在 | 関心事ごとにモジュール分割し、テスト・保守を容易にする |
| STT方式の切り替えが困難（Web Speech APIのコードが全体に散在） | `stt-manager.js` で抽象化し、方式を差し替え可能にする |
| iOS固有のハックが各所に点在 | プラットフォーム判定とフォールバックを明確に分離 |

---

## 4. 技術要件

### 4.1 言語・技術スタック

| レイヤー | 技術 | 変更 |
|---------|------|------|
| **フロントエンド** | HTML5 / CSS3 / JavaScript (ES6+ Modules) | Vanilla JS維持。ESモジュール化 |
| **音声認識（メイン）** | Web Speech API | 変更なし（Safari/Chromeで使用） |
| **音声認識（PWA用）** | getUserMedia + Whisper API (OpenAI) | **新規追加** |
| **音声録音** | MediaRecorder API | **新規追加**（PWAモード時のみ） |
| **翻訳** | MyMemory API | 変更なし |
| **クリップボード** | Clipboard API + execCommand フォールバック | 強化 |
| **ストレージ** | localStorage | 変更なし |
| **Service Worker** | Cache-first | 微修正 |
| **デスクトップ** | Electron | 変更なし |

### 4.2 ESモジュール vs 現行スクリプト

現行は `<script src="app.js">` で単一ファイルを読み込み。

**改修オプション:**

| 方式 | メリット | デメリット |
|------|---------|-----------|
| **A. ESモジュール (`type="module"`)** | 標準的、import/export | Service Workerキャッシュ対象増加 |
| **B. バンドラー (Vite等)** | 高機能、最適化 | ビルドステップ追加、複雑化 |
| **C. 単一ファイル維持 + IIFE分割** | シンプル、変更最小 | ファイルが長くなる |

**推奨: A. ESモジュール**
- ビルドステップ不要（Vanilla JS方針維持）
- `<script type="module" src="js/app.js">` で読み込み
- 各ファイルが `export` / `import` で依存関係を明示
- 全主要ブラウザ（iOS Safari 含む）でサポート済み

### 4.3 Whisper API 利用時の構成

```
ユーザーのタップ
    ↓
getUserMedia({ audio: true })  ← マイク取得（PWAでも動作）
    ↓
MediaRecorder で録音
    ↓
停止 → Blob (audio/webm or audio/mp4)
    ↓
fetch("https://api.openai.com/v1/audio/transcriptions", {
  method: "POST",
  headers: { Authorization: "Bearer <API_KEY>" },
  body: formData  // file: blob, model: "whisper-1", language: "ja"
})
    ↓
レスポンス → { text: "認識されたテキスト" }
    ↓
翻訳 → クリップボードコピー
```

**APIキーの管理:**
- 個人利用のため、`localStorage` に保存（設定画面から入力）
- セキュリティ上、公開サーバーにデプロイしない前提
- 将来的には環境変数やプロキシサーバー経由に変更可能

---

## 5. 機能要件（改修内容）

### 5.1 音声認識の改修

| # | 要件 | 詳細 |
|---|------|------|
| S1 | PWA検出 | `window.navigator.standalone === true` または `display-mode: standalone` を検出 |
| S2 | STT方式自動選択 | PWAスタンドアロン → Whisper API / Safari ブラウザ → Web Speech API |
| S3 | SpeechRecognition可用性チェック | `new SpeechRecognition()` を `try-catch` し、PWAで例外が出たらWhisper方式にフォールバック |
| S4 | getUserMedia録音 | MediaRecorder APIで音声をBlob化。形式: `audio/webm`（Safariは `audio/mp4`） |
| S5 | Whisper API連携 | OpenAI Whisper APIに録音データを送信し、テキストを取得 |
| S6 | リアルタイム表示 | Whisper方式では「録音中...」→「文字起こし中...」→ 結果表示 の3段階UI |
| S7 | APIキー設定画面 | 設定セクションにOpenAI APIキー入力欄を追加（localStorageに保存） |
| S8 | エラーハンドリング | APIキー未設定 / ネットワークエラー / 無音検出 に対する適切なメッセージ |

### 5.2 クリップボードの改修

| # | 要件 | 詳細 |
|---|------|------|
| C1 | 3段階フォールバック | ClipboardItem → writeText → execCommand の順で試行 |
| C2 | iOS PWA用textarea修正 | `opacity:0; position:fixed; top:0; left:0`（`left:-9999px` は不可） |
| C3 | 選択範囲の確実な設定 | `select()` + `setSelectionRange(0, 99999)` の両方を呼ぶ |
| C4 | ジェスチャーコンテキスト維持 | 停止ボタンのタップからクリップボード操作まで `await` を挟まない |
| C5 | コピー結果の通知 | 成功/失敗をトーストで明示 |

### 5.3 UI/UXの改修

| # | 要件 | 詳細 |
|---|------|------|
| U1 | 録音状態の明確化 | 「録音中...」「文字起こし中...」「翻訳中...」の3段階表示（Whisper方式時） |
| U2 | API設定セクション | ヘッダーまたはフッターに設定アイコン追加。Whisper APIキー入力 |
| U3 | PWAモード表示 | デバッグ用に現在の動作モード（Web Speech / Whisper）を表示可能に |
| U4 | エラー表示の改善 | 「音声認識サービスに接続できません」→ 具体的な原因と対処法を表示 |

---

## 6. STT Manager — 抽象化設計

```javascript
// stt-manager.js — STTの抽象化層

class STTManager {
  constructor() {
    this.provider = null;  // 'web-speech' or 'whisper'
    this.onResult = null;  // callback(text, isFinal)
    this.onError = null;   // callback(error)
    this.onStateChange = null; // callback(state) — 'idle'|'listening'|'processing'
  }

  async init() {
    // 1. Web Speech APIの可用性チェック
    if (this.canUseWebSpeech()) {
      this.provider = 'web-speech';
    }
    // 2. Whisper APIキーの有無チェック
    else if (this.hasWhisperKey()) {
      this.provider = 'whisper';
    }
    else {
      throw new Error('利用可能な音声認識サービスがありません');
    }
  }

  canUseWebSpeech() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) return false;
    // PWAスタンドアロンモードではWeb Speech APIが動作しない
    if (isPWAStandalone && isIOS) return false;
    return true;
  }

  start(lang) { /* プロバイダーに委譲 */ }
  stop() { /* プロバイダーに委譲 */ }
}
```

---

## 7. 改修フェーズ計画

### Phase 1: ファイル分割 + クリップボード修正（影響範囲: 小）

| タスク | 内容 |
|--------|------|
| 1-1 | `app.js` を `js/` 配下に機能別に分割 |
| 1-2 | ESモジュール化（`import` / `export`） |
| 1-3 | クリップボード3段階フォールバック実装 |
| 1-4 | `index.html` の `<script>` タグ変更 |
| 1-5 | Service Worker のキャッシュ対象更新 |
| 1-6 | 既存テスト（test.html）の更新 |

### Phase 2: Whisper API STT 追加（影響範囲: 中）

| タスク | 内容 |
|--------|------|
| 2-1 | `stt-whisper.js` — getUserMedia + MediaRecorder 実装 |
| 2-2 | `stt-manager.js` — STT抽象化層の実装 |
| 2-3 | Whisper API呼び出し実装 |
| 2-4 | APIキー設定UIの追加 |
| 2-5 | 録音中/文字起こし中のUI状態管理 |
| 2-6 | エラーハンドリング（キー未設定、ネットワーク、無音） |

### Phase 3: テスト・検証（影響範囲: なし）

| タスク | 内容 |
|--------|------|
| 3-1 | Safari ブラウザでWeb Speech API方式の動作確認 |
| 3-2 | iOS PWAスタンドアロンでWhisper方式の動作確認 |
| 3-3 | デスクトップ（Chrome/Electron）での回帰テスト |
| 3-4 | 自動コピーの全パターンテスト |
| 3-5 | test.html のテストケース追加 |

---

## 8. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| Whisper APIのコスト | 月額数百円（個人利用なら微小） | 使用量モニタリング。代替: Whisper.cpp WASM |
| APIキーの露出 | クライアント側に保存 | 個人利用前提。公開しない。将来: プロキシ経由 |
| MediaRecorderの音声形式 | Safari: mp4 / Chrome: webm | `isTypeSupported()` でフォーマット自動判定 |
| iOS Safari のアップデートでWeb Speech APIがPWAで動くようになる可能性 | STT Manager が自動でWeb Speech APIを使う | `canUseWebSpeech()` で正しく検出される設計 |
| Whisper APIのレスポンス遅延 | 1-3秒の遅延 | 「文字起こし中...」UIで待機状態を明示 |

---

## 9. 判断が必要な項目

以下はユーザー（開発者）の判断を仰ぐ必要がある：

1. **STT方式の選択**: Whisper API（有料・高精度）vs Whisper.cpp WASM（無料・やや遅い・iOSメモリ制約）
2. **ファイル分割の実施**: 即座にモジュール分割するか、まず単一ファイルのまま機能追加するか
3. **リアルタイム表示**: Whisper方式では録音完了後にまとめて結果表示になる。これは許容できるか？
4. **APIキーの管理方法**: localStorage直接保存で問題ないか？
5. **Electron版への影響**: Electron版もモジュール分割に追従するか？

---

## 10. 参考情報源

- [WebKit Bug 225298 — Speech recognition not available](https://bugs.webkit.org/show_bug.cgi?id=225298)
- [Apple Developer Forums — webkitSpeechRecognition in PWA](https://developer.apple.com/forums/thread/748048)
- [react-speech-recognition Issue #104 — PWA on iOS](https://github.com/JamesBrill/react-speech-recognition/issues/104)
- [PWA-POLICE/pwa-bugs](https://github.com/PWA-POLICE/pwa-bugs)
- [Taming the Web Speech API — Andrea Giammarchi](https://webreflection.medium.com/taming-the-web-speech-api-ef64f5a245e1)
- [PWA on iOS Limitations 2025 — Brainhub](https://brainhub.eu/library/pwa-on-ios)
- [iOS PWA Compatibility — firt.dev](https://firt.dev/notes/pwa-ios/)
- [How to use Clipboard API in Safari async — Wolfgang Rittner](https://wolfgangrittner.dev/how-to-use-clipboard-api-in-safari/)
- [OpenAI Whisper API Documentation](https://platform.openai.com/docs/guides/speech-to-text)
- [Whisper.cpp WASM demo](https://ggml.ai/whisper.cpp/)
- [Transformers.js — Hugging Face](https://github.com/huggingface/transformers.js)
