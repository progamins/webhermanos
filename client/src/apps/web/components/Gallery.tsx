import { memo, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Layers, Eye } from 'lucide-react';
import type { GalleryItem } from '../../../shared/types';
import { useReducedMotion, useKeyboard, useBrokenImages } from '../../../shared/hooks';
import CachedImage from '../../../shared/components/CachedImage';
import BrokenImageBadge from '../../../shared/components/BrokenImageBadge';
import EmptyState from '../../../shared/components/ui/EmptyState';
import Skeleton from '../../../shared/components/ui/Skeleton';
import { reportBrokenImage } from '../../../shared/utils/images';

interface GalleryProps {
  galleryItems: GalleryItem[];
  loading?: boolean;
}


function Gallery({ galleryItems, loading = false }: GalleryProps) {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [activeTab, setActiveTab] = useState<string>('Todos');
  const reducedMotion = useReducedMotion();
  const { isBroken, markBroken } = useBrokenImages();

  useKeyboard('Escape', () => setSelectedItem(null), !!selectedItem);

  // Categorías disponibles = las que REALMENTE tienen fotos publicadas (en
  // orden de aparición), para que una categoría nueva creada desde el panel
  // admin (ej: "Bodas", "Cumpleaños") obtenga su chip automáticamente.
  const availableCategories = useMemo(() => {
    const seen: string[] = [];
    for (const item of galleryItems) {
      const cat = item.category;
      if (cat && cat.trim() && !seen.includes(cat)) seen.push(cat);
    }
    return seen;
  }, [galleryItems]);

  const filteredItems = galleryItems.filter((item) =>
    activeTab === 'Todos' || item.category === activeTab
  );

  const containerVariants = reducedMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
      };

  const itemVariants = reducedMotion
    ? { hidden: { opacity: 1, scale: 1 }, show: { opacity: 1, scale: 1 } }
    : {
        hidden: { opacity: 0, scale: 0.9, filter: 'blur(2px)' },
        show: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { type: 'spring' as const, stiffness: 80, damping: 14 } },
      };

  return (
    <section id="galeria" className="py-24 bg-transparent relative overflow-hidden" aria-label="Galería de creaciones">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-[10px] tracking-[0.3em] uppercase opacity-75 text-brand-secondary dark:text-brand-300 block font-semibold">
            HORNEADOS CON AMOR
          </span>
          <h2 className="text-4xl sm:text-5xl font-serif font-light italic mt-3" style={{ color: 'var(--theme-text)' }}>
            Galería de Kekes Maison
          </h2>
          <div className="w-12 h-[1px] bg-brand-secondary/30 mx-auto mt-5" aria-hidden="true" />
          <p className="text-sm font-light mt-5 max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
            Los kekes que horneamos cada día con ingredientes frescos y sabores peruanos.
          </p>
        </div>

        {galleryItems.length > 0 && (
          <div className="flex justify-start md:justify-center gap-2 overflow-x-auto pb-4 mb-12 px-4 md:px-0 scrollbar-none snap-x snap-mandatory" id="gallery-tabs" role="group" aria-label="Filtrar galería por categoría">
            {['Todos', ...availableCategories].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`shrink-0 snap-start px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  activeTab === cat
                    ? 'bg-brand-500 text-white shadow-md'
                    : 'border hover:border-brand-500/50'
                }`}
                style={activeTab !== cat ? { borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)' } : undefined}
                aria-pressed={activeTab === cat}
                data-category={cat}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} variant="image" className="aspect-square rounded-2xl" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={<Layers className="h-5 w-5 text-zinc-400" />}
            title="Aún no hay fotos en esta categoría"
            description="Pronto compartiremos más creaciones de Carol."
          />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            role="list"
            aria-label="Galería de imágenes"
          >
            {filteredItems.map((item) => (
              <motion.button
                key={item.id}
                variants={itemVariants}
                onClick={() => setSelectedItem(item)}
                className="group relative aspect-square rounded-2xl overflow-hidden border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
                style={{ borderColor: 'var(--theme-border)' }}
                role="listitem"
                aria-label={`Ver ${item.title || 'imagen'}`}
              >
                <CachedImage
                  src={item.imageUrl}
                  width={480}
                  sizes="(max-width: 639px) 48vw, (max-width: 1023px) 31vw, 23vw"
                  alt={item.title || 'Galería Maison Rosas'}
                  className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
                  onError={() => {
                    markBroken(`${item.id}:${item.imageUrl}`);
                    reportBrokenImage(item.imageUrl);
                  }}
                />
                {isBroken(`${item.id}:${item.imageUrl}`) && (
                  <BrokenImageBadge className="absolute top-3 left-3 z-10" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <div className="text-white text-left">
                    <span className="text-xs font-serif font-semibold block truncate">{item.title}</span>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-brand-200">{item.category}</span>
                  </div>
                </div>
                <div className="absolute top-3 right-3 p-1.5 bg-black/30 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>

      {selectedItem && createPortal(
        <AnimatePresence>
          {/* Modal centrado estilo "tarjeta": la web queda visible (fondo
              difuminado) y la imagen se presenta dentro de un panel con su
              ficha — nunca ocupa el 100% del viewport. */}
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={selectedItem.title || 'Imagen de la galería'}
          >
            <motion.div
              key="gallery-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.25 }}
              className="absolute inset-0 bg-black/55 backdrop-blur-[6px]"
              onClick={() => setSelectedItem(null)}
              aria-hidden="true"
            />

            <motion.div
              key="gallery-panel"
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: reducedMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-[min(94vw,880px)] max-h-[92svh] overflow-y-auto rounded-[28px] border shadow-2xl"
              style={{
                backgroundColor: 'var(--theme-surface)',
                borderColor: 'var(--theme-border)',
                boxShadow: '0 30px 80px -18px rgba(43,26,18,0.45), 0 1px 1px rgba(255,255,255,0.5) inset',
              }}
            >
              {/* Botón cerrar — flotante sobre el panel */}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-3 right-3 z-20 p-2.5 rounded-full border backdrop-blur-md transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
                style={{
                  backgroundColor: 'var(--theme-surface-glass)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                }}
                aria-label="Cerrar vista"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>

              {/* Imagen — ocupa la zona media del panel, sin llenar la pantalla */}
              <div
                className="relative w-full h-[min(60svh,540px)] sm:h-[min(64svh,600px)] flex items-center justify-center overflow-hidden"
                style={{
                  background:
                    'radial-gradient(80% 70% at 50% 35%, var(--theme-bg-alt) 0%, var(--theme-bg) 100%)',
                }}
              >
                <CachedImage
                  src={selectedItem.imageUrl}
                  width={1100}
                  sizes="(max-width: 768px) 94vw, min(92vw, 860px)"
                  alt={selectedItem.title || 'Galería Maison Rosas'}
                  className="w-full h-full object-contain"
                  onError={() => {
                    markBroken(`${selectedItem.id}:${selectedItem.imageUrl}`);
                    reportBrokenImage(selectedItem.imageUrl);
                  }}
                />
              </div>

              {/* Ficha de la creación — texto legible sobre la superficie del panel */}
              {(selectedItem.title || selectedItem.description || selectedItem.category || selectedItem.date) && (
                <div className="p-5 sm:p-6 space-y-3">
                  {selectedItem.title && (
                    <h3 className="text-lg sm:text-xl font-serif font-bold leading-snug" style={{ color: 'var(--theme-text)' }}>
                      {selectedItem.title}
                    </h3>
                  )}
                  {selectedItem.description && (
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
                      {selectedItem.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-1 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                    {selectedItem.date && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-brand-secondary" aria-hidden="true" />
                        {new Date(selectedItem.date).toLocaleDateString('es-PE')}
                      </span>
                    )}
                    {selectedItem.category && (
                      <span className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-brand-secondary" aria-hidden="true" />
                        {selectedItem.category}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
}

export default memo(Gallery);
