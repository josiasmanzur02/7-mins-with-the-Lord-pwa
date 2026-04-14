const CACHE_NAME = 'seven-minutes-cache-v26';
const LANGS = ['en', 'es'];
const PAGES = ['home/', 'timer/', 'settings/', 'install/'];
const ASSETS = [
  '',
  '404.html',
  'manifest.json',
  'audio/ping.mp3',
  'audio/finish.mp3',
  'audio/alarm.mp3',
  'css/style.css',
  'js/storage.js',
  'js/app.js',
  'js/i18n.js',
  'js/home.js',
  'js/settings.js',
  'js/timer.js',
  'icons/logo.svg',
];

function scopedUrl(relativePath = '') {
  return new URL(relativePath, self.registration.scope).toString();
}

function offlineUrls() {
  return [
    ...ASSETS.map((asset) => scopedUrl(asset)),
    ...LANGS.flatMap((lang) => PAGES.map((page) => scopedUrl(`${lang}/${page}`))),
    ...PAGES.map((page) => scopedUrl(page)),
  ];
}

function fallbackHomeUrl(requestUrl) {
  const scopePath = new URL(self.registration.scope).pathname;
  const requestPath = new URL(requestUrl).pathname;
  const relativePath = requestPath.startsWith(scopePath)
    ? requestPath.slice(scopePath.length)
    : requestPath.replace(/^\/+/, '');
  const [lang] = relativePath.split('/').filter(Boolean);
  return scopedUrl(`${LANGS.includes(lang) ? lang : 'en'}/home/`);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(offlineUrls()).catch(() => null);
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

  // For navigations, prefer network and fall back to cached shell.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.ok && !res.redirected && res.type === 'basic') {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return res;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match(fallbackHomeUrl(event.request.url))))
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
        .catch(() => Response.error());
    })
  );
});
