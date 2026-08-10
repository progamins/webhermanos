/**
 * ImageMemoryCache — Caché global en memoria (Map<string, HTMLImageElement>)
 *
 * Cuando una imagen crítica (Hero, Logo, About) ya fue descargada una vez
 * en la sesión actual, se reutiliza la misma instancia de HTMLImageElement.
 * Nunca se vuelve a descargar durante la misma sesión.
 *
 * @usage
 *   import { imageMemoryCache } from '../utils/imageMemoryCache';
 *   imageMemoryCache.preload(url);
 *   if (imageMemoryCache.has(url)) { ... }
 */

type PreloadPriority = 'high' | 'medium' | 'low';

/** Máx. descargas simultáneas — evita saturar el ancho de banda del usuario */
const MAX_CONCURRENT_LOADS = 4;

class ImageMemoryCacheService {
  /** Almacena las imágenes ya cargadas en la sesión actual */
  private cache = new Map<string, HTMLImageElement>();

  /** URLs que ya están en proceso de carga (evita duplicados) */
  private loading = new Set<string>();

  /** Cola de precarga por prioridad (alto → medio → bajo) */
  private queueHigh: string[] = [];
  private queueMedium: string[] = [];
  private queueLow: string[] = [];

  /** Estadísticas */
  public stats = { hits: 0, preloads: 0 };

  /**
   * Obtiene una imagen de la caché. Si no existe, la descarga y cachea.
   * @returns La URL de la imagen (si ya está en caché, la carga es instantánea)
   */
  get(url: string): HTMLImageElement | undefined {
    return this.cache.get(url);
  }

  /**
   * Verifica si una imagen ya está en caché.
   */
  has(url: string): boolean {
    return this.cache.has(url);
  }

  /**
   * Precarga una imagen con prioridad alta (fetchPriority='high').
   * Se usa para el hero y el logo (LCP) — los más importantes.
   */
  preload(url: string): void {
    this.enqueue(url, 'high');
  }

  /**
   * Precarga múltiples imágenes (hero, logo, etc.) con prioridad alta.
   */
  preloadAll(urls: string[]): void {
    this.enqueueMany(urls, 'high');
  }

  /**
   * Precarga una imagen con prioridad media — primera fila del catálogo,
   * visible sin scroll. fetchPriority='high' pero sin saltar la cola.
   */
  preloadMedium(url: string): void {
    this.enqueue(url, 'medium');
  }

  /**
   * Precarga una imagen con prioridad baja — resto de la página, se
   * descarga en idle para no competir con el contenido visible.
   */
  preloadLow(url: string): void {
    this.enqueue(url, 'low');
  }

  /**
   * Precarga en lote por prioridad. Útil para el catálogo: las primeras
   * imágenes visibles van en 'medium', el resto en 'low'.
   */
  preloadBatch(urls: string[], priority: PreloadPriority = 'low'): void {
    for (const url of urls) {
      this.enqueue(url, priority);
    }
  }

  /**
   * Encola una URL en la cola de su prioridad y arranca el drain si hay hueco.
   */
  private enqueue(url: string, priority: PreloadPriority): void {
    if (!url) return;
    if (this.cache.has(url)) return; // ya cacheada
    if (this.loading.has(url)) return; // ya en proceso

    const queue = priority === 'high' ? this.queueHigh : priority === 'medium' ? this.queueMedium : this.queueLow;
    if (queue.includes(url)) return;
    queue.push(url);
    this.drain();
  }

  private enqueueMany(urls: string[], priority: PreloadPriority): void {
    for (const url of urls) {
      this.enqueue(url, priority);
    }
  }

  /**
   * Procesa la cola respetando prioridades y el límite de concurrencia.
   * Se llama en cada enqueue y cuando una carga termina.
   */
  private drain(): void {
    while (this.loading.size < MAX_CONCURRENT_LOADS) {
      // Prioridad: sacar primero de la cola alta, luego media, luego baja
      const next = this.queueHigh.length > 0
        ? { url: this.queueHigh.shift()!, priority: 'high' as const }
        : this.queueMedium.length > 0
          ? { url: this.queueMedium.shift()!, priority: 'auto' as const }
          : this.queueLow.length > 0
            ? { url: this.queueLow.shift()!, priority: 'auto' as const }
            : null;
      if (!next) break;
      if (this.cache.has(next.url) || this.loading.has(next.url)) continue;
      this.startLoad(next.url, next.priority);
    }
  }

  private startLoad(url: string, priority: 'high' | 'auto' = 'auto'): void {
    this.loading.add(url);
    this.stats.preloads++;

    const img = new Image();
    img.fetchPriority = priority;
    img.decoding = 'async';

    img.onload = () => {
      this.cache.set(url, img);
      this.loading.delete(url);
      this.drain();
    };
    img.onerror = () => {
      this.loading.delete(url);
      this.drain();
    };

    img.src = url;
  }

  /**
   * Limpia toda la caché.
   */
  clear(): void {
    this.cache.clear();
    this.loading.clear();
    this.queueHigh = [];
    this.queueMedium = [];
    this.queueLow = [];
  }

  /**
   * Reemplaza la URL de una imagen en la caché (cuando cambia desde Firestore).
   * Descarga la nueva imagen en segundo plano y actualiza la entrada.
   */
  async update(url: string): Promise<void> {
    this.cache.delete(url);
    this.loading.delete(url);
    this.preload(url);
  }

  get size(): number {
    return this.cache.size;
  }

  get loadingCount(): number {
    return this.loading.size;
  }
}

// Instancia singleton global
export const imageMemoryCache = new ImageMemoryCacheService();

/**
 * Hook: verifica el origen de carga de una imagen (para métricas de rendimiento)
 */
export function getImageLoadOrigin(url: string): string {
  if (!url) return 'none';
  
  // En una sesión real, el navegador ya cacheó la imagen en su Memory Cache
  // No podemos detectar programáticamente si vino de Memory/Disk/Network Cache,
  // pero podemos inferirlo:
  if (imageMemoryCache.has(url)) return 'memory_cache';
  return 'network';
}
