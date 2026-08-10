import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { WifiOff, RefreshCw, Wifi, Cake, CheckCircle2, Database } from 'lucide-react';
import { useReducedMotion } from '../../../shared/hooks';
import { imageMemoryCache } from '../../../shared/utils/imageMemoryCache';
import { criticalImageCache } from '../../../shared/utils/imageCache';

/** Intervalo del auto-reintento silencioso (ms) — reconexión automática */
const AUTO_RETRY_MS = 10_000;

interface OfflineScreenProps {
  /** Si se provee, muestra el botón para seguir navegando con contenido guardado */
  onContinue?: () => void;
}

/**
 * Pantalla personalizada de "Sin conexión" — no es un mensaje genérico.
 * Muestra la identidad de la marca (lottie de pastel, serif, paleta), un badge
 * de señal, el estado de verificación y un botón de reintento. Cuando la red
 * vuelve, dispara el evento 'maison:network' y la app se restaura sola.
 */
export default function OfflineScreen({ onContinue }: OfflineScreenProps) {
  const [retrying, setRetrying] = useState(false);
  const [checked, setChecked] = useState(false); // ya se intentó y sigue sin red
  const [since] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const busyRef = useRef(false);
  const reducedMotion = useReducedMotion();

  // Imágenes que ya visitó el usuario y siguen disponibles en caché
  const cachedImages = useMemo(
    () => imageMemoryCache.getStats().entries + criticalImageCache.getStats().entries,
    []
  );

  /**
   * Verifica la red: si el health responde OK, avisa a la app para restaurarse.
   * El query param único (cache-busting) evita que el Service Worker devuelva
   * un health 200 viejo desde su caché cuando en realidad no hay red (lo que
   * causaría un bucle pantalla ↔ app).
   */
  const checkConnection = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRetrying(true);
    setChecked(false);
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`/api/health?offline=${Date.now()}`, { cache: 'no-store', signal: ctrl.signal });
      clearTimeout(timeout);
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('maison:network', { detail: { online: true } }));
        return; // la app se restaura sola
      }
      setChecked(true); // hay respuesta pero sin red real
    } catch {
      setChecked(true); // timeout / sin red
    } finally {
      busyRef.current = false;
      setRetrying(false);
    }
  }, []);

  // Auto-reconexión: mientras esté visible, reintentar cada N segundos.
  useEffect(() => {
    const timer = setInterval(() => checkConnection(), AUTO_RETRY_MS);
    return () => clearInterval(timer);
  }, [checkConnection]);

  // Contador de segundos en vivo
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const containerVariants = reducedMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.4 } },
      };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[#FFF9F5] via-white to-[#FFF9F5] dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center p-6 relative overflow-hidden dot-pattern"
      role="alert"
      aria-live="assertive"
    >
      {/* Ambiente decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-20 left-[5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-brand-200/30 via-brand-100/20 to-transparent dark:from-brand-800/10 dark:via-brand-900/5 dark:to-transparent blur-[80px] animate-blob-1" />
        <div className="absolute top-[45%] -right-[10%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-brand-secondary/20 via-brand-300/15 to-transparent dark:from-brand-600/8 dark:via-brand-700/5 dark:to-transparent blur-[80px] animate-blob-2" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-lg w-full text-center relative z-10 space-y-7"
      >
        {/* ─── Visual: pastel flotante + badge de señal ─── */}
        <div className="relative flex justify-center">
          {!reducedMotion && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-brand-200/30 dark:bg-brand-800/20 blur-3xl animate-pulse" aria-hidden="true" />
          )}
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="w-52 h-52 sm:w-60 sm:h-60 relative"
          >
            <DotLottieReact src="/cake.lottie" autoplay loop style={{ width: '100%', height: '100%' }} />
          </motion.div>

          {/* Badge de señal perdida */}
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 15, delay: 0.35 }}
            className="absolute -bottom-1 -right-1 sm:-right-3"
          >
            <span className="relative flex h-12 w-12">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400/40 dark:bg-amber-500/30" />
              <span className="relative inline-flex rounded-full h-12 w-12 items-center justify-center bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30 ring-4 ring-white/70 dark:ring-zinc-900/70">
                <WifiOff className="h-5 w-5 text-white" />
              </span>
            </span>
          </motion.div>
        </div>

        {/* ─── Badge de estado ─── */}
        <motion.span
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.15 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-mono font-semibold tracking-[0.2em] uppercase"
          style={{
            backgroundColor: 'var(--theme-surface-glass)',
            borderColor: 'var(--theme-border)',
            color: 'var(--theme-brand-primary)',
          }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Sin conexión
        </motion.span>

        {/* ─── Título ─── */}
        <motion.h1
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.25 }}
          className="font-serif text-3xl sm:text-4xl font-light italic leading-tight"
          style={{ color: 'var(--theme-text)' }}
        >
          Te quedaste sin conexión
        </motion.h1>

        <div className="w-12 h-[1.5px] bg-brand-secondary/40 mx-auto" aria-hidden="true" />

        {/* ─── Mensaje ─── */}
        <motion.p
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.35 }}
          className="text-sm font-light leading-relaxed max-w-md mx-auto"
          style={{ color: 'var(--theme-text-secondary)' }}
        >
          Revisa tu Wi-Fi o tus datos móviles. No te preocupes: tus pasteles,
          tus pedidos y tu catálogo favorito están a salvo.
        </motion.p>

        {/* ─── Contador de caché ─── */}
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.45 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-mono font-medium"
          style={{ backgroundColor: 'var(--theme-surface-glass)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
        >
          <Database className="h-3.5 w-3.5" aria-hidden="true" />
          {cachedImages > 0
            ? `${cachedImages} imágenes en caché listas para verse`
            : 'Tu catálogo está guardado en tu dispositivo'}
        </motion.div>

        {/* ─── Acciones ─── */}
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.55 }}
          className="space-y-4"
        >
          <button
            type="button"
            onClick={checkConnection}
            disabled={retrying}
            className="inline-flex items-center gap-2 px-7 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-70 active:scale-[0.97] text-white rounded-full text-xs font-mono font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
          >
            {retrying ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wifi className="h-4 w-4" aria-hidden="true" />}
            {retrying ? 'Verificando...' : 'Reintentar ahora'}
          </button>

          {/* Estado silencioso de auto-reconexión */}
          <p className="text-[10px] font-mono flex items-center justify-center gap-1.5" style={{ color: 'var(--theme-text-muted)' }}>
            <span className="flex items-center gap-1.5">
              <Cake className="h-3.5 w-3.5" aria-hidden="true" />
              Te reconectaremos automáticamente cuando vuelva la señal
              <span className="inline-flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-1 rounded-full bg-current animate-bounce"
                    style={{ animationDelay: `${i * 150}ms`, animationDuration: '1.2s' }}
                  />
                ))}
              </span>
            </span>
            <span className="hidden sm:inline text-[9px] opacity-60 ml-1 tabular-nums">
              · {Math.max(0, Math.round((now - since) / 1000))}s
            </span>
          </p>

          {checked && (
            <p className="text-[10px] font-mono flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Aún no hay señal — seguiremos intentando
            </p>
          )}

          {onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex items-center gap-2 px-5 py-2.5 border rounded-full text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)' }}
            >
              <Database className="h-3.5 w-3.5" aria-hidden="true" />
              Continuar con contenido guardado
            </button>
          )}
        </motion.div>

        {/* ─── Firma ─── */}
        <motion.p
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.7 }}
          className="text-[11px] font-serif italic flex items-center justify-center gap-1.5"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          Con amor, Carol & Edwin Rosas Albines
        </motion.p>
      </motion.div>
    </div>
  );
}
