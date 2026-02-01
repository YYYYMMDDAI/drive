// ===== API サービス =====
// バックエンド連携用の抽象化レイヤー
// 現在はローカルストレージを使用、将来的にREST APIに切り替え可能

import type { DataItem, ApiResponse } from '../types';
import { indexedDBHelper } from './storage';

// API ベースURL（将来のバックエンド用）
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// バックエンドが有効かどうか
const USE_BACKEND = !!API_BASE_URL;

// ===== HTTPクライアント（将来のバックエンド用） =====
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

// ===== データ操作 API =====
export const dataApi = {
  // 全件取得
  async getAll(): Promise<ApiResponse<DataItem[]>> {
    if (USE_BACKEND) {
      return fetchApi<DataItem[]>('/api/data');
    }

    // ローカル実装
    try {
      const items = await indexedDBHelper.getAll();
      // 新しい順にソート
      items.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return { success: true, data: items };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage error'
      };
    }
  },

  // 1件取得
  async get(id: string): Promise<ApiResponse<DataItem>> {
    if (USE_BACKEND) {
      return fetchApi<DataItem>(`/api/data/${id}`);
    }

    try {
      const item = await indexedDBHelper.get(id);
      if (!item) {
        return { success: false, error: 'Not found' };
      }
      return { success: true, data: item };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage error'
      };
    }
  },

  // 作成
  async create(item: Omit<DataItem, 'id' | 'createdAt'>): Promise<ApiResponse<DataItem>> {
    if (USE_BACKEND) {
      return fetchApi<DataItem>('/api/data', {
        method: 'POST',
        body: JSON.stringify(item)
      });
    }

    try {
      const newItem: DataItem = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      };
      await indexedDBHelper.put(newItem);
      return { success: true, data: newItem };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage error'
      };
    }
  },

  // 更新
  async update(id: string, item: Partial<DataItem>): Promise<ApiResponse<DataItem>> {
    if (USE_BACKEND) {
      return fetchApi<DataItem>(`/api/data/${id}`, {
        method: 'PUT',
        body: JSON.stringify(item)
      });
    }

    try {
      const existing = await indexedDBHelper.get(id);
      if (!existing) {
        return { success: false, error: 'Not found' };
      }
      const updated: DataItem = {
        ...existing,
        ...item,
        id,
        updatedAt: new Date().toISOString()
      };
      await indexedDBHelper.put(updated);
      return { success: true, data: updated };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage error'
      };
    }
  },

  // 削除
  async delete(id: string): Promise<ApiResponse<void>> {
    if (USE_BACKEND) {
      return fetchApi<void>(`/api/data/${id}`, { method: 'DELETE' });
    }

    try {
      await indexedDBHelper.delete(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage error'
      };
    }
  },

  // 全削除
  async deleteAll(): Promise<ApiResponse<void>> {
    if (USE_BACKEND) {
      return fetchApi<void>('/api/data', { method: 'DELETE' });
    }

    try {
      await indexedDBHelper.clear();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage error'
      };
    }
  }
};
