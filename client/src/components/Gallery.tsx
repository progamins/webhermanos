import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Layers, Eye } from 'lucide-react';
import type { GalleryItem } from '../types';
import { useReducedMotion, useKeyboard } from '../hooks';
import CachedImage from './CachedImage';
import EmptyState from './ui/EmptyState';
import Skeleton from './ui/Skeleton';

interface GalleryProps {
  galleryItems: GalleryItem[];
  loading?: boolean;
}

const CATEGORIES = ['Todos', 'Bodas', 'Cumpleaños', 'Infantiles', 'Aniversarios', 'Especiales'] as const;

export default function Gallery({ galleryItems, loading = false }: GalleryProps) {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [activeTab, setActiveTab] = useState<string>('Todos');
  const reducedMotion = useReducedMotion();

  useKeyboard('Escape', () => setSelectedItem(null), !!selectedItem);

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
            EXPERIENCIAS COMPARTIDAS
          </span>
          <h2 className="text-4xl sm:text-5xl font-serif font-light italic mt-3" style={{ color: 'var(--theme-text)' }}>
            Galería de Creaciones Maison
          </h2>
          <div className="w-12 h-[1px] bg-brand-secondary/30 mx-auto mt-5" aria-hidden="true" />
          <p className="text-sm font-light mt-5 max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
            Fotografías reales de pasteles personalizados entregados a nuestros clientes.
          </p>
        </div>

        <div className="flex justify-center space-x-3 overflow-x-auto pb-4 mb-12 scrollbar-none" id="gallery-tabs" role="tablist" aria-label="Filtrar galería por categoría">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                activeTab === cat
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'border hover:border-brand-500/50'
              }`}
              style={activeTab !== cat ? { borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)' } : undefined}
              role="tab"
              aria-selected={activeTab === cat}
              id={`gallery-tab-${cat}`}
            >
              {cat}
            </button>
          ))}
        </div>

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
                  width={400}
                  alt={item.title || 'Galería Maison Rosas'}
                  wrapperClassName="w-full h-full"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={selectedItem.title}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedItem(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'var(--theme-surface)' }}
            >
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              <CachedImage
                src={selectedItem.imageUrl}
                width={1200}
                alt={selectedItem.title || 'Galería'}
                wrapperClassName="w-full aspect-video"
                className="w-full h-full object-cover"
                priority
              />
              {(selectedItem.title || selectedItem.description) && (
                <div className="p-5 space-y-1">
                  {selectedItem.title && (
                    <h3 className="text-lg font-serif font-bold" style={{ color: 'var(--theme-text)' }}>{selectedItem.title}</h3>
                  )}
                  {selectedItem.description && (
                    <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{selectedItem.description}</p>
                  )}
                  <div className="flex items-center gap-4 pt-2 text-[10px] font-mono" style={{ color: 'var(--theme-text-muted)' }}>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" aria-hidden="true" />
                      {new Date(selectedItem.date).toLocaleDateString('es-PE')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3" aria-hidden="true" />
                      {selectedItem.category}
                    </span>
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
