import { memo, useMemo } from 'react';
import { motion } from 'motion/react';
import { Sparkles, MessageCircle } from 'lucide-react';
import type { AppConfig } from '../../../../shared/types';
import Button from '../../../../shared/components/ui/Button';

interface HeroContentProps {
  onViewCatalog: () => void;
  config?: AppConfig | null;
  reducedMotion?: boolean;
}

const PREMIUM_EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Contenido central del HERO: identidad de Maison Rosas, mensaje principal
 * (configurable desde el panel admin), CTAs y confianza. Se mantiene por
 * encima de la escena 3D (z-index 10) y nunca pierde interacción.
 */
function HeroContent({ onViewCatalog, config, reducedMotion = false }: HeroContentProps) {
  const variants = useMemo(
    () =>
      reducedMotion
        ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
        : {
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.55 } },
          },
    [reducedMotion]
  );

  const itemVariants = useMemo(
    () =>
      reducedMotion
        ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
        : {
            hidden: { opacity: 0, y: 26, filter: 'blur(4px)' },
            show: {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              transition: { type: 'tween' as const, ease: PREMIUM_EASE, duration: 0.6 },
            },
          },
    [reducedMotion]
  );

  const titleParts = (config?.heroTitle || 'El Arte de Compartir').split(' ');
  const titleLead = titleParts.slice(0, -1).join(' ');
  const titleAccent = titleParts[titleParts.length - 1] || 'Compartir';

  const whatsappHref = `https://wa.me/${config?.whatsappNumber || '51902568187'}?text=${encodeURIComponent('¡Hola! Quiero pedir un keke 🍰')}`;

  const inner = (
    <div className="text-center max-w-3xl mx-auto space-y-6">
      <div
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border font-mono font-semibold uppercase tracking-widest text-[10px]"
        id="hero-badge"
        style={{
          backgroundColor: 'var(--theme-surface-glass)',
          borderColor: 'var(--theme-border)',
          color: 'var(--theme-brand-primary)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{config?.heroBadge || 'Kekes artesanales peruanos'}</span>
      </div>

      <p
        className="font-serif text-lg italic tracking-[0.18em] uppercase"
        style={{ color: 'var(--theme-brand-primary)' }}
      >
        Maison Rosas
      </p>

      <h1
        className="text-[2.6rem] leading-[1.08] sm:text-6xl lg:text-7xl font-serif font-light italic"
        id="hero-title"
        style={{ color: 'var(--theme-text)' }}
      >
        {titleLead}{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary via-amber-500 to-amber-600 dark:from-brand-secondary dark:via-amber-400 dark:to-amber-500 bg-[length:200%_100%] animate-gradient-shift">
          {titleAccent}
        </span>
      </h1>

      <p
        className="text-base sm:text-lg max-w-xl mx-auto leading-relaxed font-light"
        id="hero-desc"
        style={{ color: 'var(--theme-text-secondary)' }}
      >
        {config?.heroDescription ||
          'Diseños exclusivos creados por Carol Rosas para transformar tus momentos especiales en legados de sabor.'}
      </p>

      <div
        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        id="hero-actions"
      >
        <Button onClick={onViewCatalog} variant="primary" size="lg">
          Ver Kekes
        </Button>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full font-semibold text-sm sm:text-base px-7 py-3.5 transition-all duration-300 border"
          style={{
            backgroundColor: 'transparent',
            borderColor: 'var(--theme-brand-primary)',
            color: 'var(--theme-brand-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-brand-primary)';
            e.currentTarget.style.color = '#FFFCF7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--theme-brand-primary)';
          }}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Pedir Ahora
        </a>
      </div>

      <div
        className="flex items-center justify-center gap-5 sm:gap-6 pt-4 opacity-90"
        id="hero-stats"
      >
        <div>
          <span className="text-xl sm:text-2xl font-light block" style={{ color: 'var(--theme-text)' }}>
            100%
          </span>
          <span className="text-[9px] uppercase tracking-tighter" style={{ color: 'var(--theme-text-muted)' }}>
            Natural
          </span>
        </div>
        <div className="w-px h-7" style={{ backgroundColor: 'var(--theme-border)' }} aria-hidden="true" />
        <div>
          <span className="text-xl sm:text-2xl font-light block" style={{ color: 'var(--theme-text)' }}>
            A Diario
          </span>
          <span className="text-[9px] uppercase tracking-tighter" style={{ color: 'var(--theme-text-muted)' }}>
            Horneado fresco
          </span>
        </div>
        <div className="w-px h-7" style={{ backgroundColor: 'var(--theme-border)' }} aria-hidden="true" />
        <div>
          <span className="text-xl sm:text-2xl font-light block" style={{ color: 'var(--theme-text)' }}>
            Familia
          </span>
          <span className="text-[9px] uppercase tracking-tighter" style={{ color: 'var(--theme-text-muted)' }}>
            Rosas
          </span>
        </div>
      </div>
    </div>
  );

  if (reducedMotion) return inner;

  return (
    <motion.div variants={variants} initial="hidden" animate="show">
      <motion.div variants={itemVariants}>{inner}</motion.div>
    </motion.div>
  );
}

export default memo(HeroContent);
