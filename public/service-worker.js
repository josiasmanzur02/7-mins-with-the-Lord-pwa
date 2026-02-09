const CACHE_NAME = 'seven-minutes-cache-v5';
const OFFLINE_URLS = ['/', '/home', '/css/style.css', '/js/app.js', '/manifest.json', '/icons/logo.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch(() => null);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Let auth pages and API calls bypass the cache to avoid redirect loops.
  if (url.pathname.startsWith('/auth') || url.pathname.startsWith('/devotion')) return;

  // For navigations, prefer network and fall back to cached shell.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/home') || caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          // Avoid caching redirects/opaque responses that trip Safari.
          if (
            res &&
            res.ok &&
            !res.redirected &&
            res.type === 'basic'
          ) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return res;
        })
        .catch(() => caches.match('/home') || caches.match('/'));
    })
  );
});
