// =========================================================================
// 🚀 TDTTI PRODUCTION SERVICE WORKER (sw.js)
// =========================================================================
const CACHE_VERSION = 'tdtti-pwa-v1.0.0';
const STATIC_CACHE_NAME = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `runtime-${CACHE_VERSION}`;

// Pre-cached App Shell Assets
const PRECACHE_ASSETS = [
    './',
    './index.html',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js',
    'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjGka-p7C45PTqBMBKqSjulqicQlHmW_Ee1BCfUPpaW888vYnoPjElzW9DVm8az1kCOjdlabjA3qb_vS00GpCApyVWh2C0aIcOcvb-BWeeTI8AdLojSf25iCvNpMS6aENxrWO-SgM5xjqePEMsHfCLy4HinnGk2xAnDlKaapXYFY05jXQM/s56-c/Logo2.png'
];

// 1. INSTALL: Pre-cache App Shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// 2. ACTIVATE: Cleanup Old Cache Versions
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE_NAME && cacheName !== RUNTIME_CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. FETCH: Cache-First Strategy with Offline Fallback
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Bypass Firebase Realtime / Firestore WebChannel & WebSocket Requests
    if (
        request.method !== 'GET' ||
        url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('firebaseio.com') ||
        url.pathname.includes('/google.firestore.')
    ) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).then((networkResponse) => {
                // Cache valid fonts and static assets dynamically
                if (
                    networkResponse && 
                    networkResponse.status === 200 && 
                    (url.origin === location.origin || url.hostname.includes('gstatic.com') || url.hostname.includes('googleapis.com'))
                ) {
                    const responseClone = networkResponse.clone();
                    caches.open(RUNTIME_CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Return offline index.html fallback for navigation requests
                if (request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
