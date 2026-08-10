/**
 * ImageCache v2 — Caché de imágenes críticas (Hero, Logo, About)
 *
 * Solo almacena las imágenes críticas en IndexedDB (máx 10 entradas).
 * El resto de imágenes usan el MemoryCache + Service Worker + HTTP Cache.
 *
 * Flujo:
 * 1. MemoryCache (HTMLImageElement) — instantáneo, misma sesión
 * 2. IndexedDB — persistente entre sesiones (solo críticas)
 * 3. Service Worker Cache — Cache-First para /uploads/
 * 4. HTTP Cache (navegador) — Disk/Memory Cache
 * 5. Red — última opción
 */

const DB_NAME = 'MaisonRosasCache';
const DB_VERSION = 2;
const STORE_NAME = 'critical_images';
// Ampliado: además de hero/logo/about, se cachean las portadas del catálogo
// para que las visitas repetidas carguen imágenes de forma INSTANTÁNEA.
const MAX_CRITICAL_ENTRIES = 60;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

interface CriticalEntry {
  url: string;
  base64: string;
  timestamp: number;
}

const CRITICAL_PREFIXES = ['maison_hero_url', 'maison_logo_url', 'maison_about_url', 'maison_favicon_url'];

class CriticalImageCache {
  private memoryBase64 = new Map<string, string>();
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  /** Estadísticas de uso (hits/misses de memoria + IndexedDB) */
  public stats = { hits: 0, misses: 0 };

  constructor() {
    if (typeof indexedDB !== 'undefined') {
      this.initDB();
    }
  }

  private initDB(): void {
    this.dbPromise = new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'url' });
        }
      };

      request.onsuccess = () => {
        this.warmUp(request.result);
        resolve(request.result);
      };

      request.onerror = () => resolve(null);
    });
  }

  private async warmUp(db: IDBDatabase) {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries: CriticalEntry[] = request.result || [];
        for (const entry of entries) {
          if (entry.timestamp > Date.now() - MAX_AGE_MS) {
            this.memoryBase64.set(entry.url, entry.base64);
          }
        }
      };
    } catch { /* ignore */ }
  }

  /** Busca una URL en memoria o IndexedDB */
  async get(url: string): Promise<string | null> {
    // 1. Memoria (instantáneo)
    const mem = this.memoryBase64.get(url);
    if (mem) {
      this.stats.hits++;
      return mem;
    }

    // 2. IndexedDB
    const db = await this.dbPromise;
    if (!db) {
      this.stats.misses++;
      return null;
    }

    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);

      return new Promise((resolve) => {
        req.onsuccess = () => {
          const entry = req.result as CriticalEntry | undefined;
          if (entry && entry.timestamp > Date.now() - MAX_AGE_MS) {
            this.memoryBase64.set(url, entry.base64);
            this.stats.hits++;
            resolve(entry.base64);
          } else {
            this.stats.misses++;
            resolve(null);
          }
        };
        req.onerror = () => {
          this.stats.misses++;
          resolve(null);
        };
      });
    } catch {
      this.stats.misses++;
      return null;
    }
  }

  /** Guarda una imagen en IndexedDB (solo si es crítica) */
  async set(url: string, base64: string): Promise<void> {
    this.memoryBase64.set(url, base64);

    const db = await this.dbPromise;
    if (!db) return;

    const entry: CriticalEntry = { url, base64, timestamp: Date.now() };
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      await store.put(entry);
      // Limpiar si hay demasiadas entradas
      this.prune(db);
    } catch { /* ignore */ }
  }

  private async prune(db: IDBDatabase) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const entries: CriticalEntry[] = req.result || [];
        if (entries.length > MAX_CRITICAL_ENTRIES) {
          entries.sort((a, b) => a.timestamp - b.timestamp);
          const toDelete = entries.slice(0, entries.length - MAX_CRITICAL_ENTRIES);
          for (const e of toDelete) {
            store.delete(e.url);
          }
        }
      };
    } catch { /* ignore */ }
  }

  has(url: string): boolean {
    return this.memoryBase64.has(url);
  }

  /** Estadísticas agregadas para el panel de rendimiento */
  getStats() {
    return {
      entries: this.memoryBase64.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      supported: typeof indexedDB !== 'undefined',
    };
  }

  async clear(): Promise<void> {
    this.memoryBase64.clear();
    const db = await this.dbPromise;
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
      } catch { /* ignore */ }
    }
  }
}

export const criticalImageCache = new CriticalImageCache();

// Mantener compatibilidad con importaciones existentes
export const imageCache = {
  get: (url: string) => criticalImageCache.get(url),
  has: (url: string) => criticalImageCache.has(url),
  preload: (urls: string[]) => {
    for (const url of urls) {
      criticalImageCache.get(url).catch(() => {});
    }
  },
  clear: () => criticalImageCache.clear(),
};

export function getCachedImageUrl(url: string): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  return criticalImageCache.get(url);
}

export function preloadImages(urls: string[]): void {
  for (const url of urls) {
    if (url) criticalImageCache.get(url).catch(() => {});
  }
}

/**
 * Guarda una imagen (base64) en el cache persistente de IndexedDB.
 * Se usa tras descargar una imagen para que la próxima visita sea instantánea.
 */
export function cacheImageForOffline(url: string, base64: string): void {
  if (!url || !base64) return;
  criticalImageCache.set(url, base64).catch(() => {});
}

/* ═══════════════════════════════════════════════
   SOPORTE AVIF — convierte las imágenes cacheadas a
   AVIF (comprime ~30-50% mejor que WebP) para que el
   caché persistente ocupe menos y cargue más rápido.
   ═══════════════════════════════════════════════ */

let _avifSupport: boolean | null = null;

/** Detecta si el navegador puede CODIFICAR AVIF (Chrome/Edge). */
export function isAvifSupported(): boolean {
  if (_avifSupport !== null) return _avifSupport;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    _avifSupport = canvas.toDataURL('image/avif').startsWith('data:image/avif');
  } catch {
    _avifSupport = false;
  }
  return _avifSupport;
}

function blobToBase64(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * Convierte un Blob a AVIF cuando es posible y más pequeño que el original.
 * Si el navegador no soporta AVIF (o la conversión sale más grande, ej: PNG
 * re-codificado), devuelve el blob original — nunca empeora el resultado.
 * Limita las dimensiones a 1600px para no inflar el caché con fotos gigantes.
 */
export async function convertBlobToAvif(blob: Blob, quality = 0.8): Promise<Blob> {
  try {
    // Si el navegador no puede codificar AVIF, devolver el original sin tocar
    // (evita un round-trip por canvas que produciría un PNG inútil).
    if (!isAvifSupported()) return blob;
    if (typeof createImageBitmap !== 'function' || typeof ImageBitmap === 'undefined') return blob;

    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, 1600 / bitmap.width, 1600 / bitmap.height);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return blob;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    // toBlob('image/avif') → null si no soportado; PNG si es tipo desconocido.
    const encoded = await new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob(resolve, 'image/avif', quality);
      } catch {
        resolve(null);
      }
    });

    // Solo usar la versión AVIF si es genuinamente más liviana.
    if (encoded && encoded.size > 0 && encoded.size < blob.size * 0.9) return encoded;
    return blob;
  } catch {
    return blob;
  }
}

/**
 * Guarda un Blob en el caché persistente convirtiéndolo a AVIF
 * (si el navegador lo soporta y el resultado es más liviano).
 */
export async function cacheImageBlobForOffline(url: string, blob: Blob): Promise<void> {
  if (!url || !blob || blob.size === 0) return;
  try {
    const optimized = await convertBlobToAvif(blob);
    const base64 = await blobToBase64(optimized);
    if (base64) cacheImageForOffline(url, base64);
  } catch {
    // no crítico
  }
}

