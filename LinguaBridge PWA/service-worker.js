// LinguaBridge Service Worker
// Author: Mateen Yousuf – School Education Department, J&K
// Offline-first caching for Language Gap Bridging App

const CACHE_NAME = 'linguabridge-v1.0';
const OFFLINE_URL = './index.html';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './author.jpg',
  'https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;700;800&family=Poppins:wght@300;400;600&display=swap',
];

// ===== INSTALL: Pre-cache all assets =====
self.addEventListener('install', (event) => {
  console.log('[SW] Installing LinguaBridge Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell and assets');
      return cache.addAll(ASSETS_TO_CACHE.filter(url => !url.startsWith('http') || url.includes('fonts')));
    }).then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE: Clean old caches =====
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating LinguaBridge Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ===== FETCH: Offline-first strategy =====
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Don't cache non-successful responses
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }

        // Cache the new resource
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback to offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

// ===== BACKGROUND SYNC =====
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-progress') {
    console.log('[SW] Background sync: student progress');
    event.waitUntil(syncStudentProgress());
  }
});

async function syncStudentProgress() {
  // Sync student progress data when back online
  // In production: POST to backend API
  console.log('[SW] Syncing student progress data...');
}

// ===== PUSH NOTIFICATIONS (optional) =====
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'LinguaBridge';
  const options = {
    body: data.body || 'Time to practice your vocabulary! 📖',
    icon: './manifest.json',
    badge: './manifest.json',
    tag: 'linguabridge-reminder',
    renotify: true,
    data: { url: data.url || './' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || './')
  );
});

console.log('[SW] LinguaBridge Service Worker loaded ✅');
