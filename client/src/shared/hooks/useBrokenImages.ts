import { useState, useCallback } from 'react';

/**
 * 🚫 useBrokenImages — rastrea qué imágenes (por id) fallaron al cargar,
 * para mostrar un indicador visual de "imagen rota" en tarjetas y paneles.
 *
 * Uso:
 *   const { isBroken, markBroken } = useBrokenImages();
 *   <img onError={() => markBroken(item.id)} ... />
 *   {isBroken(item.id) && <BrokenImageBadge />}
 */
export function useBrokenImages() {
  const [broken, setBroken] = useState<Set<string>>(new Set());

  const markBroken = useCallback((id: string) => {
    setBroken((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const isBroken = useCallback((id: string) => broken.has(id), [broken]);

  const clearBroken = useCallback(() => setBroken(new Set()), []);

  return { broken, markBroken, isBroken, clearBroken };
}
