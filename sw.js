const CACHE_NAME = 'scooby-v1.0.3';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 🟡 INSTALL
self.addEventListener('install', event => {
  self.skipWaiting(); // 🔥 ensure new SW moves forward

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        ASSETS.map(asset => cache.add(asset))
      )
    )
  );
});

// 🟢 ACTIVATE
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );

  return self.clients.claim(); // 🔥 take control immediately
});

// 🔥 FORCE UPDATE WHEN USER CLICKS
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 🔵 FETCH
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});