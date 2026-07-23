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

class ImageMemoryCacheService {
  /** Almacena las imágenes ya cargadas en la sesión actual */
  private cache = new Map<string, HTMLImageElement>();

  /** URLs que ya están en proceso de carga (evita duplicados) */
  private loading = new Set<string>();

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
   * Precarga una imagen ANTES de que React la necesite.
   * Crea un new Image(), asigna src, y guarda la instancia.
   * No bloquea — la descarga se inicia pero no se espera.
   */
  preload(url: string): void {
    if (!url) return;
    if (this.cache.has(url)) return; // ya está cacheada
    if (this.loading.has(url)) return; // ya está en proceso

    this.loading.add(url);
    this.stats.preloads++;

    const img = new Image();
    img.fetchPriority = 'high';
    img.decoding = 'async';

    img.onload = () => {
      this.cache.set(url, img);
      this.loading.delete(url);
    };
    img.onerror = () => {
      this.loading.delete(url);
    };

    img.src = url;
  }

  /**
   * Precarga múltiples imágenes (hero, logo, etc.)
   */
  preloadAll(urls: string[]): void {
    for (const url of urls) {
      this.preload(url);
    }
  }

  /**
   * Limpia toda la caché.
   */
  clear(): void {
    this.cache.clear();
    this.loading.clear();
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
