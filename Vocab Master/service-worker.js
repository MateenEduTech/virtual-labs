/**
 * VocabMaster Service Worker
 * Enables full offline functionality for the PWA
 * Aligned with NEP 2020 & NCF 2023 offline-first education philosophy
 * Author: Mateen Yousuf – Teacher, School Education Department J&K
 */

const CACHE_NAME = 'vocabmaster-v1.0';
const OFFLINE_URLS = [
  './',
  './index.html',
  './manifest.json'
];

// =============================================
// INSTALL: Cache all essential files
// =============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing VocabMaster Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell for offline use');
        return cache.addAll(OFFLINE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// =============================================
// ACTIVATE: Clean up old caches
// =============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('[SW] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// =============================================
// FETCH: Cache-first strategy for offline use
// =============================================
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Otherwise fetch from network and cache it
        return fetch(event.request)
          .then((networkResponse) => {
            // Only cache successful responses
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response (stream can only be consumed once)
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            // Offline fallback - return cached index.html for navigation
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// =============================================
// BACKGROUND SYNC (for future note syncing)
// =============================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-vocab-progress') {
    console.log('[SW] Background sync triggered for vocab progress');
    // Future: sync progress to a server
  }
});

// =============================================
// PUSH NOTIFICATIONS (Daily word reminder)
// =============================================
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Time to learn your word of the day! 📚',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: './index.html' },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Later' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('VocabMaster – Daily Word', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('./index.html')
    );
  }
});
