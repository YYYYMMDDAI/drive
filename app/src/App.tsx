// ===== メインアプリケーションコンポーネント =====

import { useCallback } from 'react';
import { useSettings, useData } from './hooks';
import {
  NetworkStatus,
  NetworkBadge,
  Counter,
  MemoInput,
  DataList
} from './components';

import './styles/global.css';
import './styles/components.css';

export default function App() {
  const { settings, updateSettings } = useSettings();
  const { items, loading, create, remove, clearAll } = useData();

  // カウンター更新
  const handleCounterChange = useCallback((value: number) => {
    updateSettings({ counter: value });
  }, [updateSettings]);

  // メモ更新
  const handleMemoChange = useCallback((value: string) => {
    updateSettings({ memo: value });
  }, [updateSettings]);

  // 保存
  const handleSave = useCallback(async () => {
    const memo = settings.memo.trim();
    if (!memo) {
      alert('メモを入力してください');
      return;
    }

    const success = await create(memo, settings.counter);
    if (success) {
      updateSettings({ memo: '' });
      alert('保存しました');
    }
  }, [settings.memo, settings.counter, create, updateSettings]);

  // 全削除
  const handleClearAll = useCallback(async () => {
    if (!confirm('すべてのデータを消去しますか？')) return;

    const success = await clearAll();
    if (success) {
      updateSettings({ counter: 0, memo: '' });
      alert('データを消去しました');
    }
  }, [clearAll, updateSettings]);

  // 個別削除
  const handleDelete = useCallback(async (id: string) => {
    await remove(id);
  }, [remove]);

  return (
    <>
      {/* オフライン表示 */}
      <NetworkStatus />

      <div className="app-container">
        {/* ヘッダー */}
        <header className="app-header">
          Tool
        </header>

        {/* メインコンテンツ */}
        <main className="app-content">
          {/* ステータスカード */}
          <div className="card">
            <div className="card-title">ステータス</div>
            <div className="card-content flex-between">
              <span>ネットワーク</span>
              <NetworkBadge />
            </div>
          </div>

          {/* カウンター */}
          <Counter
            value={settings.counter}
            onChange={handleCounterChange}
          />

          {/* メモ入力 */}
          <MemoInput
            value={settings.memo}
            onChange={handleMemoChange}
          />

          {/* データ一覧 */}
          <DataList
            items={items}
            loading={loading}
            onDelete={handleDelete}
          />
        </main>

        {/* フッター */}
        <footer className="app-footer">
          <button
            className="btn btn-secondary"
            onClick={handleClearAll}
          >
            データ消去
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
          >
            保存
          </button>
        </footer>
      </div>
    </>
  );
}
