// sw.js — Regain v3 service worker
const CACHE = 'regain-v3';
const LOCAL_ASSETS = ['./', './index.html', './db.js', './manifest.json', './icon-192.svg', './icon-512.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(LOCAL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  const isExternal = url.includes('fonts.g') || url.includes('cdnjs') || url.includes('cdn.j');
  if (isExternal) {
    // Network-first with cache fallback for CDN assets
    e.respondWith(
      fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return r;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first for local assets
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});
