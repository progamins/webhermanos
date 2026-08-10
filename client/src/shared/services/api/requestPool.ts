/**
 * 🔄 Request Pool — evita el exceso de solicitudes al servidor.
 *
 * Problema que resuelve:
 * - El admin dispara ~8 requests al montar (products, orders, reviews, gallery,
 *   config, stock, kitchen, activity) → choca con el rate limit de 30/min del servidor.
 * - Requests GET idénticos disparados en paralelo duplican trabajo en el servidor.
 *
 * Solución (4 capas):
 * 1. **Concurrencia limitada**: nunca hay más de MAX_CONCURRENT fetches en vuelo.
 * 2. **Deduplicación**: requests GET con la misma URL en vuelo comparten la misma Promise.
 * 3. **Cache TTL**: datos públicos (products, reviews, gallery, config) se cachean
 *    en memoria por unos segundos y se devuelven instantáneamente.
 * 4. **Retry con backoff**: reintenta automáticamente errores transitorios
 *    (red caída, 429, 5xx) hasta MAX_ATTEMPTS veces.
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
      task.resolve(result);
    } catch (err) {
      // Retry solo para errores transitorios
      const shouldRetry = task.attempts < task.maxAttempts && this.isRetryable(err);
      if (shouldRetry) {
        task.attempts++;
        const delay = RETRY_DELAY_MS * task.attempts;
        setTimeout(() => this.queue.unshift(task), delay);
        return; // no resolver aún
      }
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
    return false;
  }
}

export const requestPool = new RequestPool();
