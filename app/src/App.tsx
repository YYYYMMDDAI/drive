// ===== 画面分割アプリ =====
import { useState, useRef, useEffect } from 'react';
import './styles/global.css';
import './styles/split.css';

function App() {
  // 分割比率（上側の割合、0.15〜0.85）
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // URL入力状態
  const [topUrl, setTopUrl] = useState('');
  const [bottomUrl, setBottomUrl] = useState('');
  const [topLoadedUrl, setTopLoadedUrl] = useState('');
  const [bottomLoadedUrl, setBottomLoadedUrl] = useState('');

  // ドラッグ処理
  useEffect(() => {
    const handleMove = (clientY: number) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      // 比率を計算（0.15〜0.85の範囲に制限）
      let ratio = (clientY - rect.top) / rect.height;
      ratio = Math.max(0.15, Math.min(0.85, ratio));

      setSplitRatio(ratio);
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientY);
      }
    };

    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  // URL読み込み
  const loadUrl = (url: string, target: 'top' | 'bottom') => {
    if (!url.trim()) return;
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    if (target === 'top') {
      setTopLoadedUrl(fullUrl);
    } else {
      setBottomLoadedUrl(fullUrl);
    }
  };

  // URLクリア
  const clearUrl = (target: 'top' | 'bottom') => {
    if (target === 'top') {
      setTopLoadedUrl('');
      setTopUrl('');
    } else {
      setBottomLoadedUrl('');
      setBottomUrl('');
    }
  };

  return (
    <div className="split-container" ref={containerRef}>
      {/* 上側パネル */}
      <div
        className="split-panel"
        style={{ height: `calc(${splitRatio * 100}% - 12px)` }}
      >
        {topLoadedUrl ? (
          <>
            <iframe
              src={topLoadedUrl}
              className="panel-iframe"
              title="上側"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
            <button className="close-btn" onClick={() => clearUrl('top')}>
              ×
            </button>
          </>
        ) : (
          <div className="panel-empty">
            <input
              type="text"
              className="url-input"
              placeholder="URL（例: google.com）"
              value={topUrl}
              onChange={(e) => setTopUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUrl(topUrl, 'top')}
            />
            <button className="open-btn" onClick={() => loadUrl(topUrl, 'top')}>
              開く
            </button>
          </div>
        )}
      </div>

      {/* 分割バー */}
      <div
        className={`split-divider ${isDragging ? 'active' : ''}`}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
      >
        <div className="divider-handle" />
      </div>

      {/* 下側パネル */}
      <div
        className="split-panel"
        style={{ height: `calc(${(1 - splitRatio) * 100}% - 12px)` }}
      >
        {bottomLoadedUrl ? (
          <>
            <iframe
              src={bottomLoadedUrl}
              className="panel-iframe"
              title="下側"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
            <button className="close-btn" onClick={() => clearUrl('bottom')}>
              ×
            </button>
          </>
        ) : (
          <div className="panel-empty">
            <input
              type="text"
              className="url-input"
              placeholder="URL（例: youtube.com）"
              value={bottomUrl}
              onChange={(e) => setBottomUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUrl(bottomUrl, 'bottom')}
            />
            <button className="open-btn" onClick={() => loadUrl(bottomUrl, 'bottom')}>
              開く
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
