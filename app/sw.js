// Service Worker - オフライン対応
const CACHE_NAME = 'tool-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// インストール時にアセットをキャッシュ
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching assets');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// フェッチ時にキャッシュを優先（Cache First戦略）
self.addEventListener('fetch', (event) => {
  // 同一オリジンのリクエストのみ処理
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        console.log('[SW] Fetching:', event.request.url);
        return fetch(event.request)
          .then(response => {
            // 有効なレスポンスのみキャッシュ
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // レスポンスをクローンしてキャッシュ
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache));

            return response;
          })
          .catch(() => {
            // オフライン時のフォールバック
            console.log('[SW] Offline, returning cached index.html');
            return caches.match('./index.html');
          });
      })
  );
});
