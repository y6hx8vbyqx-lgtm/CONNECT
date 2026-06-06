const CACHE_NAME = 'contegg-pwa-v2';

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(cacheName => cacheName !== CACHE_NAME)
                    .map(cacheName => caches.delete(cacheName))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const request = event.request;

    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Firebase / Google / внешние CDN не трогаем service worker'ом
    if (url.origin !== self.location.origin) {
        event.respondWith(fetch(request));
        return;
    }

    // HTML-страницы всегда сначала из сети, чтобы не залипала старая версия
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match('/'))
        );
        return;
    }

    // Остальные локальные файлы: сеть -> кэш
    event.respondWith(
        fetch(request)
            .then(response => {
                const copy = response.clone();

                caches.open(CACHE_NAME).then(cache => {
                    cache.put(request, copy);
                });

                return response;
            })
            .catch(() => caches.match(request))
    );
});
