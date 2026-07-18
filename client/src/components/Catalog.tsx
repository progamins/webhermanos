import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Clock, CheckCircle2, ChevronRight, SlidersHorizontal, Eye } from 'lucide-react';
import { Product } from '../types';
import { optimizeImageUrl } from '../utils/images';
import CachedImage from './CachedImage';

interface CatalogProps {
  products: Product[];
  onSelectCustomize: (product: Product) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95, filter: 'blur(4px)' },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    filter: 'blur(0px)',
    transition: { 
      type: 'spring' as const,
      stiffness: 100,
      damping: 16,
      mass: 0.8,
    } 
  },
};

export default function Catalog({ products, onSelectCustomize }: CatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [galleryProductId, setGalleryProductId] = useState<string | null>(null);
  const [galleryImageIndex, setGalleryImageIndex] = useState(0);

  const categories = ['Todos', 'Bodas', 'Cumpleaños', 'Infantiles', 'Aniversarios', 'Especiales'];

  // Filter products based on search term and category
  const filteredProducts = products.filter((product) => {
    const name = product.name || '';
    const description = product.description || '';
    const category = product.category || '';
    const tags = product.tags || [];

    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'Todos' || 
                            category.trim().toLowerCase() === selectedCategory.trim().toLowerCase();

    // Treat active as true unless explicitly set to false
    const isActive = product.active !== false;

    return matchesSearch && matchesCategory && isActive;
  });

  return (
    <section 
      id="catalogo" 
      className="py-24 bg-transparent relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[10px] tracking-[0.3em] uppercase opacity-75 text-brand-secondary dark:text-brand-300 block font-semibold">
            MODELOS DE AUTOR EXCLUSIVOS
          </span>
          <h2 className="text-4xl sm:text-5xl font-serif font-light italic mt-3" style={{color: 'var(--theme-text)'}}>
            Catálogo de Diseños
          </h2>
          <div className="w-12 h-[1px] bg-brand-secondary/30 mx-auto mt-5" />
          <p className="text-sm font-light mt-5 max-w-xl mx-auto leading-relaxed" style={{color: 'var(--theme-text-secondary)'}}>
            Cada opción es una plantilla cuidadosamente diseñada por Carol. Podrás personalizar sabores, 
            cobertura de color, mensajes escritos a mano en azúcar y decoraciones secundarias.
          </p>
        </div>

        {/* Search and Filters Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12" id="catalog-controls">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar pastel, ingrediente o etiqueta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border rounded-none text-zinc-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-secondary/50 transition-all text-xs tracking-wider shadow-sm backdrop-blur-sm"
              style={{
                backgroundColor: 'var(--theme-surface)',
                borderColor: 'var(--theme-border)',
              }}
              id="catalog-search-input"
            />
          </div>

          {/* Slider category tags */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none" id="catalog-category-filter">
            <SlidersHorizontal className="h-4 w-4 text-zinc-500 hidden sm:block shrink-0" />
            <div className="flex space-x-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-5 py-2.5 rounded-none text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                    selectedCategory === category
                      ? 'bg-brand-500 text-white btn-glow shadow-sm'
                      : 'border text-zinc-600 dark:text-zinc-400 hover:border-brand-500/50'
                  }`}
                  style={selectedCategory !== category ? {borderColor: 'var(--theme-border)'} : undefined}
                  id={`filter-category-${category}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Catalog Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 rounded-3xl shadow-sm border" style={{backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)'}}>
            <span className="text-4xl">🧁</span>
            <h3 className="text-lg font-serif font-bold mt-4" style={{color: 'var(--theme-text)'}}>
              No encontramos pasteles para tu búsqueda
            </h3>
            <p className="text-sm mt-2" style={{color: 'var(--theme-text-secondary)'}}>
              Prueba buscando por "chocolate", "rosado" o seleccionando otra categoría.
            </p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory('Todos'); }}
              className="mt-4 px-4 py-2 rounded-full bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-mono text-xs font-bold uppercase tracking-wider"
              id="clear-catalog-filters"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8" 
            id="catalog-products-grid"
          >
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                layout
                variants={itemVariants}
                className="group glass-panel rounded-[24px] overflow-hidden hover:shadow-md transition-all flex flex-col h-full backdrop-blur-md"
                id={`catalog-card-${product.id}`}
              >
                                {/* Cake Image Box with labels */}
                <div 
                  onClick={() => product.stock && onSelectCustomize(product)}
                  className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-900 cursor-pointer group/img"
                >
                <CachedImage
                  src={product.images?.[galleryProductId === product.id ? galleryImageIndex : 0]}
                  width={600}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  wrapperClassName="w-full h-full"
                  id={`catalog-img-${product.id}`}
                />
                
                {/* Image count badge */}
                {product.images && product.images.length > 1 && (
                  <div className="absolute bottom-4 right-4 flex items-center space-x-1 bg-black/50 backdrop-blur-sm text-white text-[9px] font-mono font-bold px-2 py-1 rounded-full border border-white/10">
                    <span>{(galleryProductId === product.id ? galleryImageIndex : 0) + 1}/{product.images.length}</span>
                  </div>
                )}

                {/* Mini gallery navigation on hover */}
                {product.images && product.images.length > 1 && (
                  <div className="absolute bottom-4 left-4 right-14 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center gap-1">
                      {product.images.slice(0, 5).map((img, imgIdx) => (
                        <button
                          key={imgIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setGalleryProductId(product.id);
                            setGalleryImageIndex(imgIdx);
                          }}
                          className={`w-6 h-6 rounded-md border-2 overflow-hidden shrink-0 transition-all ${
                            galleryProductId === product.id && galleryImageIndex === imgIdx
                              ? 'border-brand-400 scale-110'
                              : 'border-white/40 hover:border-white'
                          }`}
                        >
                          <img
                            src={optimizeImageUrl(img, 80)}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                      {product.images.length > 5 && (
                        <span className="text-[8px] text-white/60 font-mono ml-1">+{product.images.length - 5}</span>
                      )}
                    </div>
                  </div>
                )}
                  
                  {/* Eye preview/Customize overlay with glass effect on hover */}
                  {product.stock && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 text-white">
                      <div className="self-end p-2 bg-white/20 backdrop-blur-md rounded-full border border-white/20">
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-brand-200 block font-bold">Mesa de Diseño</span>
                        <span className="text-[11px] font-sans font-medium text-white block mt-0.5">Diseñar & Previsualizar</span>
                      </div>
                    </div>
                  )}

                  {/* Category label */}
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-none text-[9px] font-mono font-bold uppercase tracking-widest shadow-sm" style={{backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text)', borderColor: 'var(--theme-border)'}}>
                    {product.category}
                  </span>

                  {/* Stock label */}
                  {!product.stock && (
                    <span className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-none text-[9px] font-mono font-bold uppercase tracking-widest shadow-sm">
                      Agotado
                    </span>
                  )}
                </div>

                {/* Cake specifications */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-base font-serif font-light group-hover:text-brand-secondary transition-colors leading-snug" style={{color: 'var(--theme-text)'}}>
                        {product.name}
                      </h3>
                      <span className="font-serif italic font-light text-base shrink-0" style={{color: 'var(--theme-text)'}}>
                        S/. {product.basePrice}
                      </span>
                    </div>

                    <p className="text-xs font-light line-clamp-3 leading-relaxed" style={{color: 'var(--theme-text-secondary)'}}>
                      {product.description}
                    </p>

                    {/* Metadata tags */}
                    <div className="flex items-center space-x-4 text-[10px] text-zinc-400 font-mono">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-brand-secondary" />
                        <span>{product.preparationTime}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span>Personalizable</span>
                      </div>
                    </div>

                    {/* Flavor previews */}
                    <div className="pt-2 flex flex-wrap gap-1">
                      {product.tags && product.tags.slice(0, 3).map((tag, idx) => (
                        <span 
                          key={idx} 
                          className="text-[9px] uppercase tracking-wider font-mono px-2 py-0.5 border" style={{backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)'}}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-6 border-t border-zinc-200/20 dark:border-zinc-800/20 mt-6">
                    <button
                      disabled={!product.stock}
                      onClick={() => onSelectCustomize(product)}
                      className={`w-full py-3.5 rounded-none flex items-center justify-center space-x-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                        product.stock
                          ? 'bg-brand-500 hover:bg-brand-600 text-white btn-glow'
                          : 'bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-400 cursor-not-allowed'
                      }`}
                      id={`customize-trigger-${product.id}`}
                    >
                      <span>Personalizar Pedido</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                </div>                              </motion.div>
            ))}
          </motion.div>
        )}

      </div>
    </section>
  );
}
