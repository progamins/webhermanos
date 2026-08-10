import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { useReducedMotion } from '../../../shared/hooks';

/** Intervalo del auto-reintento silencioso (ms) — reconexión automática */
const AUTO_RETRY_MS = 10_000;

/**
 * Pantalla "Sin conexión" — limpia y centrada en la marca.
 * Muestra el pastel animado, el estado y un único botón de reintento.
 * La reconexión es automática: cada 10s se verifica la red en silencio y,
 * al volver la señal, se dispara 'maison:network' para restaurar la app sola.
 */
export default function OfflineScreen() {
  const [retrying, setRetrying] = useState(false);
  const busyRef = useRef(false);
  const reducedMotion = useReducedMotion();

  /**
   * Verifica la red: si el health responde OK, avisa a la app para restaurarse.
   * El query param único (cache-busting) evita que el Service Worker devuelva
   * un health 200 viejo desde su caché cuando en realidad no hay red (lo que
   * causaría un bucle pantalla ↔ app).
   * `manual` distingue el click del usuario (muestra el estado del botón) del
   * auto-reintento silencioso (no debe alterar la UI).
   */
  const checkConnection = useCallback(async (manual = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (manual) setRetrying(true);
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`/api/health?offline=${Date.now()}`, { cache: 'no-store', signal: ctrl.signal });
      clearTimeout(timeout);
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('maison:network', { detail: { online: true } }));
        return; // la app se restaura sola
      }
    } catch {
      // sigue sin red — se reintentará en el siguiente ciclo
    } finally {
      busyRef.current = false;
      setRetrying(false);
    }
  }, []);

  // Auto-reconexión: mientras esté visible, reintentar cada N segundos en silencio.
  useEffect(() => {
    const timer = setInterval(() => checkConnection(), AUTO_RETRY_MS);
    return () => clearInterval(timer);
  }, [checkConnection]);

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
        className="max-w-lg w-full text-center relative z-10 space-y-6"
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
            className="w-44 h-44 sm:w-52 sm:h-52 relative"
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

        {/* ─── Estado ─── */}
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

        {/* ─── Reintento ─── */}
        <motion.button
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.4 }}
          type="button"
          onClick={() => checkConnection(true)}
          disabled={retrying}
          className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:opacity-70 text-white text-xs font-mono font-bold uppercase tracking-wider shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900"
        >
          {retrying ? (
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Wifi className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" aria-hidden="true" />
          )}
          {retrying ? 'Verificando...' : 'Reintentar'}
        </motion.button>
      </motion.div>
    </div>
  );
}
