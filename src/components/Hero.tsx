import { motion } from 'motion/react';
import { ArrowRight, Sparkles, Heart, HelpCircle, PhoneCall } from 'lucide-react';
import { AppConfig } from '../types';

interface HeroProps {
  onViewCatalog: () => void;
  onViewHistory: () => void;
  config?: AppConfig | null;
}

export default function Hero({ onViewCatalog, onViewHistory, config }: HeroProps) {
  // Modern spring-based animation variants
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
        type: 'spring' as const,
        stiffness: 100,
        damping: 18,
        mass: 0.8,
      },
    },
  };

  return (
    <section 
      id="inicio" 
      className="relative min-h-[92vh] flex items-center justify-center pt-24 overflow-hidden bg-gradient-to-b from-brand-50/50 via-white to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900"
    >
      {/* Decorative background ambient blobs */}
      <div className="absolute top-20 left-1/10 w-72 h-72 rounded-full bg-brand-100/40 dark:bg-brand-950/10 blur-3xl will-change-transform animate-blob-1" />
      <div className="absolute bottom-10 right-1/10 w-96 h-96 rounded-full bg-brand-200/20 dark:bg-brand-900/5 blur-3xl will-change-transform animate-blob-2" />

      {/* Floating particles background effect */}
      <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-brand-300 will-change-transform"
            style={{
              width: Math.random() * 8 + 4,
              height: Math.random() * 8 + 4,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -40, 0],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: [0.3, 0.9, 0.3],
            }}
            transition={{
              duration: Math.random() * 6 + 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
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
              className="text-5xl sm:text-6xl lg:text-7xl font-serif font-light italic text-zinc-900 dark:text-white leading-tight"
              id="hero-title"
            >
              {config?.heroTitle ? (
                <>
                  {config.heroTitle.split(' ').slice(0, -1).join(' ')}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-500 dark:from-brand-300 dark:to-brand-200 block sm:inline">
                    {config.heroTitle.split(' ').slice(-1)[0]}
                  </span>
                </>
              ) : (
                <>
                  El Arte de <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-500 dark:from-brand-300 dark:to-brand-200">
                    Compartir
                  </span>
                </>
              )}
            </motion.h1>

            <motion.p
              variants={heroItemVariants}
              className="text-lg text-zinc-600 dark:text-zinc-300 max-w-sm mx-auto lg:mx-0 leading-relaxed font-light"
              id="hero-desc"
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
                <span className="text-2xl font-light text-zinc-900 dark:text-white">100%</span>
                <span className="text-[9px] uppercase tracking-tighter text-zinc-500 dark:text-zinc-400">Natural</span>
              </div>
              <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800"></div>
              <div className="flex flex-col text-left">
                <span className="text-2xl font-light text-zinc-900 dark:text-white">Handmade</span>
                <span className="text-[9px] uppercase tracking-tighter text-zinc-500 dark:text-zinc-400">With Love</span>
              </div>
              <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800"></div>
              <div className="flex flex-col text-left">
                <span className="text-2xl font-light text-zinc-900 dark:text-white">Family</span>
                <span className="text-[9px] uppercase tracking-tighter text-zinc-500 dark:text-zinc-400">Owned</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Visual Showcase (Cake mockup & presentation) */}
          <div className="lg:col-span-5 relative flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotate: -3, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, rotate: 0, filter: 'blur(0px)' }}
              transition={{ 
                type: 'spring',
                stiffness: 60,
                damping: 14,
                mass: 1,
                delay: 0.2,
              }}
              className="glass-panel relative w-full max-w-[420px] aspect-[4/5] rounded-[40px] p-4 overflow-hidden shadow-xl border border-white/30 dark:border-white/5 bg-white/40 dark:bg-zinc-900/40"
              id="hero-image-container"
            >
              <div className="w-full h-full bg-white/20 dark:bg-zinc-950/20 rounded-[32px] relative overflow-hidden">
                <img
                  src={config?.heroImage || 'https://images.unsplash.com/photo-1535141192574-5d4897c13636?w=600&auto=format&fit=crop&q=80'}
                  alt="Pastel de Boda Rosas"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  id="hero-cake-image"
                  referrerPolicy="no-referrer"
                  fetchPriority="high"
                  decoding="async"
                />
                
                {/* Overlay labels / floaters on image */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent p-6 text-white z-10">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-brand-200">Modelo Destacado</span>
                  <h3 className="text-xl font-serif font-light italic mt-1">Rosado Floral Vintage</h3>
                  <p className="text-xs text-zinc-200 mt-1">Sabor: Vainilla Francesa • Decorado con Rosas Frescas</p>
                </div>
              </div>

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
                className="absolute top-8 -right-4 glass-panel p-4 rounded-2xl shadow-xl max-w-[200px] border border-white/40 text-left z-20"
                id="hero-review-floater"
              >
                <div className="flex items-center space-x-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-amber-400 text-xs">★</span>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-700 dark:text-zinc-300 font-sans italic leading-tight">
                  "El sabor es increíblemente suave y la presentación fue perfecta para mi boda civil."
                </p>
                <span className="block text-[9px] font-mono font-bold mt-2 text-brand-700 dark:text-brand-400">
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
