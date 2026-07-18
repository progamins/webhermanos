// ─────────────────────────────────────────────
// Maison Rosas — Service Worker v2
// Caching strategy for faster repeat visits
// ─────────────────────────────────────────────

const CACHE_NAME = 'maison-rosas-v1';
const META_KEY = '__maison_cache_meta__';
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50 MB limit

// ── Metadata helpers for cache size management ──

function estimateResponseSize(response) {
  const len = response.headers.get('content-length');
  if (len) return parseInt(len, 10) || 0;
  const type = (response.headers.get('content-type') || '').toLowerCase();
  if (type.includes('image')) return 80 * 1024;
  if (type.includes('font') || type.includes('woff')) return 25 * 1024;
  if (type.includes('javascript') || type.includes('ecmascript')) return 40 * 1024;
  if (type.includes('css')) return 15 * 1024;
  return 30 * 1024;
}

async function getCacheMeta(cache) {
  try {
    const metaResponse = await cache.match(META_KEY);
    if (metaResponse) {
      return await metaResponse.json();
    }
  } catch {}
  return { entries: {} };
}

async function saveCacheMeta(cache, meta) {
  try {
    const blob = new Blob([JSON.stringify(meta)], { type: 'application/json' });
    const response = new Response(blob, {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(META_KEY, response);
  } catch {
    // Silently fail — cache metadata is non-critical
  }
}

async function enforceCacheLimit(cache, meta) {
  const entries = Object.entries(meta.entries);
  const totalSize = entries.reduce((sum, [, data]) => sum + (data.size || 0), 0);

  if (totalSize <= MAX_CACHE_SIZE) return;

  const sorted = entries.sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));

  let freed = 0;
  const toDelete = [];
  for (const [url, data] of sorted) {
    if (totalSize - freed <= MAX_CACHE_SIZE) break;
    toDelete.push(url);
    freed += data.size || 0;
  }

  if (toDelete.length === 0) return;

  await Promise.allSettled(toDelete.map((url) => cache.delete(url)));
  for (const url of toDelete) {
    delete meta.entries[url];
  }
  await saveCacheMeta(cache, meta);
}

async function recordCacheEntry(cache, request, response) {
  // Only cache valid responses
  if (!response || !response.ok || response.type === 'opaque' || response.type === 'error') return;

  try {
    const size = estimateResponseSize(response);
    const meta = await getCacheMeta(cache);
    meta.entries[request.url] = { timestamp: Date.now(), size };
    await saveCacheMeta(cache, meta);
    enforceCacheLimit(cache, meta).catch(() => {});
  } catch {
    // Non-critical
  }
}

/**
 * Safely caches a response. Returns true if cached, false otherwise.
 */
async function safeCachePut(cache, request, response) {
  if (!response || !response.ok) return false;
  // Skip opaque responses from third-party CDNs (CORS issues)
  if (response.type === 'opaque' || response.type === 'error') return false;
  // Skip data: URLs and blob: URLs
  if (request.url.startsWith('data:') || request.url.startsWith('blob:')) return false;

  try {
    const clone = response.clone();
    await cache.put(request, clone);
    recordCacheEntry(cache, request, clone).catch(() => {});
    return true;
  } catch (err) {
    // Cache.put() can fail for various reasons (network errors, opaque responses, etc.)
    // This is safe to ignore — the browser will fetch normally next time
    return false;
  }
}

// ── Install: precache essential static assets ──
const PRECACHE_URLS = [];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      self.skipWaiting();
    }).catch(() => {
      // Non-critical
    })
  );
});

// ── Activate: clean old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});  // ── Fetch: cache-first for images & fonts, network-first for API ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and non-http(s) requests
  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;
  if (url.origin === self.location.origin && url.pathname === '/sw.js') return;

  const isImage = event.request.destination === 'image';
  const isLocalUpload = url.origin === self.location.origin && url.pathname.startsWith('/uploads/');
  const isFont = event.request.destination === 'font';
  const isHashedAsset = (event.request.destination === 'script' || event.request.destination === 'style')
    && /\/assets\/[a-zA-Z0-9_-]+-[a-f0-9]{8,}\.(js|css)$/i.test(url.pathname);

  // ── Uploads locales: Cache-First con prioridad máxima ──
  if (isLocalUpload) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;

        return fetch(event.request).then((response) => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              safeCachePut(cache, event.request, response);
            });
          }
          return response;
        }).catch(() => {
          return new Response('', { status: 204 });
        });
      })
    );
    return;
  }

  // ── Images & Fonts & Hashed Assets: Cache-First ──
  if (isImage || isFont || isHashedAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;

        return fetch(event.request).then((response) => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              safeCachePut(cache, event.request, response);
            });
          }
          return response;
        }).catch(() => {
          // Network failed and no cache — return a transparent placeholder for images
          if (isImage) {
            return new Response('', { status: 204 });
          }
          return new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  // ── API calls: Network-First with cache fallback ──
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            safeCachePut(cache, event.request, response);
          });
        }
        return response;
      }).catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
    return;
  }

  // ── Everything else (HTML, etc.): Network-only ──
});
