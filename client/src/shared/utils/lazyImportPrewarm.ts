// Prewarm helper for React.lazy chunks. Calling the dynamic import factory eagerly
// hints the browser to start downloading/parsing the module before the user clicks,
// making modal/component mounts feel instant. Vite deduplicates modules so the
// shared promise is reused by the later React.lazy mount.
type Importer<T> = () => Promise<T>;
const prewarmed = new Set<Importer<unknown>>();

/**
 * Trigger the dynamic import of a lazy chunk immediately (or on idle).
 * Safe to call multiple times; only the first call actually fetches.
 * Returns the module promise (shared with React.lazy via dedup).
 */
export function lazyImportPrewarm<T>(factory: Importer<T>): Promise<T> | void {
  try {
    if (prewarmed.has(factory as Importer<unknown>)) return;
    prewarmed.add(factory as Importer<unknown>);
    return factory();
  } catch {
    // ignore failures; not critical
  }
}
