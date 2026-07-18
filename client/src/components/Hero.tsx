import { memo } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Star } from 'lucide-react';
import { AppConfig } from '../types';
import CachedImage from './CachedImage';

interface HeroProps {
  onViewCatalog: () => void;
  onViewHistory: () => void;
  config?: AppConfig | null;
}

// Detect mobile for reduced particles
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;


// Pre-generate particle configs for SSR/cache stability (avoid Math.random on re-renders)
// Mobile gets ~60% fewer particles for better performance
const PARTICLE_COUNT = isMobile ? 10 : 28;
const SPARKLE_COUNT = isMobile ? 3 : 8;

const FLOATING_PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  size: 2 + (i % 7) * 2.5,
  x: 3 + (i * 3.7) % 94,
  y: 2 + (i * 7.1 + 5) % 96,
  driftX: ((i % 5) - 2) * 6,
  duration: 7 + (i % 4) * 3,
  delay: i * 0.35,
  opacityBase: 0.15 + (i % 5) * 0.08,
  isStar: i % 5 === 0,
}));

const SPARKLE_PARTICLES = Array.from({ length: SPARKLE_COUNT }, (_, i) => ({
  id: i + 100,
  x: 10 + (i * 11.3) % 80,
  y: 5 + (i * 9.7 + 3) % 85,
  size: 1.5 + (i % 3) * 1.5,
  delay: i * 0.6,
  duration: 2.5 + (i % 3) * 1.5,
}));

function Hero({ onViewCatalog, onViewHistory, config }: HeroProps) {
  // Modern spring-based animation variants (static objects, no useMemo needed)
  const heroContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.15,
      },
    },
  };

  const heroItemVariants = {
    hidden: { opacity: 0, y: 30, filter: 'blur(4px)' },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: isMobile ? 'tween' as const : 'spring' as const,
        duration: isMobile ? 0.4 : undefined,
        stiffness: isMobile ? undefined : 100,
        damping: isMobile ? undefined : 18,
        mass: isMobile ? undefined : 0.8,
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
    >
      {/* ─── LAYER 1: Gradient Mesh / Ambient Orbs ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Main warm orb */}
        <div className="absolute -top-20 left-[5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-brand-200/30 via-brand-100/20 to-transparent dark:from-brand-800/10 dark:via-brand-900/5 dark:to-transparent blur-[80px] will-change-transform animate-orb-slow" />
        
        {/* Secondary cool orb */}
        <div className="absolute top-[45%] -right-[10%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-brand-secondary/20 via-brand-300/15 to-transparent dark:from-brand-600/8 dark:via-brand-700/5 dark:to-transparent blur-[80px] will-change-transform animate-orb-slow-reverse" />
        
        {/* Deep accent orb */}
        <div className="absolute -bottom-[15%] left-[20%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-brand-400/15 via-brand-500/10 to-transparent dark:from-brand-700/6 dark:via-brand-800/4 dark:to-transparent blur-[100px] will-change-transform animate-orb-drift" />

        {/* Ethereal light sweep */}
        <div className="absolute top-[15%] -left-[5%] w-[300px] h-[300px] rounded-full bg-gradient-to-r from-white/40 via-brand-100/20 to-transparent dark:from-white/5 dark:via-brand-200/5 dark:to-transparent blur-[60px] will-change-transform animate-light-sweep" />
      </div>

      {/* ─── LAYER 2: Extended Floating Particles ─── */}
      {/* ─── LAYER 2: Extended Floating Particles ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Floating circles - simplified animation on mobile */}
        {FLOATING_PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className={`absolute rounded-full will-change-transform ${
              p.isStar 
                ? 'bg-brand-400 dark:bg-brand-300' 
                : 'bg-brand-300 dark:bg-brand-400'
            }`}
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
            }}
            animate={{
              y: isMobile ? [0, -20, 0] : [0, -50 - p.driftX * 0.5, -20, -60, 0],
              x: isMobile ? [0, 5, 0] : [0, p.driftX * 0.3, -p.driftX * 0.2, p.driftX * 0.5, 0],
              opacity: isMobile ? [p.opacityBase, p.opacityBase * 2, p.opacityBase] : [p.opacityBase, p.opacityBase * 3, p.opacityBase * 1.5, p.opacityBase * 2.5, p.opacityBase],
              scale: isMobile ? [1, 1.1, 1] : [1, 1.4, 0.8, 1.2, 1],
            }}
            transition={{
              duration: isMobile ? p.duration * 1.5 : p.duration,
              repeat: Infinity,
              delay: isMobile ? p.delay * 0.5 : p.delay,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* Twinkling star sparkles - hidden on mobile */}
        {!isMobile && SPARKLE_PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute will-change-transform motion-safe-hidden"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
            }}
            animate={{
              opacity: [0, 1, 0.3, 1, 0],
              scale: [0, 1.2, 0.5, 1, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut',
            }}
          >
            <Star 
              className="text-brand-400/60 dark:text-brand-300/40" 
              style={{ width: p.size * 4, height: p.size * 4 }}
              fill="currentColor"
            />
          </motion.div>
        ))}
      </div>

      {/* ─── LAYER 3: Subtle Geometric Pattern Overlay (hidden on mobile) ─── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02] hidden sm:block">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="hero-dots-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="#C4847D" />
              <circle cx="0" cy="0" r="0.8" fill="#D4A373" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#hero-dots-pattern)" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Text Content */}
          <motion.div 
            className="lg:col-span-7 space-y-6 text-center lg:text-left"
            variants={heroContainerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.div
              variants={heroItemVariants}
              className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-brand-100/70 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-mono font-semibold uppercase tracking-wider"
              id="hero-badge"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{config?.heroBadge || 'Por Carol & Edwin Rosas Albines'}</span>
            </motion.div>

            <motion.h1
              variants={heroItemVariants}
              className="text-5xl sm:text-6xl lg:text-7xl font-serif font-light italic leading-tight"
              id="hero-title"
              style={{color: 'var(--theme-text)'}}
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
              style={{color: 'var(--theme-text-secondary)'}}
            >
              {config?.heroDescription || 'Diseños exclusivos creados por Carol Rosas para transformar tus momentos especiales en legados de sabor.'}
            </motion.p>

            <motion.div
              variants={heroItemVariants}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4"
              id="hero-actions"
            >
              <motion.button
                onClick={onViewCatalog}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-glow w-full sm:w-auto px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white uppercase text-[10px] tracking-widest font-bold transition-colors duration-200 cursor-pointer"
                id="hero-btn-catalog"
              >
                Ver Catálogo
              </motion.button>

              <motion.button
                onClick={onViewHistory}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-8 py-4 border border-brand-500 text-brand-500 dark:border-brand-300 dark:text-brand-300 uppercase text-[10px] tracking-widest font-bold bg-transparent transition-colors duration-200 hover:bg-brand-500/5 cursor-pointer"
                id="hero-btn-history"
              >
                Nuestra Historia
              </motion.button>
            </motion.div>

            {/* Micro stats banner / Trust indicators */}
            <motion.div
              variants={heroItemVariants}
              className="mt-12 flex items-center justify-center lg:justify-start gap-6 opacity-80"
              id="hero-stats"
            >
              <div className="flex flex-col text-left">
                <span className="text-2xl font-light" style={{color: 'var(--theme-text)'}}>100%</span>
                <span className="text-[9px] uppercase tracking-tighter" style={{color: 'var(--theme-text-secondary)'}}>Natural</span>
              </div>
              <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800"></div>
              <div className="flex flex-col text-left">
                <span className="text-2xl font-light" style={{color: 'var(--theme-text)'}}>Hecho a Mano</span>
                <span className="text-[9px] uppercase tracking-tighter" style={{color: 'var(--theme-text-secondary)'}}>Con Amor</span>
              </div>
              <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800"></div>
              <div className="flex flex-col text-left">
                <span className="text-2xl font-light" style={{color: 'var(--theme-text)'}}>Familia</span>
                <span className="text-[9px] uppercase tracking-tighter" style={{color: 'var(--theme-text-secondary)'}}>Rosas</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Visual Showcase (Cake mockup & presentation) */}
          <div className="lg:col-span-5 relative flex justify-center">
            {/* ─── Decorative Rings Behind the Image ─── */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
              className="absolute w-[460px] h-[460px] rounded-full border-[1.5px] border-dashed border-brand-200/30 dark:border-brand-700/20 pointer-events-none"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
              className="absolute w-[420px] h-[420px] rounded-full border border-brand-100/20 dark:border-brand-800/10 pointer-events-none"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
              className="absolute w-[380px] h-[380px] rounded-full border-[1px] border-dotted border-brand-secondary/15 dark:border-brand-600/10 pointer-events-none"
            />

            <motion.div
              initial={{ opacity: 1, scale: 0.92, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ 
                type: isMobile ? 'tween' as const : 'spring' as const,
                duration: isMobile ? 0.5 : undefined,
                stiffness: isMobile ? undefined : 80,
                damping: isMobile ? undefined : 16,
                mass: isMobile ? undefined : 0.8,
                delay: 0.15,
              }}
              className="glass-panel relative w-full max-w-[420px] aspect-[4/5] rounded-[40px] p-4 overflow-hidden shadow-xl border border-white/30 dark:border-white/5 bg-white/40 dark:bg-zinc-900/40"
              id="hero-image-container"
            >
              <motion.div 
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                className="w-full h-full bg-white/20 dark:bg-zinc-950/20 rounded-[32px] relative overflow-hidden"
              >
                <CachedImage
                  src={config?.heroImage || ''}
                  width={600}
                  alt="Pastel de Boda Rosas"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  wrapperClassName="w-full h-full rounded-[32px]"
                  id="hero-cake-image"
                  priority
                />
                
                {/* Subtle gradient overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

                {/* Overlay labels / floaters on image */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent p-6 text-white z-10">
                  <motion.span 
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                    className="text-[10px] font-mono uppercase tracking-widest text-brand-200"
                  >
                    Modelo Destacado
                  </motion.span>
                  <motion.h3
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.3, duration: 0.5 }}
                    className="text-xl font-serif font-light italic mt-1"
                  >
                    Rosado Floral Vintage
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.4, duration: 0.5 }}
                    className="text-xs text-zinc-200 mt-1"
                  >
                    Sabor: Vainilla Francesa • Decorado con Rosas Frescas
                  </motion.p>
                </div>
              </motion.div>

              {/* Floating review card */}
              <motion.div
                initial={{ x: 60, opacity: 0, scale: 0.9 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ 
                  type: 'spring',
                  stiffness: 80,
                  damping: 15,
                  delay: 0.6,
                }}
                whileHover={{ scale: 1.02, x: 2 }}
                className="absolute top-8 -right-4 p-4 rounded-2xl shadow-xl max-w-[200px] text-left z-20 transition-shadow hover:shadow-2xl cursor-default border"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  borderColor: 'var(--theme-border)',
                }}
                id="hero-review-floater"
              >
                <div className="flex items-center space-x-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1 + i * 0.12, type: 'spring', stiffness: 300 }}
                      className="text-[16px]"
                      style={{color: '#F59E0B', textShadow: '0 0 4px rgba(245,158,11,0.4)'}}
                    >
                      ★
                    </motion.span>
                  ))}
                </div>
                <p className="text-[11px] font-sans italic leading-tight" style={{color: 'var(--theme-text)'}}>
                  &ldquo;El sabor es increíblemente suave y la presentación fue perfecta para mi boda civil.&rdquo;
                </p>
                <span className="block text-[9px] font-mono font-bold mt-2" style={{color: 'var(--theme-brand-primary)'}}>
                  — María José, Novia
                </span>
              </motion.div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}

export default memo(Hero);
