import { motion } from 'motion/react';
import { Award, Heart, ShieldCheck, Users, Clock, Coffee } from 'lucide-react';
import { AppConfig } from '../types';
import { optimizeImageUrl } from '../utils/images';
import CachedImage from './CachedImage';

const timelineContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.18,
    },
  },
};

const timelineItemVariants = {
  hidden: { opacity: 0, y: 35 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 60,
      damping: 14,
    },
  },
};

interface HistoryProps {
  config?: AppConfig | null;
}

export default function History({ config }: HistoryProps) {
  const milestones = [
    {
      year: '2018',
      title: 'El Primer Suspiro',
      description: 'Carol, tras graduarse con honores de repostería fina, comenzó a hornear desde la cocina de casa en Sullana, Piura, deleitando a vecinos con su receta secreta de bizcocho de vainilla francesa.',
      icon: Coffee
    },
    {
      year: '2020',
      title: 'Edwin se Une al Viaje',
      description: 'Con el aumento de la demanda familiar y de amigos, Edwin asume la gestión comercial, la logística de entregas y el branding, naciendo la visión de Maison Rosas.',
      icon: Users
    },
    {
      year: '2022',
      title: 'Estudio de Diseño Floral',
      description: 'Nos especializamos en pasteles de bodas y celebraciones elegantes, incorporando flores frescas de alta selección y pan de oro comestible de 24k en nuestros diseños.',
      icon: Award
    },
    {
      year: '2026',
      title: 'Maison Rosas Digital',
      description: 'Hoy lanzamos nuestro catálogo interactivo para que puedas personalizar nuestros modelos de autor prediseñados y disfrutarlos con total comodidad coordinando por WhatsApp.',
      icon: Heart
    }
  ];

  return (
    <section 
      id="historia" 
      className="py-24 bg-transparent relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Block */}
        <motion.div 
          initial={{ opacity: 0, y: 30, filter: 'blur(4px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: 'spring', stiffness: 80, damping: 16, mass: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-[10px] tracking-[0.3em] uppercase opacity-75 text-brand-secondary dark:text-brand-300 block font-semibold">
            TRADICIÓN & EXCLUSIVIDAD
          </span>
          <h2 className="text-4xl sm:text-5xl font-serif font-light italic mt-3" style={{color: 'var(--theme-text)'}}>
            {config?.aboutTitle || 'Nuestra Historia de Sabor Familiar'}
          </h2>
          <div className="w-12 h-[1px] bg-brand-secondary/30 mx-auto mt-5" />
          {config?.aboutDescription ? (
            <p            className="text-sm font-light leading-relaxed" style={{color: 'var(--theme-text-secondary)'}}>
              {config.aboutDescription}
            </p>
          ) : (
            <p            className="text-sm font-light leading-relaxed" style={{color: 'var(--theme-text-secondary)'}}>
              Maison Rosas nació de la unión de dos pasiones: el arte de la alta repostería artesanal en manos de 
              <strong> Carol Yakeline Rosas Albines</strong>, y la dedicación a la excelencia de servicio, confianza y logística liderada por 
              <strong> Edwin Raúl Rosas Albines</strong>. Cada pastel es una obra maestra exclusiva que combina tradición familiar, amor y elegancia suprema.
            </p>
          )}
        </motion.div>

        {/* Info Grid (Carol & Edwin splits) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
          
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
            id="history-kitchen-desc"
          >
            <div className="inline-flex p-3.5 rounded-none text-brand-secondary shadow-sm border" style={{backgroundColor: 'var(--theme-surface-glass)', borderColor: 'var(--theme-glass-border)'}}>
              <Heart className="h-5 w-5 animate-pulse" />
            </div>                    <h3 className="text-3xl font-serif font-light italic" style={{color: 'var(--theme-text)'}}>
              El Secreto de Nuestra Cocina Artesanal
            </h3>
            <p className="text-sm font-light leading-relaxed" style={{color: 'var(--theme-text-secondary)'}}>
              No creemos en la producción masiva. Carol hornea cada bizcocho a pedido utilizando ingredientes frescos, huevos de corral, 
              mantequilla de verdad y chocolate belga de alta pureza. Nuestro enfoque se centra en la humedad perfecta de las migas y rellenos 
              generosos que deleitan el paladar sin empalagar.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-start space-x-3">
                <div className="p-1.5 rounded-none border mt-1" style={{backgroundColor: 'var(--theme-surface-glass)', borderColor: 'var(--theme-glass-border)', color: 'rgb(52,211,153)'}}>
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-serif font-light italic" style={{color: 'var(--theme-text)'}}>Sin Preservantes</h4>
                  <p className="text-xs font-light" style={{color: 'var(--theme-text-muted)'}}>100% natural y fresco</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-1.5 rounded-none border mt-1" style={{backgroundColor: 'var(--theme-surface-glass)', borderColor: 'var(--theme-glass-border)', color: 'rgb(52,211,153)'}}>
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-serif font-light italic" style={{color: 'var(--theme-text)'}}>A Pedido</h4>
                  <p className="text-xs font-light" style={{color: 'var(--theme-text-muted)'}}>Horneado horas antes de la entrega</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30, filter: 'blur(4px)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 70, damping: 14, mass: 0.8 }}
            className="relative"
            id="history-chef-photo"
          >
            <div className="absolute inset-0 bg-brand-500 rounded-3xl rotate-3 scale-[0.98] opacity-10" />
            <CachedImage
              src={config?.aboutImage || ''}
              width={800}
              alt="Carol horneando con amor"
              className="relative w-full aspect-[4/3] object-cover rounded-3xl shadow-xl border border-white/20"
              wrapperClassName="w-full aspect-[4/3] rounded-3xl"
            />
            <div className="absolute -bottom-4 -left-4 glass-panel p-4 rounded-none shadow-lg border backdrop-blur-md" style={{borderColor: 'var(--theme-glass-border)', backgroundColor: 'var(--theme-surface-glass)'}}>
              <span className="block text-[9px] font-mono font-bold uppercase tracking-widest text-brand-secondary dark:text-brand-400">Pastelera Principal</span>
              <span className="block text-sm font-serif font-light italic mt-1" style={{color: 'var(--theme-text)'}}>Carol Y. Rosas Albines</span>
            </div>
          </motion.div>

        </div>

        {/* Interactive Chronological Timeline */}            <div className="border-t pt-16" style={{borderColor: 'var(--theme-border)'}}>
          <h3 className="text-2xl font-serif font-light italic text-center mb-12" style={{color: 'var(--theme-text)'}}>
            Nuestro Camino Juntos
          </h3>
          
          <div className="relative" id="timeline-container">
            {/* Center line for Desktop */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-[1px] h-full bg-brand-secondary/20 hidden md:block" />

            <motion.div 
              variants={timelineContainerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              className="space-y-12"
            >
              {milestones.map((milestone, index) => {
                const Icon = milestone.icon;
                const isEven = index % 2 === 0;
                
                return (
                  <motion.div
                    key={index}
                    variants={timelineItemVariants}
                    className={`flex flex-col md:flex-row items-center justify-between ${
                      isEven ? 'md:flex-row-reverse' : ''
                    }`}
                    id={`timeline-step-${index}`}
                  >
                    {/* Placeholder space for balance */}
                    <div className="w-full md:w-[45%]" />

                    {/* Timeline Center Badge */}
                    <div className="relative my-4 md:my-0 z-10 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold shadow-md hover:scale-110 transition-transform duration-300 border border-white/20">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="absolute -bottom-6 font-mono text-[9px] font-bold tracking-widest text-brand-secondary dark:text-brand-400">
                        {milestone.year}
                      </span>
                    </div>

                    {/* Milestone Card */}
                    <div className="w-full md:w-[45%] glass-panel p-6 rounded-[20px] border border-white/30 dark:border-white/5 bg-white/40 dark:bg-zinc-950/20 shadow-sm backdrop-blur-md text-left">
                      <span className="inline-block text-[10px] font-mono font-bold text-brand-secondary dark:text-brand-400 mb-1">
                        {milestone.year}
                      </span>
                      <h4 className="text-lg font-serif font-light italic" style={{color: 'var(--theme-text)'}}>
                        {milestone.title}
                      </h4>
                      <p className="text-sm font-light mt-2 leading-relaxed" style={{color: 'var(--theme-text-secondary)'}}>
                        {milestone.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>

      </div>
    </section>
  );
}
