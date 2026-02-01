// ===== 設定管理フック =====

import { useState, useCallback, useEffect } from 'react';
import type { AppSettings } from '../types';
import { settings as settingsService } from '../services/storage';

interface UseSettingsReturn {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AppSettings>(settingsService.get());

  // 設定更新
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      settingsService.set(updated);
      return updated;
    });
  }, []);

  // 設定リセット
  const resetSettings = useCallback(() => {
    settingsService.reset();
    setSettings(settingsService.get());
  }, []);

  // 他タブとの同期
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'app_settings' && e.newValue) {
        try {
          setSettings(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings
  };
}
