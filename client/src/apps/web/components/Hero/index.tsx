import { memo, useMemo, useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import type { AppConfig } from '../../../../shared/types';
import { useReducedMotion, useIsMobile, useMediaQuery } from '../../../../shared/hooks';
import { FloatingLayer, StaticCollage } from './FloatingLayer';
import HeroContent from './HeroContent';
import { getTileSet, getStaticTiles } from './heroSceneData';

interface HeroProps {
  onViewCatalog: () => void;
  onViewHistory: () => void;
  config?: AppConfig | null;
}

/** Orbes cálidos + textura de puntos: fondo elegante, sin planitud. */
function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute -top-24 left-[4%] w-[520px] h-[520px] rounded-full bg-gradient-to-br from-brand-200/35 via-brand-100/20 to-transparent dark:from-brand-800/15 dark:via-brand-900/8 dark:to-transparent blur-[90px] will-change-transform animate-orb-slow" />
      <div className="absolute top-[42%] -right-[12%] w-[460px] h-[460px] rounded-full bg-gradient-to-br from-brand-secondary/25 via-brand-300/15 to-transparent dark:from-brand-600/10 dark:via-brand-700/8 dark:to-transparent blur-[90px] will-change-transform animate-orb-slow-reverse" />
      <div className="absolute -bottom-[18%] left-[22%] w-[540px] h-[540px] rounded-full bg-gradient-to-tr from-brand-400/12 via-brand-500/8 to-transparent dark:from-brand-700/8 dark:via-brand-800/5 dark:to-transparent blur-[110px] will-change-transform animate-orb-drift" />
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.025] hidden sm:block">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="hero-dots-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="#C7442E" />
              <circle cx="0" cy="0" r="0.8" fill="#E9A13B" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#hero-dots-pattern)" />
        </svg>
      </div>
    </div>
  );
}

function Hero({ onViewCatalog, config }: HeroProps) {
  const isMobile = useIsMobile();
  // Tablets (768–1100px): vitrina media sin capa frontal.
  const isCompact = useMediaQuery('(min-width: 768px) and (max-width: 1100px)');
  const reducedMotion = useReducedMotion();
  const wrapRef = useRef<HTMLElement | null>(null);

  // Progreso de la escena: 0 al entrar, 1 cuando el HERO termina su recorrido.
  // Un solo MotionValue compartido por todos los tiles (sin re-renders).
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ['start start', 'end end'],
  });

  const tiles = useMemo(() => getTileSet(isMobile, isCompact), [isMobile, isCompact]);
  const staticTiles = useMemo(() => getStaticTiles(isMobile), [isMobile]);

  // El contenido central se "aleja" ligeramente al final del recorrido para
  // ceder el protagonismo a la transición hacia la siguiente sección.
  const contentScale = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.99, 0.94]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.78, 1], [1, 1, 0.75]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.05, 0.2], [1, 1, 0]);

  const stageBackground = {
    background: 'linear-gradient(to bottom, var(--theme-bg-alt), var(--theme-bg))',
  };

  if (reducedMotion) {
    // prefers-reduced-motion: collage estático elegante, sin sticky ni 3D.
    return (
      <section
        id="inicio"
        ref={wrapRef}
        className="relative overflow-hidden grain-texture"
        style={stageBackground}
        aria-label="Hero principal"
      >
        <HeroBackground />
        <div className="relative z-10 min-h-[100svh] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-28">
          <StaticCollage tiles={staticTiles} />
          <HeroContent onViewCatalog={onViewCatalog} config={config} reducedMotion />
        </div>
      </section>
    );
  }

  return (
    <section
      id="inicio"
      ref={wrapRef}
      className="hero-scene-tall relative grain-texture"
      style={stageBackground}
      aria-label="Hero principal"
    >
      <div className="hero-scene-stage h-screen overflow-hidden">
        <HeroBackground />

        {/* CAPA 2a — Vitrina en profundidad (detrás del contenido) */}
        <motion.div
          className="absolute inset-0 overflow-hidden pointer-events-none hero-scene-depth"
          style={{ perspective: 1200 }}
          aria-hidden="true"
        >
          <FloatingLayer tiles={tiles.depth} progress={scrollYProgress} />
        </motion.div>

        {/* CAPA 3 — Contenido central (siempre legible e interactivo) */}
        <motion.div
          className="absolute inset-0 z-10 flex items-center justify-center px-4 sm:px-6 lg:px-8"
          style={{ scale: contentScale, opacity: contentOpacity, isolation: 'isolate' }}
        >
          <HeroContent onViewCatalog={onViewCatalog} config={config} reducedMotion={false} />
        </motion.div>

        {/* CAPA 2b — Piezas que cruzan POR DELANTE (sin capturar el puntero) */}
        <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none" aria-hidden="true">
          <FloatingLayer tiles={tiles.front} progress={scrollYProgress} />
        </div>

        {/* Pista de scroll: se desvanece apenas el usuario empieza a bajar */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 hidden md:flex flex-col items-center gap-1.5 pointer-events-none"
          style={{ opacity: hintOpacity }}
          aria-hidden="true"
        >
          <span
            className="text-[10px] font-mono uppercase tracking-[0.3em]"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            Desliza para descubrir
          </span>
          <ChevronDown className="h-4 w-4" style={{ color: 'var(--theme-brand-primary)' }} />
        </motion.div>

        {/* Velo inferior: funde la escena con la siguiente sección */}
        <div
          className="absolute inset-x-0 bottom-0 h-24 z-30 pointer-events-none"
          style={{ background: 'linear-gradient(to top, var(--theme-bg), transparent)' }}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}

export default memo(Hero);
