import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion } from 'motion/react';
import { Search, Clock, CheckCircle2, ChevronRight, SlidersHorizontal, Eye } from 'lucide-react';
import type { Product } from '../types';
import { optimizeImageUrl } from '../utils/images';
import CachedImage from './CachedImage';
import Skeleton from './ui/Skeleton';
import EmptyState from './ui/EmptyState';
import Badge from './ui/Badge';

interface CatalogProps {
  products: Product[];
  onSelectCustomize: (product: Product) => void;
  loading?: boolean;
}

const CATEGORIES = ['Todos', 'Bodas', 'Cumpleaños', 'Infantiles', 'Aniversarios', 'Especiales'] as const;

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton.Card key={i} />
      ))}
    </div>
  );
}

export default function Catalog({ products, onSelectCustomize, loading = false }: CatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [galleryProductId, setGalleryProductId] = useState<string | null>(null);
  const [galleryImageIndex, setGalleryImageIndex] = useState(0);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch =
          !searchTerm ||
          product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory =
          selectedCategory === 'Todos' ||
          product.category?.trim().toLowerCase() === selectedCategory.trim().toLowerCase();
        return matchesSearch && matchesCategory && product.active !== false;
      }),
    [products, searchTerm, selectedCategory]
  );

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory('Todos');
  }, []);

  return (
    <section id="catalogo" className="py-24 bg-transparent relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[10px] tracking-[0.3em] uppercase opacity-75 text-brand-secondary dark:text-brand-300 block font-semibold">
            MODELOS DE AUTOR EXCLUSIVOS
          </span>
          <h2 className="text-4xl sm:text-5xl font-serif font-light italic mt-3" style={{ color: 'var(--theme-text)' }}>
            Catálogo de Diseños
          </h2>
          <div className="w-12 h-[1px] bg-brand-secondary/30 mx-auto mt-5" aria-hidden="true" />
          <p className="text-sm font-light mt-5 max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
            Cada opción es una plantilla cuidadosamente diseñada por Carol. Podrás personalizar sabores,
            cobertura de color, mensajes escritos a mano en azúcar y decoraciones secundarias.
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12" id="catalog-controls">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Buscar pastel, ingrediente o etiqueta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border rounded-xl text-sm text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all shadow-sm"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              id="catalog-search-input"
              aria-label="Buscar en el catálogo"
            />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none" id="catalog-category-filter" role="tablist" aria-label="Filtrar por categoría">
            <SlidersHorizontal className="h-4 w-4 text-zinc-500 hidden sm:block shrink-0" aria-hidden="true" />
            <div className="flex space-x-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    selectedCategory === category
                      ? 'bg-brand-500 text-white shadow-md'
                      : 'border text-zinc-600 dark:text-zinc-400 hover:border-brand-500/50'
                  }`}
                  style={selectedCategory !== category ? { borderColor: 'var(--theme-border)' } : undefined}
                  role="tab"
                  aria-selected={selectedCategory === category}
                  id={`filter-category-${category}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <CatalogSkeleton />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={<Search className="h-5 w-5 text-zinc-400" />}
            title="No encontramos pasteles para tu búsqueda"
            description='Prueba buscando por "chocolate", "rosado" o seleccionando otra categoría.'
            action={{ label: 'Restablecer Filtros', onClick: handleClearFilters }}
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            id="catalog-products-grid"
            role="list"
            aria-label="Lista de productos"
          >
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                layout
                variants={{
                  hidden: { opacity: 0, y: 30, scale: 0.95, filter: 'blur(4px)' },
                  show: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { type: 'spring' as const, stiffness: 100, damping: 16 } },
                }}
                className="group rounded-[24px] overflow-hidden hover:shadow-md transition-all flex flex-col h-full backdrop-blur-md border border-[var(--theme-border)]"
                style={{ backgroundColor: 'var(--theme-surface)' }}
                role="listitem"
                id={`catalog-card-${product.id}`}
              >
                <div
                  onClick={() => product.stock && onSelectCustomize(product)}
                  className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-900 cursor-pointer group/img"
                  role="button"
                  tabIndex={0}
                  aria-label={`Personalizar ${product.name}`}
                  onKeyDown={(e) => { if (e.key === 'Enter' && product.stock) onSelectCustomize(product); }}
                >
                  <CachedImage
                    src={product.images?.[galleryProductId === product.id ? galleryImageIndex : 0]}
                    width={600}
                    alt={product.name}
                    wrapperClassName="w-full h-full"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    id={`catalog-img-${product.id}`}
                  />

                  {product.images && product.images.length > 1 && (
                    <div className="absolute bottom-4 right-4 flex items-center space-x-1 bg-black/50 backdrop-blur-sm text-white text-[9px] font-mono font-bold px-2 py-1 rounded-full border border-white/10">
                      <span>{(galleryProductId === product.id ? galleryImageIndex : 0) + 1}/{product.images.length}</span>
                    </div>
                  )}

                  {product.images && product.images.length > 1 && (
                    <div className="absolute bottom-4 left-4 right-14 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center gap-1">
                        {product.images.slice(0, 5).map((img, imgIdx) => (
                          <button
                            key={imgIdx}
                            onClick={(e) => { e.stopPropagation(); setGalleryProductId(product.id); setGalleryImageIndex(imgIdx); }}
                            className={`w-6 h-6 rounded-md border-2 overflow-hidden shrink-0 transition-all ${
                              galleryProductId === product.id && galleryImageIndex === imgIdx
                                ? 'border-brand-400 scale-110'
                                : 'border-white/40 hover:border-white'
                            }`}
                            aria-label={`Ver imagen ${imgIdx + 1}`}
                          >
                            <img src={optimizeImageUrl(img, 80)} alt="" className="w-full h-full object-cover" loading="lazy" />
                          </button>
                        ))}
                        {product.images.length > 5 && (
                          <span className="text-[8px] text-white/60 font-mono ml-1">+{product.images.length - 5}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {product.stock && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 text-white">
                      <div className="self-end p-2 bg-white/20 backdrop-blur-md rounded-full border border-white/20">
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-brand-200 block font-bold">Mesa de Diseño</span>
                        <span className="text-[11px] font-sans font-medium block mt-0.5">Diseñar & Previsualizar</span>
                      </div>
                    </div>
                  )}

                  <span
                    className="absolute top-4 left-4 px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest shadow-sm rounded-full"
                    style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text)' }}
                  >
                    {product.category}
                  </span>

                  {!product.stock && (
                    <span className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest shadow-sm rounded-full">
                      Agotado
                    </span>
                  )}
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-base font-serif font-light group-hover:text-brand-secondary transition-colors leading-snug" style={{ color: 'var(--theme-text)' }}>
                        {product.name}
                      </h3>
                      <span className="font-serif italic font-light text-base shrink-0" style={{ color: 'var(--theme-text)' }}>
                        S/. {Math.round(Number(product.basePrice))}
                      </span>
                    </div>

                    <p className="text-xs font-light line-clamp-3 leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
                      {product.description}
                    </p>

                    <div className="flex items-center space-x-4 text-[10px] text-zinc-400 font-mono">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-brand-secondary" aria-hidden="true" />
                        <span>{product.preparationTime}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-hidden="true" />
                        <span>Personalizable</span>
                      </span>
                    </div>

                    {product.tags && product.tags.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-1">
                        {product.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="default" size="sm">#{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-zinc-200/20 dark:border-zinc-800/20 mt-6">
                    <button
                      disabled={!product.stock}
                      onClick={() => onSelectCustomize(product)}
                      className={`w-full py-3.5 rounded-full flex items-center justify-center space-x-2 text-[10px] font-bold uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                        product.stock
                          ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-md hover:shadow-lg'
                          : 'bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-400 cursor-not-allowed'
                      }`}
                      id={`customize-trigger-${product.id}`}
                    >
                      <span>Personalizar Pedido</span>
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
