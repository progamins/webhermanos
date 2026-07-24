import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../../../shared/hooks';
import { Search, Clock, CheckCircle2, ChevronRight, SlidersHorizontal, Images, X } from 'lucide-react';
import type { Product } from '../../../shared/types';
import { optimizeImageUrl } from '../../../shared/utils/images';
import { lazyImportPrewarm } from '../../../shared/utils/lazyImportPrewarm';
import CachedImage from '../../../shared/components/CachedImage';
import Skeleton from '../../../shared/components/ui/Skeleton';
import EmptyState from '../../../shared/components/ui/EmptyState';
import Badge from '../../../shared/components/ui/Badge';
import { MagicCard } from '../../../shared/components/magicui/magic-card';
import { ShimmerButton } from '../../../shared/components/magicui/shimmer-button';
import { cn } from '../../../shared/lib/utils';
import {
  Dialog,
  DialogContent,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '../../../shared/components/ui';

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
  const reducedMotion = useReducedMotion();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [galleryProductId, setGalleryProductId] = useState<string | null>(null);
  const [galleryImageIndex, setGalleryImageIndex] = useState(0);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselProduct, setCarouselProduct] = useState<Product | null>(null);
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);
  const [carouselCurrentIndex, setCarouselCurrentIndex] = useState(0);

  // Prewarm el chunk del Customizer en idle: al hacer clic en "Personalizar Pedido"
  // el modal ya está en caché y aparece sin delay de red.
  useEffect(() => {
    const run = () => lazyImportPrewarm(() => import('./Customizer'));
    if ('requestIdleCallback' in window) {
      const h = (window as Window).requestIdleCallback(run, { timeout: 2000 });
      return () => (window as Window).cancelIdleCallback(h as number);
    }
    const t = setTimeout(run, 600);
    return () => clearTimeout(t);
  }, []);

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
            initial={reducedMotion ? false : 'hidden'}
            whileInView={reducedMotion ? undefined : 'show'}
            viewport={{ once: true, margin: '-80px' }}
            variants={reducedMotion ? undefined : {
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.08,
                  delayChildren: 0.1,
                  ease: [0.16, 1, 0.3, 1],
                },
              },
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            id="catalog-products-grid"
            role="list"
            aria-label="Lista de productos"
          >
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                variants={reducedMotion ? undefined : {
                  hidden: { opacity: 0, y: 30 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      type: 'tween' as const,
                      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                      duration: 0.55,
                    },
                  },
                }}
                role="listitem"
                id={`catalog-card-${product.id}`}
              >
              <MagicCard
                className="flex flex-col h-full overflow-hidden rounded-[24px]"
                style={{ backgroundColor: 'var(--theme-surface)' }}
                gradientColor="var(--color-brand-500)"
                gradientOpacity={0.06}
                gradientSize={250}
              >
                <div className="flex flex-col h-full">
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCarouselProduct(product);
                        setCarouselStartIndex(galleryProductId === product.id ? galleryImageIndex : 0);
                        setCarouselOpen(true);
                      }}
                      className="absolute bottom-4 left-4 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 px-3 py-1.5 bg-black/50 backdrop-blur-sm text-white text-[9px] font-mono font-bold rounded-full border border-white/10 flex items-center gap-1.5 hover:bg-black/60"
                      aria-label="Ver galería completa"
                    >
                      <Images className="h-3 w-3" aria-hidden="true" />
                      <span>Ver galería</span>
                    </button>
                  )}

                  {product.stock && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 text-white">
                      <div className="self-end p-2 bg-white/20 backdrop-blur-md rounded-full border border-white/20">
                        <Images className="h-4 w-4" aria-hidden="true" />
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
                      <ShimmerButton
                        disabled={!product.stock}
                        onClick={() => onSelectCustomize(product)}
                        onMouseEnter={() => lazyImportPrewarm(() => import('./Customizer'))}
                        variant="brand"
                        size="default"
                        className={cn(
                          'w-full',
                          !product.stock && 'bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-400'
                        )}
                        id={`customize-trigger-${product.id}`}
                      >
                        <span className="flex items-center gap-2">
                          <span>Personalizar Pedido</span>
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      </ShimmerButton>
                    </div>
                  </div>
                </div>
              </MagicCard>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Carousel de galería de imágenes con shadcn Dialog */}
      <Dialog open={carouselOpen} onOpenChange={setCarouselOpen}>
        <DialogContent
          className="max-w-4xl p-0 overflow-hidden rounded-2xl border-0 bg-black/95"
          showCloseButton={false}
        >
          <button
            onClick={() => setCarouselOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Cerrar galería"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          {carouselProduct && carouselProduct.images && carouselProduct.images.length > 0 && (
            <Carousel
              opts={{
                startIndex: carouselStartIndex,
                loop: true,
              }}
              className="w-full"
              setApi={(api) => {
                api?.on('select', () => setCarouselCurrentIndex(api.selectedScrollSnap()));
              }}
            >
              <CarouselContent>
                {carouselProduct.images.map((img, imgIdx) => (
                  <CarouselItem key={imgIdx}>
                    <div className="flex items-center justify-center h-[70vh] sm:h-[80vh] p-2">
                      <img
                        src={optimizeImageUrl(img, 1200)}
                        alt={`${carouselProduct.name} - Imagen ${imgIdx + 1}`}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>

              <CarouselPrevious className="left-4 text-white border-white/20 bg-black/40 hover:bg-black/60 hover:text-white" />
              <CarouselNext className="right-4 text-white border-white/20 bg-black/40 hover:bg-black/60 hover:text-white" />

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-mono border border-white/10">
                {carouselProduct.name} &mdash;{' '}
                <span className="text-brand-300">
                  {carouselCurrentIndex + 1}/{carouselProduct.images.length}
                </span>
              </div>
            </Carousel>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
