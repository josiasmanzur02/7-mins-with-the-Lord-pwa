const CACHE_NAME = 'seven-minutes-cache-v7';
const OFFLINE_URLS = [
  '/',
  '/home',
  '/css/style.css',
  '/js/storage.js',
  '/js/app.js',
  '/js/alarm.js',
  '/js/home.js',
  '/js/settings.js',
  '/js/timer.js',
  '/manifest.json',
  '/icons/logo.svg',
];

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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = '/timer#alarm';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const client = clientsArr.find((c) => c.visibilityState === 'visible');
      if (client) {
        client.navigate(url);
        return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

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
          if (res && res.ok && !res.redirected && res.type === 'basic') {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return res;
        })
        .catch(() => caches.match('/home') || caches.match('/'));
    })
  );
});
