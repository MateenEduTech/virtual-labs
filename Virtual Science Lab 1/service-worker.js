// ============================================================
// JKBOSE Virtual Science Lab — Service Worker
// Handles offline caching so the app works without internet
// ============================================================

const CACHE_NAME = 'jkbose-virtual-lab-v1.0';

// Files to cache for offline use
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './author.jpg'
];

// ─── INSTALL EVENT ───────────────────────────────────────────
// Triggered when service worker is first installed
// Pre-caches all essential app files
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(FILES_TO_CACHE);
    }).catch((err) => {
      console.log('[ServiceWorker] Cache failed:', err);
    })
  );
  // Activate immediately without waiting
  self.skipWaiting();
});

// ─── ACTIVATE EVENT ──────────────────────────────────────────
// Clean up old caches when a new service worker activates
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  // Take control of all open pages immediately
  self.clients.claim();
});

// ─── FETCH EVENT ─────────────────────────────────────────────
// Intercepts network requests
// Returns cached version if available (offline-first strategy)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }
      // Otherwise try to fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Cache the new response for future use
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If both cache and network fail, return offline fallback
        console.log('[ServiceWorker] Fetch failed, app is offline');
      });
    })
  );
});

// ─── MESSAGE EVENT ───────────────────────────────────────────
// Handle messages from the main app (e.g., skip waiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
