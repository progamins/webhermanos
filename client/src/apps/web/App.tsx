import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Cake, Mail, MessageCircle, CheckCircle, RefreshCw, Facebook, Instagram } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

import { dbService, seedDatabaseIfNeeded } from '../../shared/services/dbService';
import { Product, Review, GalleryItem, AppConfig } from '../../shared/types';
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
import FlavorTicker from './components/FlavorTicker';
import TermsAndPrivacy from './components/TermsAndPrivacy';
import OfflineScreen from './components/OfflineScreen';
import { useOnline } from '../../shared/hooks';
import { requestPool } from '../../shared/services/api/requestPool';
import { imageMemoryCache } from '../../shared/utils/imageMemoryCache';
import { preloadImages } from '../../shared/utils/imageCache';
import { getLocalImageUrl } from '../../shared/utils/images';
import { Toaster } from '../../shared/components/ui';
import SectionSkeleton from '../../shared/components/SectionSkeleton';

const History = lazy(() => import('./components/History'));
const Catalog = lazy(() => import('./components/Catalog'));
const HouseKeke = lazy(() => import('./components/HouseKeke'));
import { lazyImportPrewarm } from '../../shared/utils/lazyImportPrewarm'

// Factory compartida: lazy() la usa para montar, onHover/idle la usa para prewarm.
// Vite dedupea por specifier → la promesa del chunk es la misma en ambos usos.
const loadCustomizer = () => import('./components/Customizer')
const Customizer = lazy(loadCustomizer);
const Gallery = lazy(() => import('./components/Gallery'));
const Reviews = lazy(() => import('./components/Reviews'));
const FAQ = lazy(() => import('./components/FAQ'));
const Contact = lazy(() => import('./components/Contact'));
const OrderTracking = lazy(() => import('./components/OrderTracking'));

const ENTRANCE_SEEN_KEY = 'maison_entrance_seen';

const getHasSeenEntrance = (): boolean => {
  try { return localStorage.getItem(ENTRANCE_SEEN_KEY) === 'true'; }
  catch { return false; }
};

export default function App() {
  const [showEntrance, setShowEntrance] = useState(!getHasSeenEntrance());
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

  // Estado de conexión — muestra la pantalla offline personalizada
  const online = useOnline();
  const wasOfflineRef = useRef(false);

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
          imageMemoryCache.has(url);
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

  // Favicon dinámico, título, meta tags SEO y JSON-LD
  useEffect(() => {
    if (!config) return;

    // ─── Título ───
    document.title = config.seoTitle || 'Maison Rosas | Kekes Artesanales Peruanos';

    // ─── Meta description ───
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', config.seoDescription || 'Kekes artesanales horneados todos los días con sabores peruanos en Sullana, Piura. Pedidos por WhatsApp.');

    // ─── Open Graph ───
    const ogMappings: [string, string][] = [
      ['og:title', config.seoTitle || 'Maison Rosas | Kekes Artesanales Peruanos'],
      ['og:description', config.seoDescription || 'Kekes artesanales preparados con sabores que nos recuerdan al Perú. Horneados todos los días en Sullana.'],
      ['og:image', config.heroImage || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200&auto=format&fit=crop&q=80'],
      ['og:url', 'https://maisonrosas.com/'],
      ['og:site_name', 'Maison Rosas'],
      ['og:locale', 'es_PE'],
    ];
    for (const [prop, content] of ogMappings) {
      let tag = document.querySelector(`meta[property="${prop}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', prop);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    }

    // ─── Twitter Card ───
    const twitterOgImage = config.heroImage || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200&auto=format&fit=crop&q=80';
    const twitterMappings: [string, string][] = [
      ['twitter:card', 'summary_large_image'],
      ['twitter:title', config.seoTitle?.split('|')[0]?.trim() || 'Maison Rosas | Kekes Artesanales'],
      ['twitter:description', (config.seoDescription || 'Kekes artesanales preparados con sabores que nos recuerdan al Perú, en Sullana, Piura.').slice(0, 200)],
      ['twitter:image', twitterOgImage],
    ];
    for (const [name, content] of twitterMappings) {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    }

    // ─── JSON-LD Structured Data (dinámico con valores del config) ───
    const heroImg = config.heroImage || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80';
    const logoSchema = config.logoUrl || heroImg;
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Bakery',
      '@id': 'https://maisonrosas.com/',
      name: 'Maison Rosas',
      image: heroImg,
      logo: logoSchema,
      description: config.seoDescription || 'Kekes artesanales horneados todos los días con sabores peruanos en Sullana, Piura.',
      url: 'https://maisonrosas.com/',
      telephone: config.whatsappNumber ? `+${config.whatsappNumber}` : '+51902568187',
      email: config.email || 'edwinraulrosasalbines@gmail.com',
      address: {
        '@type': 'PostalAddress',
        streetAddress: config.address?.split(',')[0]?.trim() || 'Av. Ricardo Palma 213, Urb. Sánchez Cerro',
        addressLocality: 'Sullana',
        addressRegion: 'Piura',
        addressCountry: 'PE',
      },
      openingHoursSpecification: [
        { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Monday', 'opens': '09:00', 'closes': '19:00' },
        { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Tuesday', 'opens': '09:00', 'closes': '19:00' },
        { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Wednesday', 'opens': '09:00', 'closes': '19:00' },
        { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Thursday', 'opens': '09:00', 'closes': '19:00' },
        { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Friday', 'opens': '09:00', 'closes': '19:00' },
        { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', 'opens': '09:00', 'closes': '19:00' },
        { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Sunday', 'opens': '10:00', 'closes': '14:00' },
      ],
      priceRange: 'S/. 30 - S/. 45',
      servesCuisine: 'Kekes Artesanales',
      areaServed: { '@type': 'City', name: 'Sullana' },
      sameAs: [
        config.facebookUrl,
        config.instagramUrl,
        config.whatsappNumber ? `https://wa.me/${config.whatsappNumber}` : 'https://wa.me/51902568187',
      ].filter(Boolean),
      founder: [
        { '@type': 'Person', name: 'Carol Rosas Albines' },
        { '@type': 'Person', name: 'Edwin Raúl Rosas Albines' },
      ],
    };
    let script = document.getElementById('ld-json-dynamic');
    if (!script) {
      script = document.createElement('script');
      script.id = 'ld-json-dynamic';
      script.setAttribute('type', 'application/ld+json');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema, null, 2);

    // ─── Favicon ───
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

    // ─── localStorage cache ───
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

  // 🖼️ Precarga inteligente por prioridad — NO satura el ancho de banda:
  //   1. High: hero/logo/about (LCP) — se descargan de inmediato
  //   2. Medium: primeras imágenes del catálogo (visibles sin scroll)
  //   3. Low: resto — en idle, sin competir con la carga principal
  const preloadAllImages = useCallback((products: Product[], gallery: GalleryItem[], cfg: AppConfig | null) => {
    // ── Nivel 1 (HIGH): imágenes críticas del diseño ──
    const critical: string[] = [];
    if (cfg) {
      if (cfg.heroImage && cfg.heroImage.length > 5) critical.push(cfg.heroImage);
      if (cfg.logoUrl && cfg.logoUrl.length > 5) critical.push(cfg.logoUrl);
      if (cfg.aboutImage && cfg.aboutImage.length > 5) critical.push(cfg.aboutImage);
      if (cfg.faviconUrl && cfg.faviconUrl.length > 5) critical.push(cfg.faviconUrl);
    }
    // Normalizar con getLocalImageUrl: CachedImage siempre busca la URL
    // localizada (proxy), así el memory cache debe usar las MISMA key.
    const toLocal = (u: string) => getLocalImageUrl(u);
    const criticalUnique = [...new Set(critical.map(toLocal))];
    if (criticalUnique.length > 0) {
      imageMemoryCache.preloadAll(criticalUnique);
      preloadImages(criticalUnique);
    }

    // ── Nivel 2 (MEDIUM): primeras imágenes visibles del catálogo ──
    const visible: string[] = [];
    for (const p of products) {
      if (Array.isArray(p.images) && p.images[0] && p.images[0].length > 5) {
        visible.push(p.images[0]); // solo la portada de cada producto
      }
    }
    for (const g of gallery) {
      if (g.imageUrl && g.imageUrl.length > 5) visible.push(g.imageUrl);
    }
    const visibleUnique = [...new Set(visible.map(toLocal).filter(u => !criticalUnique.includes(u)))];
    // Solo las primeras 8 portadas cargan con prioridad media (primera fila visible)
    imageMemoryCache.preloadBatch(visibleUnique.slice(0, 8), 'medium');

    // ── Nivel 3 (LOW): resto de imágenes en idle ──
    const rest: string[] = [];
    for (const p of products) {
      if (Array.isArray(p.images)) {
        for (let i = 1; i < p.images.length; i++) {
          if (p.images[i] && p.images[i].length > 5) rest.push(p.images[i]);
        }
      }
    }
    const restUnique = [...new Set(rest.map(toLocal).filter(u => !criticalUnique.includes(u) && !visibleUnique.includes(u)))];
    imageMemoryCache.preloadBatch(restUnique, 'low');

    console.log(`[PRELOAD] Precarga priorizada: ${criticalUnique.length} críticas + ${visibleUnique.length} visibles + ${restUnique.length} en idle`);
  }, []);



  // useCallback: callbacks estables para que el memo de Navbar/Catalog/Reviews
  // sea efectivo (si se recrean en cada render, los memo no sirven de nada).
  const loadPublicData = useCallback(async () => {
    try {
      await seedDatabaseIfNeeded();

      // 📌 Promise.allSettled: cada API falla individualmente sin romper las demás
      const results = await Promise.allSettled([
        dbService.getProducts(),
        dbService.getReviews(),
        dbService.getGallery(),
        dbService.getConfig(),
      ]);

      const [productsResult, reviewsResult, galleryResult, configResult] = results;

      if (productsResult.status === 'fulfilled') {
        setProducts(productsResult.value);
      } else {
        console.warn('[API] Error al cargar productos, sección oculta:', productsResult.reason);
      }

      if (reviewsResult.status === 'fulfilled') {
        setReviews(reviewsResult.value);
      } else {
        console.warn('[API] Error al cargar reseñas, sección oculta:', reviewsResult.reason);
      }

      if (galleryResult.status === 'fulfilled') {
        setGalleryItems(galleryResult.value);
      } else {
        console.warn('[API] Error al cargar galería, sección oculta:', galleryResult.reason);
      }

      let loadedConfig: AppConfig | null = null;
      if (configResult.status === 'fulfilled') {
        loadedConfig = configResult.value;
        setConfig(loadedConfig);
      } else {
        console.warn('[API] Error al cargar configuración:', configResult.reason);
      }

      // Precargar solo los datos que sí se cargaron
      preloadAllImages(
        productsResult.status === 'fulfilled' ? productsResult.value : [],
        galleryResult.status === 'fulfilled' ? galleryResult.value : [],
        loadedConfig
      );

      // Mantenimiento: solo si la config se cargó correctamente
      if (loadedConfig?.maintenanceMode) {
        setMaintenanceMode(true);
        if (loadedConfig?.maintenanceEndTime) {
          const end = new Date(loadedConfig.maintenanceEndTime).getTime();
          const now = Date.now();
          if (end > now) {
            setCountdownActive(true);
            calcCountdown(end);
          }
        }
      }
    } catch (error) {
      // Este catch solo atrapa errores fuera de las promesas (ej: seedDatabaseIfNeeded)
      console.error('[API] Error crítico al cargar datos del servidor:', error);
    }
  }, [preloadAllImages]);

  // Exponer loadPublicData para reintento manual desde consola
  (window as any).__reloadPublicData = loadPublicData;

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

  // Producto destacado "El Keke de la Casa" — siempre datos reales de la API
  const houseKeke = useMemo(
    () => products.find((p) => p.id === 'prod-1') ?? products[0] ?? null,
    [products]
  );

  const handleViewChange = useCallback((viewId: string) => {
    setCurrentView(viewId);
    const targetPath = viewId === 'inicio' ? '/' : `/${viewId}${window.location.search}`;
    if (window.location.pathname !== '/' || (viewId === 'inicio' && window.location.search)) {
      window.history.pushState({}, '', targetPath);
    }
  }, []);

  // Abrir el Customizer con un producto (callback estable para memo de Catalog)
  const handleSelectCustomize = useCallback((prod: Product) => {
    setSelectedProductForCustomize(prod);
  }, []);

  // Alternar tema (callback estable para memo de Navbar)
  const handleToggleTheme = useCallback(() => {
    hasUserInteracted.current = true;
    const next = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('maison_theme', next); } catch {}
    setTheme(next);
  }, [theme]);

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

  // Animación de entrada — solo se muestra UNA vez por usuario (localStorage)
  // Su función principal es precargar imágenes críticas.
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const savedHeroUrl = (() => { try { return localStorage.getItem('maison_hero_url'); } catch { return null; } })();
    const savedLogoUrl = (() => { try { return localStorage.getItem('maison_logo_url'); } catch { return null; } })();
    const urlsToPreload: string[] = [];
    if (savedHeroUrl) urlsToPreload.push(savedHeroUrl);
    if (savedLogoUrl) urlsToPreload.push(savedLogoUrl);
    if (urlsToPreload.length > 0) preloadImages(urlsToPreload);

    // Si el usuario ya vio la animación, la saltamos (precarga igual se ejecuta)
    if (getHasSeenEntrance()) {
      setShowEntrance(false);
      return;
    }

    const duration = isMobile ? 800 : 1400;
    const timer = setTimeout(() => {
      try { localStorage.setItem(ENTRANCE_SEEN_KEY, 'true'); } catch {}
      setShowEntrance(false);
    }, duration);
    return () => clearTimeout(timer);
  }, []);

  // Se elimina SectionFallback genérico — se usa SectionSkeleton por sección

  // ─── Reconexión ───
  // Cuando la conexión regresa tras un corte, invalida el cache TTL del pool
  // (los datos pueden haber cambiado) y recarga todo.
  useEffect(() => {
    if (online) {
      if (wasOfflineRef.current) {
        requestPool.clearCache();
        loadPublicData();
      }
      wasOfflineRef.current = false;
    } else {
      wasOfflineRef.current = true;
    }
  }, [online, loadPublicData]);

  // Sin conexión → pantalla offline personalizada (se restaura sola al reconectar).
  if (!online) {
    return <OfflineScreen />;
  }

  // Pantalla de Mantenimiento
  if (maintenanceMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8ED] via-[#FFFCF7] to-[#FFF8ED] dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center p-4 overflow-hidden relative">
        <GoogleAnalytics />

        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-20 left-[5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-brand-200/30 via-brand-100/20 to-transparent dark:from-brand-800/10 dark:via-brand-900/5 dark:to-transparent blur-[80px] will-change-transform animate-orb-slow" />
          <div className="absolute top-[45%] -right-[10%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-brand-secondary/20 via-brand-300/15 to-transparent dark:from-brand-600/8 dark:via-brand-700/5 dark:to-transparent blur-[80px] will-change-transform animate-orb-slow-reverse" />
          <div className="absolute bottom-[20%] left-[30%] w-[300px] h-[300px] rounded-full bg-gradient-to-r from-white/40 via-brand-100/20 to-transparent dark:from-white/5 dark:via-brand-200/5 dark:to-transparent blur-[60px] will-change-transform animate-light-sweep" />
        </div>

        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-brand-300/40 dark:bg-brand-400/20"
              style={{ left: `${5 + (i * 9.5) % 90}%`, top: `${10 + (i * 8) % 80}%` }}
              animate={{ y: [0, -18, 0], opacity: [0, 0.6, 0] }}
              transition={{ duration: 4 + i * 0.5, repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full text-center relative z-10 space-y-8"
        >
          <div className="relative flex justify-center">
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.12, 0.06, 0.12] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute w-80 h-80 rounded-full bg-brand-200/30 dark:bg-brand-800/20 blur-3xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="w-64 h-64 sm:w-72 sm:h-72 relative"
            >
              <DotLottieReact src="/cake.lottie" autoplay loop style={{ width: '100%', height: '100%' }} />
            </motion.div>
          </div>

          <div className="space-y-5">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-900/30 rounded-full text-[10px] font-mono font-semibold text-brand-700 dark:text-brand-300 tracking-[0.2em] uppercase"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {config?.maintenanceBadge || 'En mantenimiento'}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight"
              style={{ color: 'var(--theme-text)' }}
            >
              {config?.maintenanceTitle || 'Volveremos muy pronto'}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-sm sm:text-base leading-relaxed max-w-md mx-auto"
              style={{ color: 'var(--theme-text-secondary)' }}
            >
              {config?.maintenanceDescription || 'Estamos horneando nuevas sorpresas para ti.'}
            </motion.p>
          </div>

          {countdownActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-3"
            >
              {[{ label: 'Días', value: countdown.days }, { label: 'Horas', value: countdown.hours },
                { label: 'Min', value: countdown.minutes }, { label: 'Seg', value: countdown.seconds }
              ].map((unit, i) => (
                <div key={unit.label} className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-brand-100 dark:border-brand-900/30 rounded-2xl flex items-center justify-center shadow-sm">
                      <span className="font-mono text-lg sm:text-xl font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
                        {String(unit.value).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="block text-[9px] font-mono font-semibold mt-1 uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                      {unit.label}
                    </span>
                  </div>
                  {i < 3 && <span className="text-lg font-mono font-bold -mt-5" style={{ color: 'var(--theme-text-muted)' }}>:</span>}
                </div>
              ))}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="max-w-md mx-auto space-y-4"
          >
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <a href={`mailto:${config?.email || 'edwinraulrosasalbines@gmail.com'}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-medium transition-all duration-200 hover:scale-105 hover:bg-brand-50 dark:hover:bg-brand-950/20"
                style={{ backgroundColor: 'var(--theme-surface-glass)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)' }}>
                <Mail className="h-3.5 w-3.5" />
                {config?.email || 'edwinraulrosasalbines@gmail.com'}
              </a>
              <a href={`https://wa.me/${config?.whatsappNumber || '51902568187'}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-medium transition-all duration-200 hover:scale-105 hover:bg-green-50 dark:hover:bg-green-950/20"
                style={{ backgroundColor: 'var(--theme-surface-glass)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)' }}>
                <MessageCircle className="h-3.5 w-3.5" />
                +{config?.whatsappNumber || '51902568187'}
              </a>
            </div>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            className="text-[11px] font-serif italic" style={{ color: 'var(--theme-text-muted)' }}>
            {'—'} Con amor, Carol & Edwin Rosas Albines
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative dot-pattern" style={{backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)'}}>
      <GoogleAnalytics />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-brand-500 focus:text-white focus:rounded-full focus:text-xs focus:font-bold focus:uppercase focus:tracking-wider">
        Saltar al contenido principal
      </a>

      <AnimatePresence>
        {showEntrance && currentView === 'inicio' && (
          <motion.div
            key="entrance"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="fixed inset-0 z-[9999] flex items-center justify-center entrance-container"
            style={{ backgroundColor: 'var(--theme-bg)' }}
          >
            <div className="text-center entrance-content">
              {/* ─── Icono Cake con bounce CSS puro (GPU) ─── */}
              <div className="flex justify-center mb-2 entrance-icon">
                <div className="entrance-bounce">
                  <Cake className="w-8 h-8 text-brand-400" />
                </div>
              </div>

              {/* ─── Título ─── */}
              <h1 className="font-serif text-4xl font-bold tracking-tight entrance-title"
                style={{
                  background: 'linear-gradient(135deg, #C7442E 0%, #E9A13B 50%, #C7442E 100%)',
                  backgroundSize: '200% 200%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                Maison Rosas
              </h1>

              {/* ─── Divisor ─── */}
              <div className="h-px bg-gradient-to-r from-transparent via-brand-300/60 to-transparent mx-auto origin-center entrance-divider" style={{ width: '50%' }} />

              {/* ─── Subtítulo ─── */}
              <p className="text-[10px] font-mono tracking-[0.3em] text-brand-500 uppercase mt-3 entrance-subtitle">Kekes Artesanales Peruanos</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showEntrance && (
        <Navbar
          currentView={currentView}
          setCurrentView={handleViewChange}
          logoUrl={config?.logoUrl}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      )}

      <AnimatePresence mode="wait">
        {currentView === 'tracking' ? (
          <motion.main key="tracking-page" id="main-content" role="main" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <Suspense fallback={<SectionSkeleton section="order-tracking" />}>
              <OrderTracking onBackToHome={() => handleViewChange('inicio')} />
            </Suspense>
          </motion.main>
        ) : (
          <motion.div key="home-pages" id="main-content" role="main" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <Hero onViewCatalog={() => scrollToSection('catalogo')} onViewHistory={() => scrollToSection('historia')} config={config} />
            <FlavorTicker />
            <Suspense fallback={<SectionSkeleton section="catalog" />}>
              <Catalog products={products} onSelectCustomize={handleSelectCustomize} />
            </Suspense>
            <Suspense fallback={<SectionSkeleton section="catalog" />}>
              <HouseKeke
                product={houseKeke}
                whatsappNumber={config?.whatsappNumber || '51902568187'}
                onViewCatalog={() => scrollToSection('catalogo')}
              />
            </Suspense>
            <Suspense fallback={<SectionSkeleton section="history" />}>
              <History config={config} />
            </Suspense>
            <Suspense fallback={<SectionSkeleton section="gallery" />}>
              <Gallery galleryItems={galleryItems} />
            </Suspense>
            <Suspense fallback={<SectionSkeleton section="reviews" />}>
              <Reviews reviews={reviews} onRefreshReviews={loadPublicData} />
            </Suspense>
            <Suspense fallback={<SectionSkeleton section="faq" />}>
              <FAQ />
            </Suspense>
            <Suspense fallback={<SectionSkeleton section="contact" />}>
              <Contact config={config} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProductForCustomize && (
          <Suspense fallback={null}>
            <Customizer
              key={selectedProductForCustomize.id}
              product={selectedProductForCustomize}
              onClose={() => setSelectedProductForCustomize(null)}
              whatsappNumber={config?.whatsappNumber || '51902568187'}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <footer className="py-16" style={{backgroundColor: 'var(--theme-bg-alt)', color: 'var(--theme-text)', borderTop: '1px solid var(--theme-border)'}} role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <span className="font-serif text-2xl font-bold tracking-tight">Maison Rosas</span>
            <p className="text-xs leading-relaxed font-sans" style={{color: 'var(--theme-text-secondary)'}}>Kekes artesanales peruanos, horneados con amor cada mañana en Sullana, Piura.</p>
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
              <li><button onClick={() => scrollToSection('catalogo')} className="transition-opacity hover:opacity-80 cursor-pointer">Nuestros Kekes</button></li>
              <li><button onClick={() => scrollToSection('opiniones')} className="transition-opacity hover:opacity-80 cursor-pointer">Opiniones de Clientes</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400 mb-4">Políticas & Confianza</h4>
            <p className="text-[11px] leading-relaxed" style={{color: 'var(--theme-text-secondary)'}}>Todos nuestros kekes se hornean el mismo día con ingredientes frescos. Pídelos por WhatsApp.</p>
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

      <Toaster position="top-right" richColors closeButton toastOptions={{ duration: 4000 }} />
    </div>
  );
}
