const CACHE = 'nn-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Navigation requests: network-first with offline fallback to shell
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        if (r && r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
        }
        return r;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Other GETs: stale-while-revalidate, only cache safe responses
  e.respondWith(
    caches.match(req).then(cached => {
      const fresh = fetch(req).then(r => {
        if (r && (r.ok || r.type === 'opaque')) {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return r;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
