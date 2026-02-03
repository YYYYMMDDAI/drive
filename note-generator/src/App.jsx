import { useEffect, useMemo, useState } from 'react';

const INITIAL_STATE = {
  text: '',
  summary: '',
  imageUrl: '',
  infographicUrl: ''
};

const MAX_FREE_GENERATIONS = 5;

function App() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('article');
  const [isPro, setIsPro] = useState(false);
  const [error, setError] = useState('');
  const [generationCount, setGenerationCount] = useState(0);

  useEffect(() => {
    const proStatus = localStorage.getItem('isPro');
    const savedCount = Number(localStorage.getItem('generationCount') || '0');
    setIsPro(proStatus === 'true');
    setGenerationCount(savedCount);
  }, []);

  const remainingFree = useMemo(() => {
    if (isPro) {
      return Infinity;
    }
    return Math.max(0, MAX_FREE_GENERATIONS - generationCount);
  }, [generationCount, isPro]);

  const handleGenerate = async () => {
    setError('');
    if (!prompt.trim()) {
      setError('トピックを入力してください。');
      return;
    }
    if (!isPro && remainingFree === 0) {
      setError('無料枠の上限に達しました。Proプランにアップグレードしてください。');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!res.ok) {
        throw new Error('生成に失敗しました。しばらくしてからお試しください。');
      }

      const data = await res.json();
      setResult(data);
      if (!isPro) {
        const nextCount = generationCount + 1;
        localStorage.setItem('generationCount', String(nextCount));
        setGenerationCount(nextCount);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <aside className="command-center" aria-label="コマンドセンター">
        <div>
          <p className="eyebrow">Claude Artifacts Inspired</p>
          <h1>Next Artifacts for note</h1>
          <p className="subhead">
            Claude + DALL·Eで記事、サムネ、図解を自動生成。
          </p>
        </div>
        <label className="input-label" htmlFor="prompt">
          記事トピック
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="例: AIで生産性を10倍にする方法"
          aria-describedby="prompt-help"
        />
        <p id="prompt-help" className="helper">
          1つのトピックから複数の成果物を生成します。
        </p>
        <button onClick={handleGenerate} disabled={loading}>
          {loading ? '生成中…' : '生成を開始'}
        </button>
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        <div className="plan-card">
          <div>
            <p className="plan-title">Free</p>
            <p className="plan-detail">残り {remainingFree} 回</p>
          </div>
          <a className="plan-link" href="/subscribe.html">
            Proにアップグレード ($9.99/月)
          </a>
        </div>
      </aside>
      <main className="artifacts" aria-live="polite">
        <div className="tabs" role="tablist" aria-label="成果物タブ">
          {['article', 'thumbnail', 'visuals', 'summary'].map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <section className="content" role="tabpanel">
          {loading && <div className="loading">AIがArtifactsを生成中…</div>}
          {!loading && activeTab === 'article' && (
            <article className="article">
              <h2>Generated Article</h2>
              <p>{result.text || 'ここに記事本文が表示されます。'}</p>
            </article>
          )}
          {!loading && activeTab === 'thumbnail' && (
            <div className="image-panel">
              {result.imageUrl ? (
                <img src={result.imageUrl} alt="記事用サムネイル" />
              ) : (
                <p>見出し画像がここに表示されます。</p>
              )}
            </div>
          )}
          {!loading && activeTab === 'visuals' && (
            <div className="image-panel">
              {result.infographicUrl ? (
                <img src={result.infographicUrl} alt="補完図解" />
              ) : (
                <p>補完図解がここに表示されます。</p>
              )}
            </div>
          )}
          {!loading && activeTab === 'summary' && (
            <div className="summary">
              <h2>Summary</h2>
              <p>{result.summary || '要約がここに表示されます。'}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
