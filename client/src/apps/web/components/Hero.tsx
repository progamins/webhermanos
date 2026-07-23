import { memo, useMemo } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Sparkles, Star } from 'lucide-react';
import type { AppConfig } from '../../../shared/types';
import { useReducedMotion, useIsMobile } from '../../../shared/hooks';
import CachedImage from '../../../shared/components/CachedImage';
import Button from '../../../shared/components/ui/Button';

interface HeroProps {
  onViewCatalog: () => void;
  onViewHistory: () => void;
  config?: AppConfig | null;
}

function Hero({ onViewCatalog, onViewHistory, config }: HeroProps) {
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll();

  const shouldParallax = !isMobile && !reducedMotion;

  // Parallax motion values — subtle scroll-driven depth
  const bgParallaxY = useTransform(scrollY, [0, 600], [0, -50]);
  const particlesParallaxY = useTransform(scrollY, [0, 600], [0, -30]);
  const contentParallaxY = useTransform(scrollY, [0, 600], [0, -20]);
  const imageParallaxY = useTransform(scrollY, [0, 600], [0, -12]);

  const floatingParticles = useMemo(
    () =>
      Array.from({ length: isMobile ? 10 : 28 }, (_, i) => ({
        id: i,
        size: 2 + (i % 7) * 2.5,
        x: 3 + (i * 3.7) % 94,
        y: 2 + (i * 7.1 + 5) % 96,
        driftX: ((i % 5) - 2) * 6,
        duration: 7 + (i % 4) * 3,
        delay: i * 0.35,
        opacityBase: 0.15 + (i % 5) * 0.08,
        isStar: i % 5 === 0,
      })),
    [isMobile]
  );

  const sparkleParticles = useMemo(
    () =>
      Array.from({ length: isMobile ? 0 : 8 }, (_, i) => ({
        id: i + 100,
        x: 10 + (i * 11.3) % 80,
        y: 5 + (i * 9.7 + 3) % 85,
        size: 1.5 + (i % 3) * 1.5,
        delay: i * 0.6,
        duration: 2.5 + (i % 3) * 1.5,
      })),
    [isMobile]
  );

  const heroContainerVariants = reducedMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.1, delayChildren: 0.15 },
        },
      };

  const PREMIUM_EASE = [0.16, 1, 0.3, 1] as const;

  const heroItemVariants = reducedMotion
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 30, filter: 'blur(4px)' },
        show: {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: {
            type: 'tween' as const,
            ease: PREMIUM_EASE,
            duration: isMobile ? 0.45 : 0.55,
          },
        },
      };

  return (
    <section
      id="inicio"
      className="relative min-h-[92vh] flex items-center justify-center pt-24 overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom, var(--theme-bg-alt), var(--theme-bg))',
      }}
      aria-label="Hero principal"
    >
      <motion.div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={shouldParallax ? { y: bgParallaxY } : undefined}
        aria-hidden="true"
      >
        <div className="absolute -top-20 left-[5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-brand-200/30 via-brand-100/20 to-transparent dark:from-brand-800/10 dark:via-brand-900/5 dark:to-transparent blur-[80px] will-change-transform animate-orb-slow" />
        <div className="absolute top-[45%] -right-[10%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-brand-secondary/20 via-brand-300/15 to-transparent dark:from-brand-600/8 dark:via-brand-700/5 dark:to-transparent blur-[80px] will-change-transform animate-orb-slow-reverse" />
        <div className="absolute -bottom-[15%] left-[20%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-brand-400/15 via-brand-500/10 to-transparent dark:from-brand-700/6 dark:via-brand-800/4 dark:to-transparent blur-[100px] will-change-transform animate-orb-drift" />
        <div className="absolute top-[15%] -left-[5%] w-[300px] h-[300px] rounded-full bg-gradient-to-r from-white/40 via-brand-100/20 to-transparent dark:from-white/5 dark:via-brand-200/5 dark:to-transparent blur-[60px] will-change-transform animate-light-sweep" />
      </motion.div>

      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={shouldParallax ? { y: particlesParallaxY } : undefined}
        aria-hidden="true"
      >
        {!reducedMotion &&
          floatingParticles.map((p) => (
            <motion.div
              key={p.id}
              className={`absolute rounded-full will-change-transform ${
                p.isStar ? 'bg-brand-400 dark:bg-brand-300' : 'bg-brand-300 dark:bg-brand-400'
              }`}
              style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
              animate={
                isMobile
                  ? { y: [0, -20, 0], x: [0, 5, 0], opacity: [p.opacityBase, p.opacityBase * 2, p.opacityBase], scale: [1, 1.1, 1] }
                  : {
                      y: [0, -50 - p.driftX * 0.5, -20, -60, 0],
                      x: [0, p.driftX * 0.3, -p.driftX * 0.2, p.driftX * 0.5, 0],
                      opacity: [p.opacityBase, p.opacityBase * 3, p.opacityBase * 1.5, p.opacityBase * 2.5, p.opacityBase],
                      scale: [1, 1.4, 0.8, 1.2, 1],
                    }
              }
              transition={{ duration: isMobile ? p.duration * 1.5 : p.duration, repeat: Infinity, delay: isMobile ? p.delay * 0.5 : p.delay, ease: 'easeInOut' }}
            />
          ))}
        {!reducedMotion &&
          sparkleParticles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute will-change-transform"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              animate={{ opacity: [0, 1, 0.3, 1, 0], scale: [0, 1.2, 0.5, 1, 0], rotate: [0, 180, 360] }}
              transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
            >
              <Star className="text-brand-400/60 dark:text-brand-300/40" style={{ width: p.size * 4, height: p.size * 4 }} fill="currentColor" />
            </motion.div>
          ))}
      </motion.div>

      <motion.div
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02] hidden sm:block"
        style={shouldParallax ? { y: bgParallaxY } : undefined}
        aria-hidden="true"
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="hero-dots-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="#C4847D" />
              <circle cx="0" cy="0" r="0.8" fill="#D4A373" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#hero-dots-pattern)" />
        </svg>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
            className="lg:col-span-7 space-y-6 text-center lg:text-left"
            style={shouldParallax ? { y: contentParallaxY } : undefined}
          >
            <motion.div
              variants={heroContainerVariants}
              initial="hidden"
              animate="show"
            >
            <motion.div
              variants={heroItemVariants}
              className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-brand-100/70 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-mono font-semibold uppercase tracking-wider"
              id="hero-badge"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{config?.heroBadge || 'Por Carol & Edwin Rosas Albines'}</span>
            </motion.div>

            <motion.h1
              variants={heroItemVariants}
              className="text-5xl sm:text-6xl lg:text-7xl font-serif font-light italic leading-tight"
              id="hero-title"
              style={{ color: 'var(--theme-text)' }}
            >
              {config?.heroTitle ? (
                <>
                  {config.heroTitle.split(' ').slice(0, -1).join(' ')}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 dark:from-brand-300 dark:via-brand-200 dark:to-brand-400 bg-[length:200%_100%] animate-gradient-shift block sm:inline">
                    {config.heroTitle.split(' ').slice(-1)[0]}
                  </span>
                </>
              ) : (
                <>
                  El Arte de <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 dark:from-brand-300 dark:via-brand-200 dark:to-brand-400 bg-[length:200%_100%] animate-gradient-shift">
                    Compartir
                  </span>
                </>
              )}
            </motion.h1>

            <motion.p
              variants={heroItemVariants}
              className="text-lg max-w-sm mx-auto lg:mx-0 leading-relaxed font-light"
              id="hero-desc"
              style={{ color: 'var(--theme-text-secondary)' }}
            >
              {config?.heroDescription || 'Diseños exclusivos creados por Carol Rosas para transformar tus momentos especiales en legados de sabor.'}
            </motion.p>

            <motion.div
              variants={heroItemVariants}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4"
              id="hero-actions"
            >
              <Button onClick={onViewCatalog} variant="primary" size="lg">
                Ver Catálogo
              </Button>
              <Button onClick={onViewHistory} variant="secondary" size="lg">
                Nuestra Historia
              </Button>
            </motion.div>

            <motion.div
              variants={heroItemVariants}
              className="mt-12 flex items-center justify-center lg:justify-start gap-6 opacity-80"
              id="hero-stats"
            >
              <div>
                <span className="text-2xl font-light block" style={{ color: 'var(--theme-text)' }}>100%</span>
                <span className="text-[9px] uppercase tracking-tighter" style={{ color: 'var(--theme-text-secondary)' }}>Natural</span>
              </div>
              <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
              <div>
                <span className="text-2xl font-light block" style={{ color: 'var(--theme-text)' }}>Hecho a Mano</span>
                <span className="text-[9px] uppercase tracking-tighter" style={{ color: 'var(--theme-text-secondary)' }}>Con Amor</span>
              </div>
              <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
              <div>
                <span className="text-2xl font-light block" style={{ color: 'var(--theme-text)' }}>Familia</span>
                <span className="text-[9px] uppercase tracking-tighter" style={{ color: 'var(--theme-text-secondary)' }}>Rosas</span>
              </div>
            </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            className="lg:col-span-5 relative flex justify-center"
            style={shouldParallax ? { y: imageParallaxY } : undefined}
          >
            {!reducedMotion && (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
                  className="absolute w-[460px] h-[460px] rounded-full border-[1.5px] border-dashed border-brand-200/30 dark:border-brand-700/20 pointer-events-none"
                  aria-hidden="true"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
                  className="absolute w-[420px] h-[420px] rounded-full border border-brand-100/20 dark:border-brand-800/10 pointer-events-none"
                  aria-hidden="true"
                />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
                  className="absolute w-[380px] h-[380px] rounded-full border-[1px] border-dotted border-brand-secondary/15 dark:border-brand-600/10 pointer-events-none"
                  aria-hidden="true"
                />
              </>
            )}

            <motion.div
              initial={reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 0.92, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'tween', ease: PREMIUM_EASE, duration: isMobile ? 0.5 : 0.65 }}
              className="premium-glass-card relative w-full max-w-[420px] aspect-[4/5] rounded-[40px] p-4 overflow-hidden shadow-[0_20px_50px_rgba(196,132,125,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/40 dark:border-white/10"
              id="hero-image-container"
            >
              <motion.div
                animate={reducedMotion ? {} : { y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                className="w-full h-full bg-white/20 dark:bg-zinc-950/20 rounded-[32px] relative overflow-hidden"
              >
                <CachedImage
                  src={config?.heroImage || ''}
                  width={600}
                  alt="Pastel destacado de Maison Rosas"
                  wrapperClassName="w-full h-full rounded-[32px]"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  id="hero-cake-image"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent p-6 text-white">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-brand-200">Modelo Destacado</span>
                  <h3 className="text-xl font-serif font-light italic mt-1">Rosado Floral Vintage</h3>
                  <p className="text-xs text-zinc-200 mt-1">Sabor: Vainilla Francesa • Decorado con Rosas Frescas</p>
                </div>
              </motion.div>

              {!reducedMotion && (
                <motion.div
                  initial={{ x: 60, opacity: 0, scale: 0.9 }}
                  animate={{ x: 0, opacity: 1, scale: 1 }}
                  transition={{ type: 'tween', ease: PREMIUM_EASE, duration: 0.5, delay: 0.6 }}
                  whileHover={{ scale: 1.05, x: 2 }}
                  className="absolute top-8 -right-4 p-5 rounded-3xl premium-glass-card shadow-lg max-w-[200px] z-20 border border-brand-200/30 dark:border-white/10"
                  id="hero-review-floater"
                >
                  <div className="flex items-center space-x-1 mb-1" aria-label={`Calificación: ${config?.heroReviewRating ?? 5} de 5 estrellas`}>
                    {[...Array(config?.heroReviewRating ?? 5)].map((_, i) => (
                      <span key={i} className="text-[16px]" style={{ color: '#F59E0B', textShadow: '0 0 4px rgba(245,158,11,0.4)' }} aria-hidden="true">★</span>
                    ))}
                  </div>
                  <p className="text-[11px] font-sans italic leading-tight" style={{ color: 'var(--theme-text)' }}>
                    &ldquo;{config?.heroReviewText || 'El sabor es increíblemente suave y la presentación fue perfecta para mi boda civil.'}&rdquo;
                  </p>
                  <span className="block text-[9px] font-mono font-bold mt-2" style={{ color: 'var(--theme-brand-primary)' }}>
                    — {config?.heroReviewAuthor || 'María José'}{config?.heroReviewRole ? `, ${config.heroReviewRole}` : ''}
                  </span>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default memo(Hero);
