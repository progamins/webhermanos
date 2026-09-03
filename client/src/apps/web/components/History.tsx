import { memo } from 'react';
import { motion } from 'motion/react';
import { Award, Heart, ShieldCheck, Users, Clock, Coffee } from 'lucide-react';
import type { AppConfig } from '../../../shared/types';
import { useReducedMotion } from '../../../shared/hooks';
import CachedImage from '../../../shared/components/CachedImage';
import Badge from '../../../shared/components/ui/Badge';

interface HistoryProps {
  config?: AppConfig | null;
}

const MILESTONES = [
  {
    year: '2018',
    title: 'El Primer Suspiro',
    description: 'Carol, tras graduarse con honores en repostería, comenzó a hornear desde la cocina de casa en Sullana, Piura, deleitando a vecinos con su receta secreta de keke de vainilla.',
    icon: Coffee,
  },
  {
    year: '2020',
    title: 'Edwin se Une al Viaje',
    description: 'Con el aumento de la demanda familiar y de amigos, Edwin asume la gestión comercial, la logística de entregas y el branding, naciendo la visión de Maison Rosas.',
    icon: Users,
  },
  {
    year: '2022',
    title: 'Sabores del Perú',
    description: 'Carol perfecciona sus recetas con insumos de la región: lúcuma, cacao, plátano, maracuyá y canela, dando vida a los kekes que hoy nos identifican.',
    icon: Award,
  },
  {
    year: '2023',
    title: 'Kekes de la Casa',
    description: 'Creamos nuestro espacio de atención desde el hogar, con una dinámica de pedidos por encargo e ingredientes naturales horneados cada mañana.',
    icon: Heart,
  },
  {
    year: '2024',
    title: 'Catálogo Online & Delivery',
    description: 'Lanzamos nuestro catálogo interactivo en línea y el servicio de delivery para toda Sullana y Piura, haciendo posible que más familias disfruten de nuestros kekes.',
    icon: ShieldCheck,
  },
  {
    year: '2025',
    title: 'Reconocimiento Regional',
    description: 'Nombrados como uno de los emprendimientos de repostería artesanal más prometedores de la región Piura, reconocidos por la calidad y el sabor único de nuestros kekes.',
    icon: Clock,
  },
];

function History({ config }: HistoryProps) {
  const reducedMotion = useReducedMotion();

  const containerVariants = reducedMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.18 } },
      };

  const itemVariants = reducedMotion
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 35 },
        show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 60, damping: 14 } },
      };

  return (
    <section id="historia" className="py-24 bg-transparent relative overflow-hidden" aria-label="Nuestra Historia">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[10px] tracking-[0.3em] uppercase opacity-75 text-brand-secondary dark:text-brand-300 block font-semibold">
            Kekes Artesanales desde Sullana, Piura
          </span>
          <h2 className="text-4xl sm:text-5xl font-serif font-light italic mt-3" style={{ color: 'var(--theme-text)' }}>
            Nuestra Historia de Sabor
          </h2>
          <div className="w-12 h-[1px] bg-brand-secondary/30 mx-auto mt-5" aria-hidden="true" />
          <p className="text-sm font-light mt-5 max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
            {config?.aboutDescription || 'Cada keke cuenta una historia de pasión, familia y el inconfundible sabor de la dedicación artesanal de Carol y Edwin Rosas.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 70, damping: 14 }}
            className="relative"
          >
            <div className="premium-glass-card rounded-[32px] overflow-hidden p-3 border border-white/40 dark:border-white/10 shadow-xl">
              <CachedImage
                src={config?.aboutImage || ''}
                width={600}
                alt="Carol y Edwin Rosas Albines - Fundadores de Maison Rosas"
                wrapperClassName="w-full aspect-[4/3] rounded-[24px] overflow-hidden"
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div className="absolute -bottom-4 -right-4 p-4 rounded-2xl premium-glass-card shadow-lg border border-white/40 dark:border-white/10" style={{ backgroundColor: 'var(--theme-surface)' }}>
              <Badge variant="brand" size="sm" dot>Familia Rosas</Badge>
            </div>
          </motion.div>

          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 70, damping: 14 }}
            className="space-y-6"
          >
            <h3 className="text-3xl font-serif font-light italic leading-tight" style={{ color: 'var(--theme-text)' }}>
              {config?.aboutTitle || 'El Sueño de una Familia, Horneado con Amor'}
            </h3>
            <p className="text-sm leading-relaxed font-light" style={{ color: 'var(--theme-text-secondary)' }}>
              Maison Rosas nace del amor por el arte del horneado artesanal y el deseo de una familia sullanense de compartir su talento con el mundo.
              Cada keke es el resultado del perfeccionismo de Carol y la visión emprendedora de Edwin.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              {['100% Natural', 'Artesanal', 'Sullana, Piura', 'Hecho con Amor'].map((tag) => (
                <Badge key={tag} variant="default" size="sm">{tag}</Badge>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="relative"
        >
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-brand-200 via-brand-300/50 to-transparent dark:from-brand-800 dark:via-brand-700/30 hidden md:block" aria-hidden="true" />

          <div className="space-y-12 md:space-y-0">
            {MILESTONES.map((milestone, index) => {
              const Icon = milestone.icon;
              const isEven = index % 2 === 0;
              // Contenido ÚNICO por hito: antes se renderizaba 2-3 veces (móvil +
              // ambas columnas desktop) y solo se ocultaba con CSS — duplicaba texto
              // en el DOM para lectores de pantalla y SEO. Ahora hay una sola copia
              // que cambia de layout por breakpoint.
              return (
                <motion.div
                  key={milestone.year}
                  variants={itemVariants}
                  className={`relative flex items-start gap-4 md:flex md:items-start md:gap-8 ${isEven ? '' : 'md:flex-row-reverse'}`}
                >
                  {/* Nodo — primero en móvil (junto al texto), centrado en la línea en desktop */}
                  <div className="order-first md:order-none flex items-center justify-center shrink-0">
                    <div
                      className="w-10 h-10 md:w-[38px] md:h-[38px] rounded-full border-2 flex items-center justify-center shadow-md"
                      style={{ borderColor: 'var(--theme-brand-primary)' }}
                    >
                      <Icon className="h-4 w-4" style={{ color: 'var(--theme-brand-primary)' }} aria-hidden="true" />
                    </div>
                  </div>

                  {/* Contenido ÚNICO por hito: una sola copia en el DOM que cambia de
                      layout por breakpoint (antes se renderizaba 2-3 veces oculto por
                      CSS, duplicando texto para lectores de pantalla y SEO) */}
                  <div className={`flex-1 md:w-1/2 min-w-0 ${isEven ? 'md:text-right' : 'md:text-left'}`}>
                    <div className="p-5 md:p-6 rounded-2xl md:rounded-none border md:border-0 shadow-sm md:shadow-none bg-[var(--theme-surface-glass)] md:bg-transparent" style={{ borderColor: 'var(--theme-border)' }}>
                      <span className="text-[10px] md:text-[11px] font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--theme-brand-primary)' }}>
                        {milestone.year}
                      </span>
                      <h3 className="text-base md:text-lg font-serif font-bold mt-1" style={{ color: 'var(--theme-text)' }}>
                        {milestone.title}
                      </h3>
                      <p className="text-xs leading-relaxed mt-1 md:mt-2 font-light" style={{ color: 'var(--theme-text-secondary)' }}>
                        {milestone.description}
                      </p>
                    </div>
                  </div>

                  {/* Espaciador desktop — mantiene el nodo centrado en la línea */}
                  <div className="hidden md:block md:w-1/2" aria-hidden="true" />
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default memo(History);
