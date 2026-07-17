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
const DB_VERSION = 1;
const STORE_NAME = 'critical_images';
const MAX_CRITICAL_ENTRIES = 10;
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
    if (mem) return mem;

    // 2. IndexedDB
    const db = await this.dbPromise;
    if (!db) return null;

    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);

      return new Promise((resolve) => {
        req.onsuccess = () => {
          const entry = req.result as CriticalEntry | undefined;
          if (entry && entry.timestamp > Date.now() - MAX_AGE_MS) {
            this.memoryBase64.set(url, entry.base64);
            resolve(entry.base64);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
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

