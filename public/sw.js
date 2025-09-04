/* PWA Service Worker with app-shell, image SWR caching, pruning */
const VERSION = 'v4';
const STATIC_CACHE = `sm-static-${VERSION}`;
const IMAGE_CACHE = `sm-img-${VERSION}`;
const ROUTE_CACHE = `sm-routes-${VERSION}`;
const IMAGE_CACHE_MAX_ENTRIES = 150; // pruning threshold

// Core shell & routes to precache
const PRECACHE_ROUTES = [ '/', '/app/start', '/app/console', '/app/lists' ];

// Broadcast channel for update notifications
const bc = ('BroadcastChannel' in self) ? new BroadcastChannel('sw-updates') : null;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(PRECACHE_ROUTES);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![STATIC_CACHE, IMAGE_CACHE, ROUTE_CACHE].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
    bc && bc.postMessage({ type: 'SW_ACTIVATED', version: VERSION });
  })());
});

// Helper: stale-while-revalidate for Shopify CDN images with pruning
async function pruneImageCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= IMAGE_CACHE_MAX_ENTRIES) return;
  const overflow = keys.length - IMAGE_CACHE_MAX_ENTRIES;
  for (let i = 0; i < overflow; i++) {
    await cache.delete(keys[i]);
  }
}

async function handleShopifyImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(res => {
    if (res.ok) cache.put(request, res.clone());
    pruneImageCache(cache);
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// Immutable build assets: cache-first
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

// HTML documents: network-first with fallback to cached route shell
async function handleHtml(request) {
  try {
    const res = await fetch(request);
    const cache = await caches.open(ROUTE_CACHE);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const cache = await caches.open(ROUTE_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    return caches.match('/');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.hostname === 'cdn.shopify.com') {
    event.respondWith(handleShopifyImage(request));
    return;
  }
  if (url.pathname.startsWith('/_next/static')) {
    event.respondWith(handleStaticAsset(request));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(handleHtml(request));
    return;
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
