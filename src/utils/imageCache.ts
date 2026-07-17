/**
 * ImageCache — Servicio de caché de imágenes en base64
 *
 * Funciona en dos niveles:
 * 1. **Map en memoria** — acceso instantáneo (como Redis en cliente)
 * 2. **IndexedDB** — persistencia entre recargas de página
 *
 * Convierte las URLs de imágenes a base64 de forma asíncrona,
 * mostrando un spinner mientras se completa la carga.
 * Evita congelar la UX porque nunca bloquea el hilo principal.
 *
 * @usage
 *   import { imageCache } from '../utils/imageCache';
 *   const b64 = await imageCache.get('https://...');
 */

const DB_NAME = 'MaisonRosasImageCache';
const DB_VERSION = 1;
const STORE_NAME = 'images';
const MAX_CACHE_ENTRIES = 100;           // máx entradas en memoria
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

// ─── Tipos ───

interface CacheEntry {
  url: string;
  base64: string;
  timestamp: number;
  size: number;
}

interface PendingPromise {
  promise: Promise<string>;
}

// ─── Servicio Singleton ───

class ImageCacheService {
  /** Caché en memoria (lectura instantánea) */
  private memoryCache = new Map<string, CacheEntry>();

  /** Promesas pendientes para evitar duplicar fetches concurrentes */
  private pendingFetches = new Map<string, PendingPromise>();

  /** Referencia a la base de datos IndexedDB */
  private dbPromise: Promise<IDBDatabase> | null = null;

  /** Estadísticas */
  public stats = { hits: 0, misses: 0, dbHits: 0 };

  constructor() {
    this.initDB();
  }

  // ─── Inicialización de IndexedDB ───

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null as unknown as IDBDatabase);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        this.cleanExpiredEntries(db);
        this.warmUpMemoryCache(db);

        // Heartbeat de limpieza cada 5 minutos
        if (typeof setInterval !== 'undefined') {
          setInterval(() => this.cleanExpiredEntries(db), 5 * 60 * 1000);
        }

        resolve(db);
      };

      request.onerror = () => {
        console.warn('[ImageCache] No se pudo abrir IndexedDB:', request.error);
        resolve(null as unknown as IDBDatabase);
      };
    });

    return this.dbPromise;
  }

  private cleanExpiredEntries(db: IDBDatabase | null) {
    if (!db) return;
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const cutoff = Date.now() - MAX_AGE_MS;
      const range = IDBKeyRange.upperBound(cutoff);
      const request = index.openCursor(range);

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
      request.onerror = () => {}; // no-op seguro
    } catch {
      // Silencioso
    }
  }

  private async warmUpMemoryCache(db: IDBDatabase | null) {
    if (!db) return;
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      let count = 0;

      return new Promise<void>((resolve) => {
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor && count < MAX_CACHE_ENTRIES) {
            const entry = cursor.value as CacheEntry;
            this.memoryCache.set(entry.url, entry);
            count++;
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => resolve();
      });
    } catch {
      // Silencioso
    }
  }

  // ─── Gestión de tamaño de IndexedDB ───

  private async ensureDBSize(db: IDBDatabase) {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const countReq = store.count();

      return new Promise<void>((resolve) => {
        countReq.onsuccess = () => {
          const count = countReq.result;
          if (count > MAX_CACHE_ENTRIES * 2) {
            this.pruneOldEntries(db, MAX_CACHE_ENTRIES);
          }
          resolve();
        };
        countReq.onerror = () => resolve();
      });
    } catch {
      // Silencioso
    }
  }

  private async pruneOldEntries(db: IDBDatabase, keepCount: number) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      let count = 0;

      return new Promise<void>((resolve) => {
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            count++;
            if (count > keepCount) {
              store.delete(cursor.primaryKey);
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => resolve();
      });
    } catch {
      // Silencioso
    }
  }

  // ─── API Pública ───

  /**
   * Obtiene una imagen en base64 desde la caché.
   * Si no está en caché, la descarga, convierte a base64 y la almacena.
   * Nunca bloquea — devuelve una Promise.
   */
  async get(url: string): Promise<string> {
    if (!url) return url;

    // 1. Buscar en memoria (instantáneo)
    const memEntry = this.memoryCache.get(url);
    if (memEntry) {
      this.stats.hits++;
      return memEntry.base64;
    }

    // 2. Buscar en IndexedDB
    const dbEntry = await this.getFromDB(url);
    if (dbEntry) {
      this.stats.dbHits++;
      this.memoryCache.set(url, dbEntry);
      return dbEntry.base64;
    }

    // 3. Evitar duplicar fetches concurrentes
    const pending = this.pendingFetches.get(url);
    if (pending) {
      return pending.promise;
    }

    // 4. Descargar y convertir
    this.stats.misses++;
    return this.fetchAndCache(url);
  }

  /**
   * Verifica si una URL ya está en la caché en memoria (síncrono, instantáneo).
   */
  has(url: string): boolean {
    return this.memoryCache.has(url);
  }

  /**
   * Precarga una lista de URLs en segundo plano (sin esperar el resultado)
   */
  preload(urls: string[]): void {
    for (const url of urls) {
      if (this.memoryCache.has(url)) continue;
      this.get(url).catch(() => {});
    }
  }

  /**
   * Limpia toda la caché (memoria + IndexedDB)
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    const db = await this.dbPromise;
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
      } catch {
        // Silencioso
      }
    }
  }

  /**
   * Obtiene estadísticas detalladas de la caché
   */
  async getStats() {
    let dbSize = 0;
    const db = await this.dbPromise;
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const countReq = store.count();
        dbSize = await new Promise<number>((resolve) => {
          countReq.onsuccess = () => resolve(countReq.result);
          countReq.onerror = () => resolve(0);
        });
      } catch {
        // Silencioso
      }
    }

    return {
      memoryEntries: this.memoryCache.size,
      dbEntries: dbSize,
      ...this.stats,
      pendingFetches: this.pendingFetches.size,
    };
  }

  // ─── Métodos Privados ───

  private async getFromDB(url: string): Promise<CacheEntry | null> {
    const db = await this.dbPromise;
    if (!db) return null;

    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(url);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const entry = request.result as CacheEntry | undefined;
          if (entry && entry.timestamp > Date.now() - MAX_AGE_MS) {
            resolve(entry);
          } else {
            if (entry) {
              const delTx = db.transaction(STORE_NAME, 'readwrite');
              delTx.objectStore(STORE_NAME).delete(url);
            }
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  private async fetchAndCache(url: string): Promise<string> {
    const promise = this._doFetch(url);

    const pending: PendingPromise = { promise };
    this.pendingFetches.set(url, pending);

    try {
      const base64 = await promise;
      return base64;
    } finally {
      this.pendingFetches.delete(url);
    }
  }

  private async _doFetch(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        cache: 'force-cache', // aprovechar caché HTTP del navegador
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const base64 = await blobToBase64(blob);

      const entry: CacheEntry = {
        url,
        base64,
        timestamp: Date.now(),
        size: blob.size,
      };

      this.memoryCache.set(url, entry);
      this.saveToDB(entry); // background

      return base64;
    } catch {
      // Fallback: devolver URL original para que <img> cargue directamente
      return url;
    }
  }

  private async saveToDB(entry: CacheEntry) {
    const db = await this.dbPromise;
    if (!db) return;

    try {
      await this.ensureDBSize(db);
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(entry);
    } catch {
      // Silencioso — en memoria sigue disponible
    }
  }
}

// ─── Utilidad: Blob → Base64 ───

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader result is not a string'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

// ─── Instancia Singleton ───

export const imageCache = new ImageCacheService();

/**
 * Obtiene la URL en base64 de una imagen desde la caché.
 * Mientras se resuelve la promesa, puedes mostrar un spinner.
 */
export function getCachedImageUrl(url: string): Promise<string> {
  if (!url) return Promise.resolve(url);
  return imageCache.get(url);
}

/**
 * Precarga múltiples imágenes en la caché (dispara en background).
 */
export function preloadImages(urls: string[]): void {
  imageCache.preload(urls);
}
