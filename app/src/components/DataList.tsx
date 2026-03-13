// ===== データ一覧コンポーネント =====

import type { DataItem } from '../types';

interface DataListProps {
  items: DataItem[];
  loading: boolean;
  onDelete: (id: string) => void;
}

export function DataList({ items, loading, onDelete }: DataListProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  };

  if (loading) {
    return (
      <div className="section">
        <h2 className="section-title">保存データ</h2>
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="section">
      <h2 className="section-title">保存データ</h2>
      <div className="list">
        {items.length === 0 ? (
          <div className="list-empty">
            データがありません
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="list-item">
              <div className="list-item-content">
                <div className="list-item-title selectable">{item.text}</div>
                <div className="list-item-subtitle">
                  カウンター: {item.counter} / {formatDate(item.createdAt)}
                </div>
              </div>
              <button
                className="btn btn-delete"
                onClick={() => onDelete(item.id)}
                aria-label="削除"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
