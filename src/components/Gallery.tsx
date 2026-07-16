import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Layers, Eye } from 'lucide-react';
import { GalleryItem } from '../types';
import { optimizeImageUrl } from '../utils/images';

interface GalleryProps {
  galleryItems: GalleryItem[];
}

export default function Gallery({ galleryItems }: GalleryProps) {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [activeTab, setActiveTab] = useState('Todos');

  const categories = ['Todos', 'Bodas', 'Cumpleaños', 'Infantiles', 'Aniversarios', 'Especiales'];

  const filteredItems = galleryItems.filter((item) => {
    return activeTab === 'Todos' || item.category === activeTab;
  });

  return (
    <section 
      id="galeria" 
      className="py-24 bg-transparent relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-[10px] tracking-[0.3em] uppercase opacity-75 text-brand-secondary dark:text-brand-300 block font-semibold">
            EXPERIENCIAS COMPARTIDAS
          </span>
          <h2 className="text-4xl sm:text-5xl font-serif font-light italic text-zinc-900 dark:text-white mt-3">
            Galería de Creaciones Maison
          </h2>
          <div className="w-12 h-[1px] bg-brand-secondary/30 mx-auto mt-5" />
          <p className="text-sm font-light text-zinc-600 dark:text-zinc-400 mt-5 max-w-xl mx-auto leading-relaxed">
            Fotografías reales de pasteles personalizados entregados a nuestros clientes. 
            Déjate inspirar por los acabados de Carol Rosas y elige tu próxima plantilla.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex justify-center space-x-3 overflow-x-auto pb-4 mb-12 scrollbar-none" id="gallery-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-5 py-2.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
                activeTab === cat
                  ? 'bg-brand-500 text-white shadow-sm btn-glow'
                  : 'bg-white/40 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800/50 hover:bg-white/70'
              }`}
              id={`gallery-tab-${cat}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Masonry Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="gallery-grid">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                transition={{ type: 'spring', stiffness: 80, damping: 14, mass: 0.8 }}
                onClick={() => setSelectedItem(item)}
                className="group relative aspect-[4/5] rounded-[24px] overflow-hidden shadow-sm hover:shadow-xl border border-white/30 dark:border-white/5 cursor-pointer bg-zinc-100 dark:bg-zinc-900"
                id={`gallery-card-${item.id}`}
              >
                <img
                  src={optimizeImageUrl(item.imageUrl, 800)}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  id={`gallery-img-${item.id}`}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                />
                
                {/* Dark Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-6 text-white">
                  
                  {/* Eye Indicator */}
                  <div className="self-end p-2 bg-white/20 backdrop-blur-md rounded-full">
                    <Eye className="h-4 w-4 text-white" />
                  </div>

                  {/* Title and date */}
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-brand-300 font-bold">
                      {item.category}
                    </span>
                    <h4 className="text-lg font-serif font-light italic mt-1">
                      {item.title}
                    </h4>
                    <span className="text-[10px] text-zinc-300 block mt-1">
                      {item.date}
                    </span>
                  </div>

                </div>

              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Lightbox Modal */}
        <AnimatePresence>
          {selectedItem && (
            <GalleryLightbox
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
            />
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}

interface GalleryLightboxProps {
  item: GalleryItem;
  onClose: () => void;
}

function GalleryLightbox({ item, onClose }: GalleryLightboxProps) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-lg flex items-center justify-center p-4"
      id="gallery-lightbox"
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer z-55"
        id="lightbox-close"
      >
        <X className="h-5 w-5" />
      </button>

      <motion.div
        initial={{ scale: 0.9, y: 15, filter: 'blur(4px)' }}
        animate={{ scale: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ scale: 0.9, y: 15, filter: 'blur(4px)' }}
        transition={{ type: 'spring', stiffness: 100, damping: 18 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl w-full bg-zinc-950/80 dark:bg-black/80 rounded-[32px] overflow-hidden border border-white/10 flex flex-col md:flex-row shadow-2xl backdrop-blur-xl"
      >
        {/* Image side */}
        <div className="md:w-2/3 aspect-square md:aspect-auto md:h-[70vh] bg-zinc-900/50 relative">
          <img
            src={optimizeImageUrl(item.imageUrl, 1200)}
            alt={item.title}
            className="w-full h-full object-cover"
            id="lightbox-main-img"
            referrerPolicy="no-referrer"
            decoding="async"
          />
          {/* Glass indicator on image */}
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 text-[9px] font-mono tracking-widest text-brand-200 uppercase">
            Galería Maison Rosas
          </div>
        </div>

        {/* Details side */}
        <div className="md:w-1/3 p-8 flex flex-col justify-between text-white bg-zinc-950/40 backdrop-blur-md border-l border-white/5">
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand-400 font-bold">
                Categoría de Autor
              </span>
              <h3 className="text-2xl font-serif font-light italic text-white mt-1">
                {item.title}
              </h3>
              <div className="w-12 h-[1px] bg-brand-secondary/30 mt-3" />
            </div>

            <p className="text-sm font-light text-zinc-400 leading-relaxed font-sans">
              {item.description || "Este modelo fue personalizado especialmente para un evento familiar de alta gama. Combina técnicas avanzadas de glaseado con la frescura e higroscopicidad perfecta de nuestro bizcocho."}
            </p>
          </div>

          <div className="space-y-4 pt-6 border-t border-zinc-800/80">
            <div className="flex items-center space-x-3 text-zinc-400 text-xs font-mono">
              <Layers className="h-4 w-4 text-brand-secondary" />
              <span>Categoría: {item.category}</span>
            </div>

            <div className="flex items-center space-x-3 text-zinc-400 text-xs font-mono">
              <Calendar className="h-4 w-4 text-brand-secondary" />
              <span>Entregado: {item.date}</span>
            </div>
          </div>
        </div>

      </motion.div>
    </motion.div>,
    document.body
  );
}
