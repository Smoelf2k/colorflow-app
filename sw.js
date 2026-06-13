/* Service worker for ColorFlow PixLab — offline-cache.
   Strategi:
   - Navigationer (HTML): NETVÆRK FØRST, cache kun som offline-fallback —
     så en ny udgave af appen altid slår igennem ved næste besøg.
   - Øvrige same-origin GET (hashede assets, skabeloner): cache-first.
   - Nyt CACHE-navn ved hver strategi-ændring → gamle caches ryddes i activate. */

const CACHE = 'cbn-cache-v3';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['.', 'manifest.webmanifest'])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;

  // App-skallen: hent altid frisk fra nettet; cachen er kun offline-fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c ?? caches.match('.'))),
    );
    return;
  }

  // Assets og skabeloner: cache-first (filnavne er hashede, så de er stabile)
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }),
    ),
  );
});
