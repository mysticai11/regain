// sw.js — Regain service worker
const CACHE = 'regain-v21';
const LOCAL_ASSETS = [
  "./",
  "./index.html",
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
  "./js/data/exercises.js",
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
  "./js/screens/gym/swipe-delete.js",
  "./js/screens/gym/timer.js",
  "./js/screens/onboarding.js",
  "./js/screens/progress.js",
  "./js/screens/progress/charts.js",
  "./js/screens/progress/digests.js",
  "./js/screens/progress/history.js",
  "./js/screens/progress/lifts.js",
  "./js/screens/progress/session-editor.js",
  "./js/screens/progress/stat-tiles.js",
  "./js/screens/settings.js",
  "./js/screens/today.js",
  "./js/screens/today/food-modal.js",
  "./js/screens/today/widgets.js",
  "./js/state.js",
  "./js/storage-sessions.js",
  "./js/storage.js",
  "./js/ui/segmented.js",
  "./js/ui/chartGeometry.js",
  "./js/ui/lineChart.js",
  "./js/ui/sparkline.js",
  "./js/ui/barGeometry.js",
  "./js/ui/barChart.js",
  "./js/view/liftStats.js",
  "./js/view/calendarGrid.js",
  "./js/view/weekStrip.js",
  "./js/view/weeklyStats.js"
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(LOCAL_ASSETS).catch(err => {
        console.warn('Precache partial fallback:', err);
      });
    })
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
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Cache-first for icons and static assets
  if (url.pathname.includes('/assets/icons/') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.png')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Cross-origin CDN (fonts): stale-while-revalidate
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

  // Same-origin JS/CSS/HTML: network-first with cache fallback (bypasses stale HTTP cache)
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
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
