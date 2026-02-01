import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// PWA Service Worker 登録（vite-plugin-pwa が自動生成）
import { registerSW } from 'virtual:pwa-register';

// Service Worker 登録
registerSW({
  onNeedRefresh() {
    // 新しいバージョンが利用可能
    if (confirm('新しいバージョンがあります。更新しますか？')) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log('オフライン対応準備完了');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
