import { memo, useMemo } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, ArrowRight, Star } from 'lucide-react';
import type { Product } from '../../../shared/types';
import { useReducedMotion, useIsMobile } from '../../../shared/hooks';
import CachedImage from '../../../shared/components/CachedImage';

interface HouseKekeProps {
  /** Producto destacado (real, desde la API). Fallback: null → se oculta. */
  product?: Product | null;
  whatsappNumber?: string;
  onViewCatalog: () => void;
}

/**
 * Banda editorial "El Keke de la Casa" — composición asimétrica sobre
 * chocolate profundo. Solo muestra datos reales del producto seleccionado.
 */
function HouseKeke({ product, whatsappNumber = '51902568187', onViewCatalog }: HouseKekeProps) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const { name, description, price, image, flavorTag } = useMemo(() => {
    const p = product;
    const n = p?.name ?? '';
    // "Keke de Chocolate" → "Chocolate" para el watermark editorial
    const tag = n.replace(/^Keke de\s+/i, '') || 'Chocolate';
    return {
      name: n,
      description:
        p?.description ||
        'Keke húmedo de cacao peruano, con chispas de chocolate oscuro y un toque de canela. Horneado cada mañana.',
      price: p ? `S/ ${Number(p.basePrice).toFixed(2)}` : 'S/ 35.00',
      image: Array.isArray(p?.images) && p.images[0] ? p.images[0] : '',
      flavorTag: tag,
    };
  }, [product]);

  if (!product) return null;

  const waText = encodeURIComponent(`¡Hola! Quiero pedir el ${name} 🍰`);

  return (
    <section id="keke-de-la-casa" aria-label="El Keke de la Casa" className="py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.6 }}
          className="house-keke-band relative overflow-hidden rounded-[36px] sm:rounded-[44px] px-6 py-12 sm:px-12 lg:px-16 lg:py-16 grain-texture"
        >
          {/* Watermark editorial del sabor */}
          <span
            className="absolute -right-4 -bottom-10 font-serif italic font-bold leading-none select-none pointer-events-none hidden sm:block"
            style={{ fontSize: 'clamp(6rem, 14vw, 11rem)', color: 'rgba(246, 237, 226, 0.05)' }}
            aria-hidden="true"
          >
            {flavorTag}
          </span>

          {/* Orbe cálido decorativo */}
          <div
            className="absolute -top-24 -left-24 w-[380px] h-[380px] rounded-full blur-[100px] pointer-events-none"
            style={{ background: 'rgba(199, 68, 46, 0.18)' }}
            aria-hidden="true"
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Fotografía protagonista */}
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: -28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.55, delay: 0.1 }}
              className="lg:col-span-5 flex justify-center"
            >
              <div className="house-keke-img-wrap relative w-full max-w-[400px] aspect-[4/5] rounded-[32px] overflow-hidden ring-1 ring-white/15 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)]">
                {image ? (
                  <CachedImage
                    src={image}
                    width={isMobile ? 400 : 640}
                    sizes="(max-width: 768px) 90vw, 420px"
                    alt={`${name} — El Keke de la Casa`}
                    wrapperClassName="w-full h-full"
                    className="house-keke-img w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#462719]" />
                )}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#3A2118]/50 via-transparent to-transparent pointer-events-none"
                  aria-hidden="true"
                />
                <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2B1A12]/75 backdrop-blur-sm border border-[#E9A13B]/50 text-[#F7EDDA] text-[10px] font-mono font-semibold uppercase tracking-[0.2em]">
                  <Star className="h-3 w-3 text-[#E9A13B]" fill="currentColor" aria-hidden="true" />
                  La Casa
                </span>
              </div>
            </motion.div>

            {/* Información editorial */}
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: 28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.55, delay: 0.2 }}
              className="lg:col-span-7 space-y-6 text-center lg:text-left"
            >
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#E9A13B]/50 text-[#E9A13B] text-[10px] font-mono font-semibold uppercase tracking-[0.25em]">
                El Keke de la Casa
              </span>

              <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light italic leading-tight text-[#F6EDE2]">
                {name}
              </h2>

              <p className="text-base sm:text-lg leading-relaxed font-light max-w-xl mx-auto lg:mx-0 text-[#D8C4AE]">
                {description}
              </p>

              <div className="flex items-center justify-center lg:justify-start gap-4 pt-2">
                <span className="font-serif text-4xl font-semibold text-[#E9A13B] tabular-nums">{price}</span>
                <span className="text-xs font-mono uppercase tracking-wider text-[#A98F78] border-l border-[#E9A13B]/40 pl-4">
                  Horneado cada mañana
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${waText}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C7442E] text-white font-semibold text-sm sm:text-base px-8 py-3.5 transition-all duration-300 hover:bg-[#A93624] hover:-translate-y-0.5 shadow-[0_10px_25px_-8px_rgba(199,68,46,0.6)]"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Pedir este Keke
                </a>
                <button
                  onClick={onViewCatalog}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#F6EDE2]/30 text-[#F6EDE2] font-semibold text-sm sm:text-base px-8 py-3.5 transition-all duration-300 hover:border-[#D6A34A] hover:text-[#D6A34A]"
                >
                  Ver todos los kekes
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default memo(HouseKeke);
