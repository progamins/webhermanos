// ─────────────────────────────────────────────
// Maison Rosas — Service Worker v1
// Caching strategy for faster repeat visits
// ─────────────────────────────────────────────

const CACHE_NAME = 'maison-rosas-v1';
const META_KEY = '__maison_cache_meta__';
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50 MB limit

// ── Metadata helpers for cache size management ──

// Estimate response size in bytes (best-effort)
function estimateResponseSize(response) {
  const len = response.headers.get('content-length');
  if (len) return parseInt(len, 10) || 0;
  // Fallback: rough estimate by content type
  const type = (response.headers.get('content-type') || '').toLowerCase();
  if (type.includes('image')) return 80 * 1024;      // ~80 KB avg
  if (type.includes('font') || type.includes('woff')) return 25 * 1024; // ~25 KB
  if (type.includes('javascript') || type.includes('ecmascript')) return 40 * 1024; // ~40 KB
  if (type.includes('css')) return 15 * 1024;          // ~15 KB
  return 30 * 1024; // default ~30 KB
}

// Get cache metadata from the cache itself
async function getCacheMeta(cache) {
  try {
    const metaResponse = await cache.match(META_KEY);
    if (metaResponse) {
      return await metaResponse.json();
    }
  } catch {}
  return { entries: {} }; // { entries: { url: { timestamp, size } } }
}

// Save cache metadata
async function saveCacheMeta(cache, meta) {
  const blob = new Blob([JSON.stringify(meta)], { type: 'application/json' });
  const response = new Response(blob, {
    headers: { 'Content-Type': 'application/json', 'Content-Length': String(blob.size) }
  });
  await cache.put(META_KEY, response);
}

// Enforce cache size limit — evict oldest entries if over limit
async function enforceCacheLimit(cache, meta) {
  const entries = Object.entries(meta.entries); // [[url, {timestamp, size}], ...]
  const totalSize = entries.reduce((sum, [, data]) => sum + (data.size || 0), 0);

  if (totalSize <= MAX_CACHE_SIZE) return;

  // Sort oldest first, evict until under limit
  const sorted = entries.sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));

  let freed = 0;
  const toDelete = [];
  for (const [url, data] of sorted) {
    if (totalSize - freed <= MAX_CACHE_SIZE) break;
    toDelete.push(url);
    freed += data.size || 0;
  }

  if (toDelete.length === 0) return;

  // Delete from cache and metadata
  await Promise.allSettled(toDelete.map((url) => cache.delete(url)));
  for (const url of toDelete) {
    delete meta.entries[url];
  }
  await saveCacheMeta(cache, meta);
}

// Record a cached entry in metadata and enforce limit
async function recordCacheEntry(cache, request, response) {
  const size = estimateResponseSize(response);
  const meta = await getCacheMeta(cache);
  meta.entries[request.url] = { timestamp: Date.now(), size };
  await saveCacheMeta(cache, meta);

  // Check and evict if over limit (fire-and-forget)
  enforceCacheLimit(cache, meta).catch(() => {});
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
      // Silently fail — non-critical
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
});

// ── Fetch: cache-first for images & fonts, network-first for API ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and non-http(s) requests
  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;
  if (url.origin === self.location.origin && url.pathname === '/sw.js') return;

  // Use request.destination (reliable) + pathname check for hashed assets
  const isImage = event.request.destination === 'image';
  const isFont = event.request.destination === 'font';
  const isHashedAsset = (event.request.destination === 'script' || event.request.destination === 'style')
    && /\/assets\/[a-zA-Z0-9_-]+-[a-f0-9]{8,}\.(js|css)$/i.test(url.pathname);

  // ── Images & Fonts & Hashed Assets: Cache-First ──
  if (isImage || isFont || isHashedAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
              // Track cache size and evict if needed
              recordCacheEntry(cache, event.request, clone);
            });
          }
          return response;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // ── API calls: Network-First with cache fallback ──
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
            recordCacheEntry(cache, event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // ── Everything else (HTML, etc.): Network-only ──
});
