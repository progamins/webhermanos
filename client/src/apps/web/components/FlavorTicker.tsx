import { memo, useMemo } from 'react';

// Sabores reales del catálogo (mismo orden que la tienda).
const FLAVORS = ['Chocolate', 'Vainilla', 'Plátano', 'Zanahoria', 'Maracuyá', 'Naranja', 'Lúcuma', 'Canela'];

/**
 * Ticker editorial de sabores — el "momento memorable" de la marca.
 * Banda en chocolate profundo con los sabores desfilando en loop infinito.
 * Es decorativo: los sabores ya son visibles en el catálogo.
 */
function FlavorTicker() {
  // Track duplicado para un loop perfecto con translateX(-50%)
  const items = useMemo(() => [...FLAVORS, ...FLAVORS], []);

  return (
    <div className="flavor-ticker" aria-hidden="true">
      <div className="flavor-ticker-track">
        {items.map((flavor, i) => (
          <span key={i} className="flex items-center shrink-0">
            <span className="px-7 py-3.5 font-mono text-[11px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-[#F6EDE2]">
              {flavor}
            </span>
            <span className="flavor-ticker-spark text-[#E9A13B] text-sm leading-none" style={{ animationDelay: `${(i % 8) * 0.35}s` }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default memo(FlavorTicker);
