import { useState, useEffect, useRef } from 'react';

const isBrowser = typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/**
 * Lee el valor REAL de la media query al inicializar (lazy) para evitar un
 * "flasheo" render→correction en mobile. El coste es una llamada a matchMedia
 * en el primer render del cliente — totalmente asumible y solo una vez.
 */
function readQuery(query: string): boolean {
  if (!isBrowser) return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/**
 * Hook optimizado para usar media queries de CSS desde React.
 *
 *  - SSR-safe: si no hay `window`, devuelve `false`.
 *  - Sin re-renders innecesarios: el listener de `matchMedia` solo dispara al
 *    cruzarse el breakpoint; además el effect se suscribe UNA sola vez (la query
 *    vive en una ref, no como dependencia del effect) evitando re-suscripciones
 *    en cada render.
 *  - Corrección del primer render: el `useState` lazy ya lee el valor real,
 *    evitando que móvil renderice como desktop por un framing antes de corregir.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => readQuery(query));
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    if (!isBrowser) return;
    const mq = window.matchMedia(queryRef.current);
    // Re-sincroniza por si la query cambió o el valor varí entre el render y el mount
    setMatches((prev) => (prev === mq.matches ? prev : mq.matches));
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export function usePrefersDark(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}
