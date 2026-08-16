import { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * ⚠️ Banner de rate limit (429).
 *
 * Cuando el servidor devuelve 429, el request pool (en vez de reintentar en
 * silencio y martillar el servidor) emite el evento 'maison:ratelimited' con
 * el tiempo de espera indicado por el header `Retry-After`. Este componente
 * muestra un aviso persistente en la parte superior del panel hasta que una
 * solicitud vuelve a tener éxito (evento 'maison:ratelimited:clear').
 */
export default function RateLimitBanner() {
  const [visible, setVisible] = useState(false);
  const [retryAfterMs, setRetryAfterMs] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const onLimited = (e: Event) => {
      const detail = (e as CustomEvent<{ retryAfterMs?: number }>).detail;
      const wait = detail?.retryAfterMs && detail.retryAfterMs > 0 ? detail.retryAfterMs : 60_000;
      setRetryAfterMs(wait);
      setCountdown(Math.ceil(wait / 1000));
      setVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
    const onCleared = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setVisible(false);
      setCountdown(0);
    };
    window.addEventListener('maison:ratelimited', onLimited);
    window.addEventListener('maison:ratelimited:clear', onCleared);
    return () => {
      window.removeEventListener('maison:ratelimited', onLimited);
      window.removeEventListener('maison:ratelimited:clear', onCleared);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Cuenta regresiva hacia el próximo reintento automático
  useEffect(() => {
    if (!visible || countdown <= 0) return;
    const t = setInterval(() => {
      setCountdown((c) => (c > 1 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [visible, countdown]);

  if (!visible) return null;

  const waitingSoon = retryAfterMs > 0 && retryAfterMs <= 5000;

  return (
    <div
      className="fixed top-0 inset-x-0 z-[200] flex justify-center px-4 pt-3 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl bg-amber-500/95 text-white px-4 py-2.5 shadow-xl text-xs font-semibold max-w-full">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">
          El servidor está saturado (429) — pausando para no sobrecargarlo.
          {waitingSoon && countdown > 0 ? ` Se reintentará en ${countdown}s.` : ' Se reintentará automáticamente.'}
        </span>
      </div>
    </div>
  );
}
