// 補助金ナビ Service Worker — シンプルなオフラインキャッシュ
const CACHE = 'subsidy-nav-v1';
const PRECACHE = ['/', '/subsidies', '/offline', '/manifest.json', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // API はキャッシュしない（常に最新を取得、失敗時のみ無視）
  if (url.pathname.startsWith('/api/')) return;

  // ナビゲーションは network-first、失敗時オフラインページ
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/offline')))
    );
    return;
  }

  // 静的アセットは cache-first
  event.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request).then((res) => {
        if (res.ok && (request.destination === 'style' || request.destination === 'script' || request.destination === 'image')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      }).catch(() => cached)
    )
  );
});
