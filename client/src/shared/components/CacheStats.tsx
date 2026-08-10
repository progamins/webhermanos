import { useState, useEffect, useCallback } from 'react';
import { imageMemoryCache } from '../utils/imageMemoryCache';
import { criticalImageCache, isAvifSupported } from '../utils/imageCache';
import { Database, Zap, Trash2, Loader2, ImageOff } from 'lucide-react';

interface CacheStatsSnapshot {
  mem: { entries: number; loading: number; queued: number; hits: number; preloads: number };
  idb: { entries: number; hits: number; misses: number; supported: boolean };
  avif: boolean;
}

function buildStats(): CacheStatsSnapshot {
  return {
    mem: imageMemoryCache.getStats(),
    idb: criticalImageCache.getStats(),
    avif: isAvifSupported(),
  };
}

/**
 * Panel de estadísticas del caché de imágenes (memoria + IndexedDB).
 * Se muestra en el Centro de Medios (Almacenamiento) para que el dueño
 * verifique que la optimización de imágenes está funcionando.
 */
export default function CacheStats() {
  const [stats, setStats] = useState<CacheStatsSnapshot>(buildStats);
  const [clearing, setClearing] = useState(false);

  // Refrescar mientras esté visible: IndexedDB hace warm-up asíncrono
  // y las precargas del memory cache terminan con el tiempo.
  useEffect(() => {
    const timer = setInterval(() => setStats(buildStats()), 1500);
    return () => clearInterval(timer);
  }, []);

  const handleClear = useCallback(async () => {
    setClearing(true);
    try {
      await criticalImageCache.clear();
      imageMemoryCache.clear();
      setStats(buildStats());
    } finally {
      setClearing(false);
    }
  }, []);

  const statBlock = (label: string, value: string | number, sub?: string) => (
    <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800 p-3.5 text-center">
      <span className="block text-xl font-mono font-bold text-zinc-900 dark:text-white tabular-nums">{value}</span>
      <span className="block text-[9px] font-mono uppercase tracking-wider text-zinc-400 mt-1">{label}</span>
      {sub && <span className="block text-[8px] font-mono text-zinc-400 mt-0.5">{sub}</span>}
    </div>
  );

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center space-x-2">
          <Zap className="h-4 w-4 text-brand-500" />
          <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
            Rendimiento de Imágenes
          </h5>
        </div>
        <span
          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border ${
            stats.avif
              ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900'
              : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800'
          }`}
          title={stats.avif ? 'Tu navegador convierte las imágenes cacheadas a AVIF (más liviano)' : 'Este navegador no codifica AVIF; se guardan en su formato original'}
        >
          {stats.avif ? 'AVIF' : 'Sin AVIF'}
        </span>
      </div>

      <div className="px-6 py-5">
        <p className="text-[10px] text-zinc-400 font-sans mb-4 leading-relaxed">
          Las imágenes que ya visitaste se guardan en memoria y en IndexedDB para que
          las visitas repetidas carguen al instante, sin tocar el servidor.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statBlock('Memoria', stats.mem.entries, `${stats.mem.queued} en cola`)}
          {statBlock('Hits memoria', stats.mem.hits, `${stats.mem.preloads} precargadas`)}
          {statBlock('IndexedDB', stats.idb.entries, stats.idb.supported ? 'persistente' : 'no disponible')}
          {statBlock('Hits DB', stats.idb.hits, `${stats.idb.misses} misses`)}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400">
            <Database className="h-3.5 w-3.5" />
            <span>Almacenamiento local del navegador</span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={clearing}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900 disabled:opacity-50 transition-all cursor-pointer"
          >
            {clearing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            <span>{clearing ? 'Limpiando...' : 'Limpiar caché'}</span>
          </button>
        </div>

        {!stats.idb.supported && (
          <div className="mt-3 flex items-center space-x-2 text-[10px] text-amber-600 dark:text-amber-400">
            <ImageOff className="h-3.5 w-3.5" />
            <span>IndexedDB no está disponible en este navegador; solo aplica el caché en memoria.</span>
          </div>
        )}
      </div>
    </div>
  );
}
