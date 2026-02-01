// ===== アプリケーション共通型定義 =====

// データアイテム
export interface DataItem {
  id: string;
  text: string;
  counter: number;
  createdAt: string;
  updatedAt?: string;
}

// ネットワーク状態
export interface NetworkState {
  isOnline: boolean;
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
}

// ストレージ設定
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  counter: number;
  memo: string;
}

// API レスポンス型（将来のバックエンド連携用）
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// API エラー
export interface ApiError {
  code: string;
  message: string;
}
