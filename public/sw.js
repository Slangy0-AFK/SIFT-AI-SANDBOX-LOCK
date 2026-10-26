const CACHE_NAME = 'siftai-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip caching for dev environment assets
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.jsx') ||
    url.pathname.endsWith('.css') ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1'
  ) {
    return event.respondWith(fetch(event.request));
  }

  // Network-first for API requests
  if (url.pathname.startsWith('/api/') || url.pathname.includes('base44')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});