// sw.js — Regain service worker
const CACHE = 'regain-v5';
const LOCAL_ASSETS = [
  "./",
  "./index.html",
  "./tokens.css",
  "./db.js",
  "./manifest.json",
  "./icon-192.svg",
  "./icon-512.svg",
  "./assets/icons/icon-1024.svg",
  "./assets/icons/icon-maskable.svg",
  "./assets/icons/icon-monochrome.svg",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/icon-32.png",
  "./assets/icons/icon-16.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/icon-monochrome-512.png",
  "./css/base.css",
  "./css/components.css",
  "./css/gym.css",
  "./css/progress.css",
  "./css/settings.css",
  "./css/today.css",
  "./css/tokens.css",
  "./js/components.js",
  "./js/components/gauge.js",
  "./js/components/quick-edit-modal.js",
  "./js/components/sheet.js",
  "./js/components/toast.js",
  "./js/components/ui.js",
  "./js/data/foods.js",
  "./js/data/plan.js",
  "./js/data/splits.js",
  "./js/lib/calc.js",
  "./js/lib/dom.js",
  "./js/lib/format.js",
  "./js/lib/progression-compare.js",
  "./js/lib/progression.js",
  "./js/main.js",
  "./js/screens/gym.js",
  "./js/screens/gym/edit-workout.js",
  "./js/screens/gym/events.js",
  "./js/screens/gym/exercise-modal.js",
  "./js/screens/gym/helpers.js",
  "./js/screens/gym/plan-editor.js",
  "./js/screens/gym/session-sheet.js",
  "./js/screens/gym/sets.js",
  "./js/screens/gym/swap.js",
  "./js/screens/gym/timer.js",
  "./js/screens/onboarding.js",
  "./js/screens/progress.js",
  "./js/screens/progress/charts.js",
  "./js/screens/progress/history.js",
  "./js/screens/progress/session-editor.js",
  "./js/screens/settings.js",
  "./js/screens/today.js",
  "./js/screens/today/food-modal.js",
  "./js/screens/today/widgets.js",
  "./js/state.js",
  "./js/storage-sessions.js",
  "./js/storage.js"
];

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Cross-origin CDN: stale-while-revalidate
  if (url.origin !== location.origin) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const fetchPromise = fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Same-origin: network-first with cache fallback (ensures fresh JS while offline capable)
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && e.request.url.startsWith('http')) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
