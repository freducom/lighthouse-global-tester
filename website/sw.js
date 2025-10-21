// Service Worker for Global Lighthouse Tracker PWA
const CACHE_NAME = 'lighthouse-tracker-v2'; // Updated version to force cache refresh
const OFFLINE_URL = '/index.html';

// Files to cache for offline functionality
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/favicon.svg',
  // Cache key country and industry pages
  '/country-united-states.html',
  '/country-united-kingdom.html',
  '/country-germany.html',
  '/country-japan.html',
  '/country-canada.html',
  '/industry-technology.html',
  '/industry-social-media.html',
  '/industry-e-commerce.html',
  '/industry-search-engine.html',
  '/all-countries.html',
  '/all-industries.html',
  '/all-companies.html',
  '/latest-updated.html'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching app shell and content');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Cache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - smart caching strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);
  const isHTMLPage = event.request.destination === 'document' || 
                     url.pathname.endsWith('.html') || 
                     url.pathname === '/';

  if (isHTMLPage) {
    // NETWORK-FIRST strategy for HTML pages (fresh data)
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh response
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log('🔄 Updating cache with fresh content:', event.request.url);
                cache.put(event.request, responseToCache);
              });
          }
          console.log('🌐 Serving fresh content from network:', event.request.url);
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails (offline support)
          console.log('📱 Network failed, serving from cache:', event.request.url);
          return caches.match(event.request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match(OFFLINE_URL);
            });
        })
    );
  } else {
    // CACHE-FIRST strategy for static assets (performance)
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            console.log('📱 Serving static asset from cache:', event.request.url);
            return response;
          }

          // Fetch and cache static assets
          console.log('🌐 Fetching static asset from network:', event.request.url);
          return fetch(event.request)
            .then((response) => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Cache static assets
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  if (event.request.url.includes('.css') || 
                      event.request.url.includes('.js') ||
                      event.request.url.includes('.svg') ||
                      event.request.url.includes('.png') ||
                      event.request.url.includes('.jpg')) {
                    console.log('💾 Caching static asset:', event.request.url);
                    cache.put(event.request, responseToCache);
                  }
                });

              return response;
            });
        })
    );
  }
});

// Background sync for data updates (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Background sync triggered');
    // Could be used to update lighthouse data when online
  }
});

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  console.log('📢 Push message received');
  // Could be used for performance alerts or updates
});