# iOS PWA スタンドアロンモード — 機能要件定義書 v3

## 0. この文書の目的

iPhoneの「ホーム画面に追加」（PWAスタンドアロンモード）で、
**音声認識（STT）と自動コピー（Clipboard）が安定動作する**ためのアーキテクチャ設計と改修記録。

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

**重要な発見**: `getUserMedia`（マイクアクセス）はPWAで動作する。動作しないのは`SpeechRecognition`だけ。
→ マイクで音声を取得して、**ローカルWASM STTで文字起こし**すれば解決可能。

---

## 2. 実装済みアーキテクチャ

### 2.1 音声認識（STT）— ハイブリッド方式

```
┌─────────────────────────────────────────────────┐
│              アプリ起動時の判定                     │
│                                                   │
│  iOS PWAスタンドアロン？ or SpeechRecognition未対応？│
│    ├── YES → Whisper WASM (Transformers.js)       │
│    │   getUserMedia + MediaRecorder + VAD          │
│    │   → ローカルWhisper推論 → テキスト表示          │
│    │                                               │
│    └── NO → Web Speech API (従来方式)              │
│        リアルタイム逐次表示                          │
└─────────────────────────────────────────────────┘
```

**採用方式: Whisper.cpp WASM (Transformers.js経由)**
- 無料・ローカル処理（APIキー不要）
- セキュリティリスク低減（音声データが外部に送信されない）
- Transformers.js v3 (ONNX Runtime WASM) で Xenova/whisper-tiny モデルを使用
- 初回利用時にモデルをCDNからダウンロード（~40MB）、IndexedDBにキャッシュ

### 2.2 VAD（Voice Activity Detection）

- Web Audio API の AnalyserNode で音声レベルをリアルタイム検出
- 音声レベルの視覚的フィードバック（レベルインジケーター）
- 発話検出後、2秒間の無音で自動録音停止
- マイクボタンの発光パターンで発話中を視覚的に表示

### 2.3 セキュリティ対策

| 対策 | 内容 |
|------|------|
| **CSP** | Content-Security-Policy メタタグで script-src, connect-src 等を制限 |
| **入力サニタイズ** | `sanitizeText()` で制御文字を除去。全出力に `textContent` 使用（XSS防止） |
| **CDNスクリプト制限** | CSPで cdn.jsdelivr.net のみ許可 |
| **Electron CSP** | `onHeadersReceived` でレスポンスヘッダーにCSP追加 |
| **ローカル処理** | 音声データは外部サーバーに送信しない（Whisper WASMでローカル推論） |
| **モデル検証** | `env.allowLocalModels = false` でリモートの検証済みモデルのみ使用 |

### 2.4 クリップボードの3段階フォールバック

```
1. ClipboardItem + Promise<Blob>    ← Safari 16.4+ (ジェスチャーコンテキスト維持)
   ↓ 失敗時
2. navigator.clipboard.writeText()  ← 基本的なClipboard API
   ↓ 失敗 or undefined時
3. document.execCommand('copy')     ← レガシーだが最も確実
   + textarea (opacity:0, position:fixed, top:0, left:0)
   + setSelectionRange(0, 99999)
```

---

## 3. ファイル構成

### 3.1 現在のファイル構成（単一ファイル方式を維持）

```
drive/
├── index.html          ← メインHTML（CSP, モデルローディングUI, VADインジケーター追加）
├── app.js              ← 全ロジック（STTハイブリッド、VAD、セキュリティ含む）
├── style.css           ← スタイル（モデルローディング、VAD、VADアクティブ状態追加）
├── sw.js               ← Service Worker（CDNリクエスト通過設定追加）
├── manifest.json       ← PWA設定（変更なし）
├── electron-main.js    ← Electron（CSPヘッダー追加）
├── test.html           ← E2Eテスト（VAD、セキュリティ、STTモードテスト追加）
├── docs/
│   ├── requirements.md          ← MVP要件定義
│   └── ios-pwa-requirements.md  ← 本ドキュメント
└── icons/              ← アイコン群（変更なし）
```

**設計判断**: ユーザーの方針に基づき単一ファイル（app.js）を維持。
将来的にモジュール分割が必要になった場合の分割案は v2 を参照。

---

## 4. 技術要件

### 4.1 言語・技術スタック

| レイヤー | 技術 | 状態 |
|---------|------|------|
| **フロントエンド** | HTML5 / CSS3 / JavaScript (ES6) | Vanilla JS維持 |
| **音声認識（メイン）** | Web Speech API | 既存（Safari/Chrome/デスクトップ） |
| **音声認識（PWA用）** | Transformers.js + Xenova/whisper-tiny (WASM) | **実装済み** |
| **音声録音** | MediaRecorder API | **実装済み**（Whisperモード時） |
| **VAD** | Web Audio API (AnalyserNode) | **実装済み** |
| **翻訳** | MyMemory API | 変更なし |
| **クリップボード** | Clipboard API + execCommand フォールバック | 既存（強化済み） |
| **セキュリティ** | CSP, sanitizeText, allowLocalModels=false | **実装済み** |
| **ストレージ** | localStorage（設定・履歴）、IndexedDB（モデルキャッシュ by Transformers.js） | |
| **Service Worker** | Network-first | CDN通過設定追加 |
| **デスクトップ** | Electron | CSPヘッダー追加 |

### 4.2 Whisper WASM 処理フロー

```
ユーザーのタップ
    ↓
getUserMedia({ audio: true })  ← マイク取得（PWAでも動作）
    ↓
MediaRecorder で録音開始
    ↓
VAD が音声レベルを監視
  ├── 発話検出 → ボタン発光パターン変化
  └── 2秒間無音 → 自動停止
    ↓
停止 → Blob (audio/webm or audio/mp4)
    ↓
OfflineAudioContext で 16kHz mono にリサンプリング
    ↓
Transformers.js Whisper パイプラインで推論
  （初回: CDNからモデルDL → IndexedDBキャッシュ）
    ↓
テキスト結果 → sanitizeText() で制御文字除去
    ↓
認識結果表示 → 翻訳 → クリップボードコピー
```

---

## 5. 実装済み機能要件

### 5.1 音声認識

| # | 要件 | 状態 |
|---|------|------|
| S1 | PWA検出 (`navigator.standalone` + `display-mode: standalone`) | ✅ 実装済み |
| S2 | STT方式自動選択 (iOS PWA → Whisper / その他 → Web Speech) | ✅ 実装済み |
| S3 | Whisper WASM初期化 (Transformers.js lazy load) | ✅ 実装済み |
| S4 | getUserMedia + MediaRecorder 録音 | ✅ 実装済み |
| S5 | VAD (音声活動検出 + 自動停止) | ✅ 実装済み |
| S6 | 音声のリサンプリング (OfflineAudioContext → 16kHz mono) | ✅ 実装済み |
| S7 | モデルダウンロード進捗表示 | ✅ 実装済み |
| S8 | 3段階UI状態 (聞き取り中 → 音声処理中 → 結果表示) | ✅ 実装済み |

### 5.2 セキュリティ

| # | 要件 | 状態 |
|---|------|------|
| C1 | CSP メタタグ (script-src, connect-src制限) | ✅ 実装済み |
| C2 | Electron CSP ヘッダー | ✅ 実装済み |
| C3 | 入力サニタイズ (sanitizeText) | ✅ 実装済み |
| C4 | textContent使用によるXSS防止 | ✅ 実装済み |
| C5 | リモートモデル検証 (allowLocalModels=false) | ✅ 実装済み |

### 5.3 UI/UX

| # | 要件 | 状態 |
|---|------|------|
| U1 | VADレベルインジケーター | ✅ 実装済み |
| U2 | VADアクティブ時のマイクボタン発光 | ✅ 実装済み |
| U3 | モデルローディングオーバーレイ (進捗バー付き) | ✅ 実装済み |
| U4 | 自動停止メッセージ | ✅ 実装済み |

---

## 6. Electron版の追従方針

- **現在**: app.js の変更にそのまま追従。CSPヘッダーも追加
- **将来方針**: 安定後にElectron固有の最適化を検討。Web Speech APIがChromiumで動作するため、Whisper WASM は不要だが、コードパスとして残る
- **分離タイミング**: バグ・問題が安定した段階で、Electron版は独自のビルドパイプラインに移行可能

---

## 7. 既知の制限事項

| 制限 | 影響 | 対策 |
|------|------|------|
| Whisperモデルサイズ (~40MB) | 初回ダウンロードに時間がかかる | 進捗バー表示。IndexedDBキャッシュで2回目以降は高速 |
| Whisper推論速度 (3-10秒) | リアルタイム表示不可 | 「音声処理中...」UI。VADで自動停止し待機時間を最小化 |
| iOS PWA IndexedDB 7日間問題 | 7日間未使用でモデルキャッシュが消える可能性 | 再ダウンロード。navigator.storage.persist() の検討 |
| Whisper tiny モデルの精度 | 長文や騒音環境で精度低下 | 短い発話に最適化（VAD自動停止）。将来: base モデルへのアップグレード |
| iOS PWA マイク権限の非永続性 | アプリ再起動時に権限再要求の可能性 | getUserMediaの適切なエラーハンドリング |

---

## 8. 参考情報源

- [WebKit Bug 225298 — Speech recognition not available](https://bugs.webkit.org/show_bug.cgi?id=225298)
- [Apple Developer Forums — webkitSpeechRecognition in PWA](https://developer.apple.com/forums/thread/748048)
- [react-speech-recognition Issue #104 — PWA on iOS](https://github.com/JamesBrill/react-speech-recognition/issues/104)
- [PWA-POLICE/pwa-bugs](https://github.com/PWA-POLICE/pwa-bugs)
- [Taming the Web Speech API — Andrea Giammarchi](https://webreflection.medium.com/taming-the-web-speech-api-ef64f5a245e1)
- [PWA on iOS Limitations 2025 — Brainhub](https://brainhub.eu/library/pwa-on-ios)
- [iOS PWA Compatibility — firt.dev](https://firt.dev/notes/pwa-ios/)
- [How to use Clipboard API in Safari async — Wolfgang Rittner](https://wolfgangrittner.dev/how-to-use-clipboard-api-in-safari/)
- [Transformers.js — Hugging Face](https://github.com/huggingface/transformers.js)
- [Whisper.cpp WASM demo](https://ggml.ai/whisper.cpp/)
