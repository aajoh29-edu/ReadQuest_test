const CACHE_NAME = 'readquest-character-media-v1';

// Intercept network requests
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Strictly target the character assets directory to avoid caching API calls or dynamic HTML
  if (requestUrl.pathname.startsWith('/assets/characters/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // 1. Return the cached media immediately if available (Offline Support)
        if (cachedResponse) {
          return cachedResponse;
        }

        // 2. Otherwise, fetch it from the network and cache it for next time
        return fetch(event.request).then((networkResponse) => {
          // Clone the response because it's a stream and can only be consumed once
          const responseToCache = networkResponse.clone();
          
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return networkResponse;
        });
      })
    );
  }
});
