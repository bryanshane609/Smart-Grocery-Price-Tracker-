// Service Worker for Smart Grocery & Budget Safety Tracker (PWA)
const CACHE_NAME = 'smart-grocery-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './firebase-service.js',
  './manifest.json',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Cache prefill non-critical error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Hanya proses method GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // KRUSIAL: Jangan pernah mencegat request ke Firebase, Firestore, Google API, atau CDN eksternal
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('google.com')
  ) {
    return; // Langsung kirim lewat jaringan asli
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cache but update in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* offline silent */});
        return cachedResponse;
      }

      return fetch(event.request).catch(() => {
        // Fallback for HTML documents if offline
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
