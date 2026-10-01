const CACHE_NAME = 'mousekin-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/assets/characters/mouse_cutout.png',
  '/assets/characters/Мыш.png',
  '/assets/characters/Ули.png',
  '/assets/characters/кот.png',
  '/assets/characters/Архи.png',
  '/assets/images/coverRU.png',
  '/assets/images/ios111.jpg',
  '/assets/images/Bed.png',
  '/assets/images/Alarm.png',
  '/assets/images/ClosedWindow.png',
  '/assets/images/Clocks.png',
  '/assets/audio/intro.mp3',
  '/assets/audio/s00_narration_ru.mp3',
  '/assets/audio/s01_narration_ru.mp3',
  '/assets/audio/s02_narration_ru.mp3',
  '/assets/audio/murrr.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => console.log('SW cache partial:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        })
      );
    })
  );
});
