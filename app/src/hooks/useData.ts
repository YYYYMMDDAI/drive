// ===== データ管理フック =====

import { useState, useEffect, useCallback } from 'react';
import type { DataItem } from '../types';
import { dataApi } from '../services/api';

interface UseDataReturn {
  items: DataItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (text: string, counter: number) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  clearAll: () => Promise<boolean>;
}

export function useData(): UseDataReturn {
  const [items, setItems] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // データ取得
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await dataApi.getAll();

    if (result.success && result.data) {
      setItems(result.data);
    } else {
      setError(result.error || 'データの取得に失敗しました');
    }

    setLoading(false);
  }, []);

  // 初回読み込み
  useEffect(() => {
    refresh();
  }, [refresh]);

  // データ作成
  const create = useCallback(async (text: string, counter: number): Promise<boolean> => {
    const result = await dataApi.create({ text, counter });

    if (result.success && result.data) {
      setItems(prev => [result.data!, ...prev]);
      return true;
    } else {
      setError(result.error || '保存に失敗しました');
      return false;
    }
  }, []);

  // データ削除
  const remove = useCallback(async (id: string): Promise<boolean> => {
    const result = await dataApi.delete(id);

    if (result.success) {
      setItems(prev => prev.filter(item => item.id !== id));
      return true;
    } else {
      setError(result.error || '削除に失敗しました');
      return false;
    }
  }, []);

  // 全削除
  const clearAll = useCallback(async (): Promise<boolean> => {
    const result = await dataApi.deleteAll();

    if (result.success) {
      setItems([]);
      return true;
    } else {
      setError(result.error || '削除に失敗しました');
      return false;
    }
  }, []);

  return {
    items,
    loading,
    error,
    refresh,
    create,
    remove,
    clearAll
  };
}
