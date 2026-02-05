import { useEffect, useMemo, useState } from 'react';

const FREE_PRESETS = [
  {
    id: 'A',
    title: 'A: YouTube + X',
    description: '動画を見ながら、最新のSNS投稿をチェックできます。',
    topLabel: 'YouTube 動画',
    bottomLabel: 'X タイムライン',
    topUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    bottomUrl: 'https://x.com'
  },
  {
    id: 'B',
    title: 'B: Netflix + メモ',
    description: '配信動画を見ながら、メモをすばやく残せます。',
    topLabel: 'Netflix (プレビュー)',
    bottomLabel: 'クイックメモ',
    topUrl: 'https://www.netflix.com/jp/',
    bottomUrl: 'about:blank'
  },
  {
    id: 'C',
    title: 'C: 検索 + 辞書',
    description: '調べものと意味確認を同時に進められます。',
    topLabel: 'Web検索',
    bottomLabel: '辞書',
    topUrl: 'https://www.google.com/search?q=iOS+split+view+alternatives',
    bottomUrl: 'https://dictionary.goo.ne.jp/'
  }
];

const PREMIUM_SUGGESTIONS = [
  '通勤ペア: ニュース + 天気',
  '学習ペア: YouTube講座 + 単語メモ',
  '仕事ペア: Slack + カレンダー'
];

function App() {
  const [selectedPresetId, setSelectedPresetId] = useState('A');
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [memo, setMemo] = useState('');
  const [theme, setTheme] = useState('default');
  const [batteryWarning, setBatteryWarning] = useState('');

  useEffect(() => {
    setIsPremium(localStorage.getItem('splitease.premium') === 'true');
    setTheme(localStorage.getItem('splitease.theme') || 'default');

    const connection = navigator.connection;
    if (connection?.saveData) {
      setBatteryWarning('バッテリー節約のため、低電力モードをオフにしてください。');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('splitease.theme', theme);
  }, [theme]);

  const selectedPreset = useMemo(
    () => FREE_PRESETS.find((preset) => preset.id === selectedPresetId) || FREE_PRESETS[0],
    [selectedPresetId]
  );

  const handleDrag = (event) => {
    const container = event.currentTarget.closest('.dual-pane');
    if (!container) return;

    const bounds = container.getBoundingClientRect();
    const nextRatio = (event.clientY - bounds.top) / bounds.height;
    setSplitRatio(Math.max(0.2, Math.min(0.8, nextRatio)));
  };

  const handleUpgrade = () => {
    localStorage.setItem('splitease.premium', 'true');
    setIsPremium(true);
    setShowPremiumModal(false);
  };

  const openCustomPair = () => {
    if (!isPremium) {
      setShowPremiumModal(true);
      return;
    }
    alert('プレミアム版: カスタムペア編集画面（実装予定）');
  };

  const paneStyle = theme === 'sakura' ? 'theme-sakura' : theme === 'ai' ? 'theme-ai' : '';

  return (
    <div className={`app ${paneStyle}`}>
      <header className="topbar">
        <div>
          <p className="eyebrow">SplitEase / スプリットイーズ</p>
          <h1>動画ながら見デュアルビュー</h1>
          <p className="subhead">ショートカット起動想定・ローカル完結設計のMVPプロトタイプ</p>
        </div>
        <nav className="toolbar" aria-label="メインツールバー">
          <button type="button" className="ghost">閉じる</button>
          <button type="button" className="ghost" onClick={openCustomPair}>プリセット追加</button>
          <select
            aria-label="テーマ選択"
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
          >
            <option value="default">標準</option>
            <option value="sakura">桜テーマ</option>
            <option value="ai">藍テーマ</option>
          </select>
        </nav>
      </header>

      {batteryWarning && (
        <div role="status" className="battery-warning">
          {batteryWarning}
        </div>
      )}

      <main className="workspace">
        <aside className="preset-panel" aria-label="プリセット一覧">
          <h2>固定プリセット（無料）</h2>
          <p className="helper">iOSの制限上、アプリ内Web表示で分割体験を提供します。</p>
          <ul>
            {FREE_PRESETS.map((preset) => (
              <li key={preset.id}>
                <button
                  type="button"
                  className={selectedPresetId === preset.id ? 'active' : ''}
                  onClick={() => setSelectedPresetId(preset.id)}
                  aria-label={`${preset.title} を選択`}
                >
                  <strong>{preset.title}</strong>
                  <span>{preset.description}</span>
                </button>
              </li>
            ))}
          </ul>

          <section className="premium-block">
            <h3>プレミアム</h3>
            <p>無制限ペア保存 / 広告除去 / ローカルAI提案</p>
            <ul>
              {PREMIUM_SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
            <button type="button" onClick={() => setShowPremiumModal(true)}>
              今すぐ ¥380/月
            </button>
          </section>
        </aside>

        <section className="dual-pane" aria-label="デュアルビュー" onPointerMove={(event) => event.buttons === 1 && handleDrag(event)}>
          <div className="pane" style={{ flex: splitRatio }} aria-label={`上ペイン: ${selectedPreset.topLabel}`}>
            <p className="pane-title">{selectedPreset.topLabel}</p>
            <iframe title={selectedPreset.topLabel} src={selectedPreset.topUrl} loading="lazy" referrerPolicy="no-referrer" />
          </div>

          <div
            className="drag-handle"
            role="separator"
            aria-valuemin={20}
            aria-valuemax={80}
            aria-valuenow={Math.round(splitRatio * 100)}
            aria-label="分割比率ハンドル"
            onPointerDown={handleDrag}
          />

          <div className="pane" style={{ flex: 1 - splitRatio }} aria-label={`下ペイン: ${selectedPreset.bottomLabel}`}>
            <p className="pane-title">{selectedPreset.bottomLabel}</p>
            {selectedPreset.id === 'B' ? (
              <textarea
                className="memo-area"
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="ここにメモを入力…"
                aria-label="クイックメモ"
              />
            ) : (
              <iframe title={selectedPreset.bottomLabel} src={selectedPreset.bottomUrl} loading="lazy" referrerPolicy="no-referrer" />
            )}
          </div>
        </section>
      </main>

      {showPremiumModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="プレミアム案内">
          <div className="modal">
            <h2>無制限にしたい？</h2>
            <p>プレミアムならカスタムペアを好きなだけ保存できます。今すぐ ¥380/月</p>
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => setShowPremiumModal(false)}>あとで</button>
              <button type="button" onClick={handleUpgrade}>アップグレードする</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
