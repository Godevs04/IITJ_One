/* IITJ One Admin — lightweight PWA service worker */
const CACHE = 'iitj-admin-v1';
const PRECACHE = ['/', '/login', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always network for API / backend proxy
  if (url.pathname.startsWith('/backend') || url.pathname.startsWith('/api')) {
    return;
  }

  // Next.js data / RSC — network first, fall back to cache
  if (
    url.pathname.startsWith('/_next/data') ||
    request.headers.get('RSC') === '1' ||
    request.headers.get('Next-Router-State-Tree')
  ) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          void caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Static assets — cache first
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.webmanifest')
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            void caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Documents — network first
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          void caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then((r) => r || caches.match('/login') || caches.match('/'))),
  );
});
