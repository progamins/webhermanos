/**
 * 🔄 Request Pool — evita el exceso de solicitudes al servidor.
 *
 * Problema que resuelve:
 * - El admin dispara ~8 requests al montar (products, orders, reviews, gallery,
 *   config, stock, kitchen, activity) → choca con el rate limit del servidor.
 * - Requests GET idénticos disparados en paralelo duplican trabajo en el servidor.
 *
 * Solución (4 capas):
 * 1. **Concurrencia limitada**: nunca hay más de MAX_CONCURRENT fetches en vuelo.
 * 2. **Deduplicación**: requests GET con la misma URL en vuelo comparten la misma Promise.
 * 3. **Cache TTL**: datos públicos (products, reviews, gallery, config) se cachean
 *    en memoria por unos segundos y se devuelven instantáneamente.
 * 4. **Retry inteligente**: reintenta errores transitorios (red caída, 5xx) con
 *    backoff exponencial + jitter. Para 429 respeta el header `Retry-After` del
 *    servidor y NO martilla en silencio: si la espera es larga falla y emite el
 *    evento `maison:ratelimited` para que la UI muestre un aviso persistente.
 */

interface PooledTask {
  key: string;
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  isMutating: boolean;
  attempts: number;
  maxAttempts: number;
}

const MAX_CONCURRENT = 5;        // máx. fetches simultáneos
const CACHE_TTL_MS = 10_000;     // 10s para datos públicos
const RETRY_DELAY_MS = 400;      // backoff base
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
// 🚦 429: si el servidor pide esperar más de esto (Retry-After), NO reintentar
// en silencio — se falla y el panel muestra el banner (el polling lo reintenta).
const MAX_SILENT_RETRY_AFTER_MS = 5_000;
// 429 con espera corta: como máximo 1 reintento diferido (evita martillar).
const MAX_429_ATTEMPTS = 1;

/**
 * Notifica el estado real de la red a la app (evento 'maison:network').
 * El hook useOnline lo escucha para mostrar la pantalla offline personalizada
 * incluso cuando navigator.onLine aún no se actualizó.
 */
function notifyNetwork(online: boolean) {
  try {
    window.dispatchEvent(new CustomEvent('maison:network', { detail: { online } }));
  } catch {
    /* no crítico */
  }
}

/**
 * Notifica que el servidor devolvió 429 (rate limit) para que la UI muestre
 * un aviso persistente en vez de reintentar en silencio.
 */
function notifyRateLimited(retryAfterMs: number) {
  try {
    window.dispatchEvent(new CustomEvent('maison:ratelimited', { detail: { retryAfterMs } }));
  } catch {
    /* no crítico */
  }
}

/** Notifica que las solicitudes volvieron a funcionar (oculta el aviso). */
function notifyRateLimitCleared() {
  try {
    window.dispatchEvent(new CustomEvent('maison:ratelimited:clear'));
  } catch {
    /* no crítico */
  }
}

/** Extrae el status HTTP de un error lanzado por el client (0 si no aplica). */
function getStatus(err: unknown): number {
  if (err && typeof err === 'object' && 'status' in err) {
    const s = Number((err as any).status);
    if (Number.isFinite(s)) return s;
  }
  const m = err instanceof Error ? err.message.match(/^(\d{3})/) : null;
  return m ? Number(m[1]) : 0;
}

/** Extrae Retry-After (en ms) del error si el servidor lo indicó. */
function getRetryAfterMs(err: unknown): number {
  const ra = err && typeof err === 'object' ? (err as any).retryAfter : undefined;
  const n = Number(ra);
  return Number.isFinite(n) && n > 0 ? n * 1000 : 0;
}

class RequestPool {
  private active = 0;
  private queue: PooledTask[] = [];
  /** key → Promise en vuelo (deduplicación) */
  private inflight = new Map<string, Promise<unknown>>();
  /** key → { value, expiresAt } para cache TTL */
  private cache = new Map<string, { value: unknown; expiresAt: number }>();

  /**
   * Ejecuta una petición con todas las protecciones.
   *
   * @param key Clave única (URL + method). Se usa para dedupe y cache.
   * @param fn Función que ejecuta el fetch real.
   * @param opts.mutating Si es POST/PUT/DELETE → no cachear ni dedupe (solo concurrencia).
   * @param opts.cacheTtlMs Si > 0, cachea el resultado (solo GET públicos).
   * @param opts.maxAttempts Reintentos para errores transitorios.
   */
  run<T>(
    key: string,
    fn: () => Promise<T>,
    opts: { mutating?: boolean; cacheTtlMs?: number; maxAttempts?: number } = {}
  ): Promise<T> {
    const { mutating = false, cacheTtlMs = 0, maxAttempts = mutating ? 1 : 3 } = opts;

    // 1. Cache hit (solo GET no mutating con TTL)
    if (!mutating && cacheTtlMs > 0) {
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return Promise.resolve(cached.value as T);
      }
    }

    // 2. Deduplicación (solo GET en vuelo)
    if (!mutating) {
      const existing = this.inflight.get(key);
      if (existing) return existing as Promise<T>;
    }

    // 3. Encolar con límite de concurrencia + retry
    const promise = new Promise<T>((resolve, reject) => {
      const task: PooledTask = {
        key,
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        isMutating: mutating,
        attempts: 0,
        maxAttempts,
      };
      this.queue.push(task);
      this.drain();
    });

    // Registrar en vuelo para dedupe (GET)
    if (!mutating) {
      this.inflight.set(key, promise);
      promise.finally(() => {
        this.inflight.delete(key);
      });
    }

    // Cachear resultado (GET con TTL)
    if (!mutating && cacheTtlMs > 0) {
      promise
        .then(value => {
          this.cache.set(key, { value, expiresAt: Date.now() + cacheTtlMs });
          this.pruneCache();
        })
        .catch(() => { /* no cachear errores */ });
    }

    // 🔒 Las mutaciones exitosas invalidan el cache: los datos públicos
    //    (products, config, gallery) pueden haber cambiado en el servidor.
    if (mutating) {
      promise
        .then(() => this.clearCache())
        .catch(() => { /* no invalidar en errores */ });
    }

    return promise;
  }

  /** Limpia entradas vencidas del cache. */
  private pruneCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key);
    }
  }

  /** Invalida una clave del cache (útil tras mutaciones del mismo recurso). */
  invalidate(key: string) {
    this.cache.delete(key);
  }

  /** Vacía todo el cache (p.ej. al refrescar datos). */
  clearCache() {
    this.cache.clear();
  }

  private drain() {
    while (this.active < MAX_CONCURRENT && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.active++;
      this.executeTask(task)
        .finally(() => {
          this.active--;
          this.drain();
        });
    }
  }

  private async executeTask(task: PooledTask) {
    try {
      const result = await task.fn();
      // Cualquier petición exitosa significa que hay red y que el rate limit se liberó.
      notifyNetwork(true);
      notifyRateLimitCleared();
      task.resolve(result);
    } catch (err) {
      const status = getStatus(err);
      const retryAfterMs = getRetryAfterMs(err);

      // 429 → aviso global para que el panel muestre el banner.
      if (status === 429) {
        notifyRateLimited(retryAfterMs > 0 ? retryAfterMs : 60_000);
      }

      // 🚦 429 con espera larga (o sin Retry-After): fallar ya. Reintentar en
      //    silencio solo empeora la saturación; el polling del panel o la
      //    próxima acción del usuario reintentará con el banner visible.
      const silentRetryBlocked = status === 429 && (retryAfterMs <= 0 || retryAfterMs > MAX_SILENT_RETRY_AFTER_MS);
      const maxAttempts = status === 429 ? MAX_429_ATTEMPTS : task.maxAttempts;

      const shouldRetry = !silentRetryBlocked && task.attempts < maxAttempts && this.isRetryable(err);
      if (shouldRetry) {
        task.attempts++;
        // Esperar lo que pida el servidor (Retry-After) o backoff exponencial con jitter.
        const baseDelay = retryAfterMs > 0 ? retryAfterMs : RETRY_DELAY_MS * Math.pow(2, task.attempts - 1);
        const delay = Math.min(baseDelay + baseDelay * 0.2 * Math.random(), 5_000);
        setTimeout(() => this.queue.unshift(task), delay);
        return; // no resolver aún
      }
      // Se agotaron los reintentos. Solo reportamos OFFLINE si es un error real
      // de red (no un 5xx del servidor — el usuario sí tiene internet y un error
      // HTTP no debería disparar la pantalla offline).
      if (this.isNetworkError(err)) notifyNetwork(false);
      task.reject(err);
    }
  }

  /** Determina si un error es transitorio (vale la pena reintentar). */
  private isRetryable(err: unknown): boolean {
    if (err instanceof Error) {
      // Errores de red/parse
      if (/fetch failed|network|load failed|ECONN/i.test(err.message)) return true;
      // 429 / 5xx
      const m = err.message.match(/^(\d{3})/);
      if (m) return RETRYABLE_STATUS.has(Number(m[1]));
    }
    if (err && typeof err === 'object' && 'status' in err) {
      return RETRYABLE_STATUS.has(Number((err as any).status));
    }
    return false;
  }

  /** True solo si es una pérdida real de red (no un error HTTP del servidor). */
  private isNetworkError(err: unknown): boolean {
    if (err instanceof Error) {
      return /fetch failed|network|load failed|ECONN|failed to fetch/i.test(err.message);
    }
    return false;
  }
}

export const requestPool = new RequestPool();
