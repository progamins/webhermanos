import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Cake } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

import { dbService, seedDatabaseIfNeeded } from './dbService';
import { Product, Review, GalleryItem, AppConfig } from './types';
import GoogleAnalytics from './components/GoogleAnalytics';

function setFaviconFromLocalStorage() {
  try {
    const saved = localStorage.getItem('maison_favicon_url');
    const link = document.getElementById('dynamic-favicon') as HTMLLinkElement;
    if (!link) return;
    if (saved) {
      link.href = saved.split('?')[0] + `?v=${Date.now()}`;
      link.type = '';
      link.rel = 'icon';
    } else {
      link.href = 'data:,';
      link.type = '';
      link.rel = 'icon';
    }
  } catch {}
}
setFaviconFromLocalStorage();

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TermsAndPrivacy from './components/TermsAndPrivacy';
import { imageMemoryCache } from './utils/imageMemoryCache';
import { preloadImages } from './utils/imageCache';
import { getLocalImageUrl } from './utils/images';

const History = lazy(() => import('./components/History'));
const Catalog = lazy(() => import('./components/Catalog'));
const Customizer = lazy(() => import('./components/Customizer'));
const Gallery = lazy(() => import('./components/Gallery'));
const Reviews = lazy(() => import('./components/Reviews'));
const FAQ = lazy(() => import('./components/FAQ'));
const Contact = lazy(() => import('./components/Contact'));
const OrderTracking = lazy(() => import('./components/OrderTracking'));

export default function App() {
  const [showEntrance, setShowEntrance] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [currentView, setCurrentView] = useState<string>('inicio');
  const [selectedProductForCustomize, setSelectedProductForCustomize] = useState<Product | null>(null);

  const getSystemTheme = (): 'light' | 'dark' => {
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
    catch { return 'dark'; }
  };

  const getInitialTheme = (): 'light' | 'dark' | 'contrast' => {
    try {
      const saved = localStorage.getItem('maison_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'contrast') return saved;
    } catch {}
    return getSystemTheme();
  };

  const [theme, setTheme] = useState<'light' | 'dark' | 'contrast'>(getInitialTheme);
  const hasUserInteracted = useRef<boolean>(
    (() => { try { return localStorage.getItem('maison_theme') !== null; } catch { return false; }})()
  );

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [countdownActive, setCountdownActive] = useState(false);
  const [legalModal, setLegalModal] = useState<{ isOpen: boolean; tab: 'terms' | 'privacy' }>({ isOpen: false, tab: 'terms' });

  // Precargar imágenes críticas desde localStorage
  useEffect(() => {
    const savedHero = (() => { try { return localStorage.getItem('maison_hero_url'); } catch { return null; } })();
    const savedLogo = (() => { try { return localStorage.getItem('maison_logo_url'); } catch { return null; } })();
    const savedAbout = (() => { try { return localStorage.getItem('maison_about_url'); } catch { return null; } })();

    const urls = [savedHero, savedLogo, savedAbout].filter(Boolean) as string[];
    if (urls.length > 0) {
      imageMemoryCache.preloadAll(urls);
      const convertedUrls = urls.map(u => getLocalImageUrl(u)).filter(Boolean);
      if (convertedUrls.length > 0) imageMemoryCache.preloadAll(convertedUrls);
      preloadImages(urls);
      setTimeout(() => {
        for (const url of urls) {
          const origin = imageMemoryCache.has(url) ? 'memory_cache' : 'network';
          console.log(`[PERF] Imagen cargada desde: ${origin} | ${url.substring(0, 60)}...`);
        }
      }, 100);
    }
  }, []);

  // Sincronizar imágenes hero/logo con config
  useEffect(() => {
    if (!config?.heroImage) return;
    const current = (() => { try { return localStorage.getItem('maison_hero_url'); } catch { return null; } })();
    const newUrl = config.heroImage.split('?')[0];
    if (current !== newUrl) {
      imageMemoryCache.update(newUrl);
      preloadImages([newUrl]);
    }
  }, [config?.heroImage]);

  useEffect(() => {
    if (!config?.logoUrl) return;
    const current = (() => { try { return localStorage.getItem('maison_logo_url'); } catch { return null; } })();
    const newUrl = config.logoUrl.split('?')[0];
    if (current !== newUrl) {
      imageMemoryCache.update(newUrl);
      preloadImages([newUrl]);
    }
  }, [config?.logoUrl]);

  // Favicon dinámico y título
  useEffect(() => {
    if (!config) return;
    document.title = config.seoTitle || 'Maison Rosas | Pastelería de Autor & Repostería Fina';

    const faviconLink = document.getElementById('dynamic-favicon') as HTMLLinkElement;
    if (faviconLink) {
      if (config.faviconUrl) {
        const cacheBuster = `?v=${Date.now()}`;
        const cleanUrl = config.faviconUrl.split('?')[0];
        faviconLink.href = cleanUrl + cacheBuster;
        faviconLink.type = '';
        faviconLink.rel = 'icon';
        try { localStorage.setItem('maison_favicon_url', cleanUrl); } catch {}
      } else {
        faviconLink.href = 'data:,';
        faviconLink.type = '';
        faviconLink.rel = 'icon';
        try { localStorage.removeItem('maison_favicon_url'); } catch {}
      }
    }

    if (config.heroImage) {
      try { localStorage.setItem('maison_hero_url', config.heroImage.split('?')[0]); } catch {}
    } else {
      try { localStorage.removeItem('maison_hero_url'); } catch {}
    }
    if (config.logoUrl) {
      try { localStorage.setItem('maison_logo_url', config.logoUrl.split('?')[0]); } catch {}
    } else {
      try { localStorage.removeItem('maison_logo_url'); } catch {}
    }
    if (config.imageQuality) {
      try { localStorage.setItem('maison_image_quality', String(config.imageQuality)); } catch {}
    } else {
      try { localStorage.setItem('maison_image_quality', '0.8'); } catch {}
    }
  }, [config]);

  const preloadAllImages = useCallback((products: Product[], gallery: GalleryItem[], cfg: AppConfig | null) => {
    const allImageUrls: string[] = [];
    for (const p of products) {
      if (Array.isArray(p.images)) {
        for (const img of p.images) {
          if (img && typeof img === 'string' && img.length > 5) allImageUrls.push(img);
        }
      }
    }
    for (const g of gallery) {
      if (g.imageUrl && g.imageUrl.length > 5) allImageUrls.push(g.imageUrl);
    }
    if (cfg) {
      if (cfg.heroImage && cfg.heroImage.length > 5) allImageUrls.push(cfg.heroImage);
      if (cfg.logoUrl && cfg.logoUrl.length > 5) allImageUrls.push(cfg.logoUrl);
      if (cfg.aboutImage && cfg.aboutImage.length > 5) allImageUrls.push(cfg.aboutImage);
      if (cfg.faviconUrl && cfg.faviconUrl.length > 5) allImageUrls.push(cfg.faviconUrl);
    }
    const uniqueUrls = [...new Set(allImageUrls)];
    if (uniqueUrls.length > 0) {
      console.log(`[PRELOAD] Precargando ${uniqueUrls.length} imágenes en memoria...`);
      imageMemoryCache.preloadAll(uniqueUrls);
      preloadImages(uniqueUrls);
    }
  }, []);

  const loadPublicData = async () => {
    try {
      await seedDatabaseIfNeeded();
      const [fetchedProducts, fetchedReviews, fetchedGallery, fetchedConfig] = await Promise.all([
        dbService.getProducts(),
        dbService.getReviews(),
        dbService.getGallery(),
        dbService.getConfig(),
      ]);
      setProducts(fetchedProducts);
      setReviews(fetchedReviews);
      setGalleryItems(fetchedGallery);
      setConfig(fetchedConfig);
      preloadAllImages(fetchedProducts, fetchedGallery, fetchedConfig);

      if (fetchedConfig?.maintenanceMode) {
        setMaintenanceMode(true);
        if (fetchedConfig?.maintenanceEndTime) {
          const end = new Date(fetchedConfig.maintenanceEndTime).getTime();
          const now = Date.now();
          if (end > now) {
            setCountdownActive(true);
            calcCountdown(end);
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar datos del servidor:', error);
    }
  };

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const hasCode = searchParams.has('code');
      if (hasCode || path === '/tracking' || path === '/tracking/') {
        setCurrentView('tracking');
      } else {
        setCurrentView('inicio');
      }
    };
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    loadPublicData();
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const calcCountdown = (endTime: number) => {
    const diff = Math.max(0, endTime - Date.now());
    setCountdown({
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    });
  };

  useEffect(() => {
    if (!countdownActive || !config?.maintenanceEndTime) return;
    const end = new Date(config.maintenanceEndTime).getTime();
    if (end <= Date.now()) { setCountdownActive(false); return; }
    const interval = setInterval(() => calcCountdown(end), 1000);
    return () => clearInterval(interval);
  }, [countdownActive, config?.maintenanceEndTime]);

  // Seguir el scheme del sistema hasta que el usuario interactúe
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!hasUserInteracted.current) setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Aplicar tema
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark', 'contrast', 'light-theme');
    root.style.removeProperty('--color-brand-500');
    if (theme === 'dark') root.classList.add('dark');
    else if (theme === 'contrast') { root.classList.add('contrast', 'dark'); root.style.setProperty('--color-brand-500', '#FFD700'); }
    else root.classList.add('light-theme');
  }, [theme]);

  const handleViewChange = (viewId: string) => {
    setCurrentView(viewId);
    const targetPath = viewId === 'inicio' ? '/' : `/${viewId}${window.location.search}`;
    if (window.location.pathname !== '/' || (viewId === 'inicio' && window.location.search)) {
      window.history.pushState({}, '', targetPath);
    }
  };

  const scrollToSection = (sectionId: string) => {
    handleViewChange(sectionId);
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20, scale: 0.99 },
    animate: {
      opacity: 1, y: 0, scale: 1,
      transition: { type: 'spring' as const, stiffness: 100, damping: 20, mass: 0.5 },
    },
    exit: {
      opacity: 0, y: -10, scale: 0.99,
      transition: { duration: 0.25, ease: 'easeInOut' as const },
    },
  };

  // Animación de entrada
  useEffect(() => {
    const savedHeroUrl = (() => { try { return localStorage.getItem('maison_hero_url'); } catch { return null; } })();
    const savedLogoUrl = (() => { try { return localStorage.getItem('maison_logo_url'); } catch { return null; } })();
    const urlsToPreload: string[] = [];
    if (savedHeroUrl) urlsToPreload.push(savedHeroUrl);
    if (savedLogoUrl) urlsToPreload.push(savedLogoUrl);
    if (urlsToPreload.length > 0) preloadImages(urlsToPreload);
    const timer = setTimeout(() => setShowEntrance(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const SectionFallback = () => (
    <div className="py-24 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
        <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Cargando sección...</span>
      </div>
    </div>
  );

  // Pantalla de Mantenimiento
  if (maintenanceMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF9F5] via-white to-[#FFF9F5] flex items-center justify-center p-4 overflow-hidden">
        <GoogleAnalytics />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div key={i} className="absolute w-2 h-2 rounded-full bg-brand-200/30"
              style={{ left: `${10 + i * 18}%`, top: `${15 + (i % 3) * 30}%` }}
              animate={{ y: [0, -20, 0], opacity: [0, 0.5, 0] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.6, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          className="max-w-lg w-full text-center space-y-5 relative z-10"
        >
          <div className="relative flex justify-center">
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.08, 0.15] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute w-80 h-80 rounded-full bg-brand-200/40 blur-3xl"
            />
            <motion.div initial={{ opacity: 0, scale: 0.7, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="w-72 h-72 relative"
            >
              <DotLottieReact src="/cake.lottie" autoplay loop style={{ width: '100%', height: '100%' }} />
            </motion.div>
          </div>
          <div className="space-y-4">
            <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="inline-block px-4 py-1.5 bg-brand-50 border border-brand-200 rounded-full text-[10px] font-mono font-semibold text-brand-700 tracking-[0.2em] uppercase"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-2 align-middle" />
              {config?.maintenanceBadge || 'En mantenimiento'}
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="font-serif text-3xl sm:text-4xl font-bold text-zinc-900 leading-tight"
            >{config?.maintenanceTitle || 'Volveremos muy pronto'}</motion.h1>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="text-sm sm:text-base text-zinc-500 leading-relaxed font-sans max-w-sm mx-auto"
            >{config?.maintenanceDescription || <>Estamos horneando nuevas sorpresas para ti.</>}</motion.p>
            {countdownActive && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-3"
              >
                {[{ label: 'Días', value: countdown.days }, { label: 'Horas', value: countdown.hours },
                  { label: 'Min', value: countdown.minutes }, { label: 'Seg', value: countdown.seconds }
                ].map((unit, i) => (
                  <div key={unit.label} className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/80 backdrop-blur-sm border border-brand-100 rounded-2xl flex items-center justify-center shadow-sm">
                        <span className="font-mono text-lg sm:text-xl font-bold text-brand-700 tabular-nums">{String(unit.value).padStart(2, '0')}</span>
                      </div>
                      <span className="block text-[9px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mt-1">{unit.label}</span>
                    </div>
                    {i < 3 && <span className="text-lg font-mono font-bold text-brand-300 -mt-5">:</span>}
                  </div>
                ))}
              </motion.div>
            )}
          </div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            className="text-[11px] text-zinc-400 font-serif italic">— Con amor, Carol & Edwin Rosas Albines</motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative dot-pattern" style={{backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)'}}>
      <GoogleAnalytics />

      {/* Entrada animada */}
      <AnimatePresence>
        {showEntrance && currentView === 'inicio' && (
          <motion.div key="entrance" initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04, filter: 'blur(2px)' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{backgroundColor: 'var(--theme-bg)'}}
          >
            <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full bg-brand-100/40 blur-3xl" />
            <div className="absolute bottom-1/3 right-1/3 w-48 h-48 rounded-full bg-brand-secondary/15 blur-3xl" />
            <div className="text-center relative z-10">
              <motion.div initial={{ opacity: 0, scale: 0.6, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }} className="flex justify-center mb-2"
              >
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}>
                  <Cake className="w-8 h-8 text-brand-400" />
                </motion.div>
              </motion.div>
              <motion.h1 initial={{ opacity: 0, scale: 0.92, y: 12, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="font-serif text-4xl font-bold tracking-tight"
                style={{ background: 'linear-gradient(135deg, #C4847D 0%, #D4A373 50%, #C4847D 100%)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >Maison Rosas</motion.h1>
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.45, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
                className="h-px bg-gradient-to-r from-transparent via-brand-300/60 to-transparent mt-3 mx-auto origin-center" style={{ width: '50%' }}
              />
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 0.7, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6, ease: 'easeOut' }}
                className="text-[10px] font-mono tracking-[0.3em] text-brand-500 uppercase mt-3">Alma Artesanal</motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={handleViewChange}
        logoUrl={config?.logoUrl}
        theme={theme}
        onToggleTheme={() => {
          hasUserInteracted.current = true;
          const next = theme === 'dark' ? 'light' : 'dark';
          try { localStorage.setItem('maison_theme', next); } catch {}
          setTheme(next);
        }}
      />

      {/* Contenido principal */}
      <AnimatePresence mode="wait">
        {currentView === 'tracking' ? (
          <motion.main key="tracking-page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <Suspense fallback={<SectionFallback />}>
              <OrderTracking onBackToHome={() => handleViewChange('inicio')} />
            </Suspense>
          </motion.main>
        ) : (
          <motion.div key="home-pages" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <Hero onViewCatalog={() => scrollToSection('catalogo')} onViewHistory={() => scrollToSection('historia')} config={config} />
            <Suspense fallback={<SectionFallback />}>
              <Catalog products={products} onSelectCustomize={(prod) => setSelectedProductForCustomize(prod)} />
            </Suspense>
            <Suspense fallback={<SectionFallback />}>
              <History config={config} />
            </Suspense>
            <Suspense fallback={<SectionFallback />}>
              <Gallery galleryItems={galleryItems} />
            </Suspense>
            <Suspense fallback={<SectionFallback />}>
              <Reviews reviews={reviews} onRefreshReviews={loadPublicData} />
            </Suspense>
            <Suspense fallback={<SectionFallback />}>
              <FAQ />
            </Suspense>
            <Suspense fallback={<SectionFallback />}>
              <Contact config={config} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de personalización */}
      <AnimatePresence>
        {selectedProductForCustomize && (
          <Customizer
            product={selectedProductForCustomize}
            onClose={() => setSelectedProductForCustomize(null)}
            whatsappNumber={config?.whatsappNumber || '51902568187'}
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-16" style={{backgroundColor: 'var(--theme-bg-alt)', color: 'var(--theme-text)', borderTop: '1px solid var(--theme-border)'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <span className="font-serif text-2xl font-bold tracking-tight">Maison Rosas</span>
            <p className="text-xs leading-relaxed font-sans" style={{color: 'var(--theme-text-secondary)'}}>
              Pastelería de Autor & Repostería Fina hecha con amor en Sullana, Piura.
            </p>
          </div>
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400 mb-4">Nuestra Casa</h4>
            <ul className="space-y-2 text-xs" style={{color: 'var(--theme-text-secondary)'}}>
              <li>{config?.address || 'Av. Ricardo Palma 213, Sánchez Cerro'}</li>
              <li>Sullana, Piura, Perú</li>
              <li><a href={`mailto:${config?.email || 'edwinraulrosasalbines@gmail.com'}`} className="hover:opacity-80 transition-opacity" style={{color: 'var(--theme-text-secondary)'}}>{config?.email || 'edwinraulrosasalbines@gmail.com'}</a></li>
              <li><a href={`https://wa.me/${config?.whatsappNumber || '51902568187'}`} target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity" style={{color: 'var(--theme-text-secondary)'}}>+{config?.whatsappNumber || '51902568187'}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400 mb-4">Enlaces</h4>
            <ul className="space-y-2 text-xs" style={{color: 'var(--theme-text-secondary)'}}>
              <li><button onClick={() => scrollToSection('inicio')} className="transition-opacity hover:opacity-80 cursor-pointer">Inicio</button></li>
              <li><button onClick={() => scrollToSection('historia')} className="transition-opacity hover:opacity-80 cursor-pointer">Nuestra Historia</button></li>
              <li><button onClick={() => scrollToSection('catalogo')} className="transition-opacity hover:opacity-80 cursor-pointer">Catálogo de Modelos</button></li>
              <li><button onClick={() => scrollToSection('opiniones')} className="transition-opacity hover:opacity-80 cursor-pointer">Opiniones de Clientes</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400 mb-4">Políticas & Confianza</h4>
            <p className="text-[11px] leading-relaxed" style={{color: 'var(--theme-text-secondary)'}}>
              Todos nuestros pasteles se hornean a pedido con un mínimo de 48 horas de anticipación.
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] gap-4" style={{borderTop: '1px solid var(--theme-border)'}}>
          <span style={{color: 'var(--theme-text-muted)'}}>&copy; {new Date().getFullYear()} Maison Rosas. Todos los derechos reservados.</span>
          <div className="flex space-x-4" style={{color: 'var(--theme-text-muted)'}}>
            <button onClick={() => setLegalModal({ isOpen: true, tab: 'terms' })} className="transition-opacity hover:opacity-80 cursor-pointer">Términos de Servicio</button>
            <button onClick={() => setLegalModal({ isOpen: true, tab: 'privacy' })} className="transition-opacity hover:opacity-80 cursor-pointer">Políticas de Privacidad</button>
          </div>
        </div>
      </footer>

      <TermsAndPrivacy isOpen={legalModal.isOpen} onClose={() => setLegalModal({ ...legalModal, isOpen: false })} initialTab={legalModal.tab} />
    </div>
  );
}
