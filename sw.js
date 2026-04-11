const CACHE_NAME = 'bingo-v1.0.1.5'; 

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
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
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
  return self.clients.claim(); // Take control immediately
});

// 🔥 FORCE UPDATE WHEN USER CLICKS
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 🔵 FETCH (Upgraded for strict WebAPK validation)
self.addEventListener('fetch', event => {
  // 1. Handle Navigation requests (loading the HTML page)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(response => {
        return response || fetch(event.request);
      }).catch(() => caches.match('./index.html')) // Guaranteed offline fallback
    );
    return;
  }

  // 2. Handle standard asset requests (CSS, JS, Images)
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
