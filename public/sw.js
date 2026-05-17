// Minimal pass-through service worker stub.
// Replace with a real strategy (Workbox / next-pwa) before production.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first, no cache yet. Wire offline support in a later iteration.
});
