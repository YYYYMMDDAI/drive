// ===== ネットワーク状態フック =====

import { useState, useEffect, useCallback } from 'react';
import type { NetworkState } from '../types';

export function useNetwork(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    isOnline: navigator.onLine,
    effectiveType: getEffectiveType()
  });

  const updateState = useCallback(() => {
    setState({
      isOnline: navigator.onLine,
      effectiveType: getEffectiveType()
    });
  }, []);

  useEffect(() => {
    window.addEventListener('online', updateState);
    window.addEventListener('offline', updateState);

    // Network Information API（対応ブラウザのみ）
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (connection) {
      connection.addEventListener('change', updateState);
    }

    return () => {
      window.removeEventListener('online', updateState);
      window.removeEventListener('offline', updateState);
      if (connection) {
        connection.removeEventListener('change', updateState);
      }
    };
  }, [updateState]);

  return state;
}

// Network Information API の型定義
interface NetworkInformation extends EventTarget {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

function getEffectiveType(): NetworkState['effectiveType'] {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return connection?.effectiveType;
}
