import { memo, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../../../shared/hooks';
import { Search, Clock, CheckCircle2, ChevronRight, ChevronLeft, SlidersHorizontal, Images, X } from 'lucide-react';
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
} from '../../../shared/components/ui';
import type { CarouselApi } from '../../../shared/components/ui';

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

function Catalog({ products, onSelectCustomize, loading = false }: CatalogProps) {
  const reducedMotion = useReducedMotion();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [galleryProductId, setGalleryProductId] = useState<string | null>(null);
  const [galleryImageIndex, setGalleryImageIndex] = useState(0);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselProduct, setCarouselProduct] = useState<Product | null>(null);
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);
  const [carouselCurrentIndex, setCarouselCurrentIndex] = useState(0);
  const carouselApiRef = useRef<CarouselApi | null>(null);

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

  /** Normaliza texto: minúsculas y sin acentos, para búsquedas tolerantes
   *  (ej: "cumpleanos" encuentra "Cumpleaños", "bodas" encuentra "Bodas"). */
  const normalize = useCallback((s: string) =>
    (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(),
  []);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const q = normalize(searchTerm);
        const matchesSearch =
          !searchTerm ||
          normalize(product.name).includes(q) ||
          normalize(product.description).includes(q) ||
          normalize(product.category).includes(q) ||
          product.tags?.some((tag) => normalize(tag).includes(q));
        const matchesCategory =
          selectedCategory === 'Todos' ||
          normalize(product.category) === normalize(selectedCategory);
        return matchesSearch && matchesCategory && product.active !== false;
      }),
    [products, searchTerm, selectedCategory, normalize]
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
            animate={reducedMotion ? false : 'show'}
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
            {/* Nota: se usa animate (no whileInView) para que la cuadrícula NUNCA
                pueda quedar oculta esperando un evento de scroll. Los hijos con
                variants animan solos al montar (stagger al filtrar). */}
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
                  className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-900 group/img"
                >
                  {/* Imagen principal — clic abre galería */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCarouselProduct(product);
                      setCarouselStartIndex(galleryProductId === product.id ? galleryImageIndex : 0);
                      setCarouselOpen(true);
                    }}
                    className="w-full h-full block"
                    aria-label={`Ver imágenes de ${product.name}`}
                    type="button"
                  >
                    <CachedImage
                      src={product.images?.[galleryProductId === product.id ? galleryImageIndex : 0]}
                      width={600}
                      alt={product.name}
                      wrapperClassName="w-full h-full"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      id={`catalog-img-${product.id}`}
                    />
                  </button>

                  {/* Contador de imágenes — siempre visible */}
                  {product.images && product.images.length > 0 && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-white/15 shadow-md z-10">
                      <Images className="h-3 w-3" aria-hidden="true" />
                      <span>{(galleryProductId === product.id ? galleryImageIndex : 0) + 1}/{product.images.length}</span>
                    </div>
                  )}

                  {/* Botón "Ver galería" — visible siempre en mobile, hover en desktop */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCarouselProduct(product);
                      setCarouselStartIndex(galleryProductId === product.id ? galleryImageIndex : 0);
                      setCarouselOpen(true);
                    }}
                    className="absolute bottom-3 left-3 opacity-100 sm:opacity-0 sm:group-hover/img:opacity-100 transition-opacity duration-300 px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono font-bold rounded-full border border-white/15 flex items-center gap-1.5 hover:bg-black/70 shadow-md z-10"
                    aria-label="Ver galería de imágenes"
                    type="button"
                  >
                    <Images className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{product.images && product.images.length > 1 ? 'Ver galería' : 'Ver imagen'}</span>
                  </button>

                  {/* Hover overlay — solo en desktop */}
                  {product.stock && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 sm:group-hover/img:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  )}

                  {/* Categoría badge */}
                  <span
                    className="absolute top-3 left-3 px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest shadow-sm rounded-full z-10"
                    style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text)' }}
                  >
                    {product.category}
                  </span>

                  {!product.stock && (
                    <span className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest shadow-sm rounded-full z-10">
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
              }}
              className="w-full"
              setApi={(api) => {
                carouselApiRef.current = api;
                api?.on('select', () => {
                  setCarouselCurrentIndex(api.selectedScrollSnap());
                });
              }}
            >
              <CarouselContent>
                {carouselProduct.images.map((img, imgIdx) => (
                  <CarouselItem key={imgIdx}>
                    <div className="flex items-center justify-center w-full h-[60vh] sm:h-[75vh] lg:h-[80vh] p-2 sm:p-4">
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img
                          src={optimizeImageUrl(img, 1200)}
                          alt={`${carouselProduct.name} - Imagen ${imgIdx + 1}`}
                          loading={imgIdx === 0 ? 'eager' : 'lazy'}
                          draggable={false}
                          className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg select-none"
                          style={{
                            boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                          }}
                        />
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>

              {/* Botón anterior — si es la primera imagen, va a la última instantáneamente */}
              <button
                onClick={() => {
                  const api = carouselApiRef.current;
                  if (!api) return;
                  if (api.canScrollPrev()) {
                    api.scrollPrev();
                  } else {
                    // Salto instantáneo a la última imagen (sin animación de loop)
                    api.scrollTo(carouselProduct.images.length - 1, true);
                  }
                }}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-2.5 rounded-full text-white border border-white/20 bg-black/50 hover:bg-black/70 hover:text-white transition-all backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                aria-label="Imagen anterior"
                type="button"
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>

              {/* Botón siguiente — si es la última imagen, va a la primera instantáneamente */}
              <button
                onClick={() => {
                  const api = carouselApiRef.current;
                  if (!api) return;
                  if (api.canScrollNext()) {
                    api.scrollNext();
                  } else {
                    // Salto instantáneo a la primera imagen (sin animación de loop)
                    api.scrollTo(0, true);
                  }
                }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-2.5 rounded-full text-white border border-white/20 bg-black/50 hover:bg-black/70 hover:text-white transition-all backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                aria-label="Imagen siguiente"
                type="button"
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>

              <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] sm:text-xs font-mono border border-white/10 whitespace-nowrap pointer-events-none">
                {carouselProduct.name} &mdash;{' '}
                <span className="text-brand-300 font-bold">
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

export default memo(Catalog);
