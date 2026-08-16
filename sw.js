// =========================================================================
// 🚀 TD NEWS PWA SERVICE WORKER (Cache-First + Stale-While-Revalidate)
// =========================================================================
const CACHE_NAME = 'td-news-cache-v1';
const PRECACHE_ASSETS = [
    './',
    './index.html',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js',
    'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjGka-p7C45PTqBMBKqSjulqicQlHmW_Ee1BCfUPpaW888vYnoPjElzW9DVm8az1kCOjdlabjA3qb_vS00GpCApyVWh2C0aIcOcvb-BWeeTI8AdLojSf25iCvNpMS6aENxrWO-SgM5xjqePEMsHfCLy4HinnGk2xAnDlKaapXYFY05jXQM/s56-c/Logo2.png'
];

// 1. INSTALL: Pre-cache static UI assets & fonts
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// 2. ACTIVATE: Clear old cache versions
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. FETCH: Stale-While-Revalidate for cached assets & pass-through for Firebase live updates
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Bypass real-time Firebase backend sync, websockets, and POST mutations
    if (
        url.origin.includes('firestore.googleapis.com') ||
        url.origin.includes('firebaseio.com') ||
        url.origin.includes('googleapis.com/google.firestore') ||
        request.method !== 'GET'
    ) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached version immediately and refresh in background
                fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
                    }
                }).catch(() => {});
                return cachedResponse;
            }

            // Fetch from network for dynamic images/resources
            return fetch(request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // Offline Fallback for main document
                if (request.mode === 'navigate') {
                    return caches.match('./index.html') || caches.match('./');
                }
            });
        })
    );
});
