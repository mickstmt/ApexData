// ApexData service worker
//
// Strategies:
//   /_next/static/*        cache-first  (immutable, hashed filenames)
//   /images/*, /icons/*    stale-while-revalidate (driver photos, layouts, flags)
//   /api/*                 network-only (never serve stale F1 data)
//   navigations            network-first, falling back to cache then /offline
//
// Bump the cache version on any release that changes page HTML or chunk URLs,
// otherwise an installed app can keep serving HTML that references deleted JS.
const CACHE_STATIC = 'apexdata-static-v1';
const CACHE_PAGES = 'apexdata-pages-v1';

const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_PAGES)
      .then(async (cache) => {
        // Deliberately not cache.addAll: that is atomic, so a single non-2xx
        // response would fail the install and leave the app with no worker.
        try {
          const response = await fetch(OFFLINE_URL, { cache: 'reload' });
          if (response.ok) await cache.put(OFFLINE_URL, response);
        } catch (error) {
          console.error('[SW] No se pudo precachear /offline:', error);
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const current = new Set([CACHE_STATIC, CACHE_PAGES]);

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !current.has(key)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (request.method !== 'GET') return;

  // Live data must never come from cache.
  if (url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/splash/') ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/icon.svg'
  ) {
    event.respondWith(staleWhileRevalidate(event, CACHE_STATIC));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 504, statusText: 'Sin conexión' });
  }
}

async function staleWhileRevalidate(event, cacheName) {
  const { request } = event;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request).then(async (response) => {
    if (response.ok) await cache.put(request, response.clone());
    return response;
  });

  if (cached) {
    // Keep the worker alive until the refresh lands, otherwise an asset can
    // stay stale forever because the update was cut short.
    event.waitUntil(network.catch(() => undefined));
    return cached;
  }

  try {
    return await network;
  } catch {
    // Nothing cached and the network failed: respondWith rejects on undefined.
    return new Response('', { status: 504, statusText: 'Sin conexión' });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(CACHE_PAGES);
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    const offline = await caches.match(OFFLINE_URL);
    return (
      offline ??
      new Response('Sin conexión', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    );
  }
}
