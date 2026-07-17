import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Moon, Sun, AlertCircle, ShoppingBag, Eye, LogOut, Cake } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// Database service & types
import { dbService, seedDatabaseIfNeeded } from './dbService';
import { Product, Order, Review, GalleryItem, AppConfig } from './types';

// Google Analytics 4 (lightweight, loads only in production)
import GoogleAnalytics from './components/GoogleAnalytics';

// ─── Síncrono: Favicon desde localStorage (se ejecuta ANTES del primer render) ───
function setFaviconFromLocalStorage() {
  try {
    const saved = localStorage.getItem('maison_favicon_url');
    const link = document.getElementById('dynamic-favicon') as HTMLLinkElement;
    if (!link) return;
    if (saved) {
      const cacheBuster = `?v=${Date.now()}`;
      link.href = saved.split('?')[0] + cacheBuster;
      link.type = '';
      link.rel = 'icon';
    } else {
      link.href = 'data:,';
      link.type = '';
      link.rel = 'icon';
    }
  } catch {
    // localStorage no disponible, ignorar
  }
}
setFaviconFromLocalStorage();

// Eager-loaded components (above the fold)
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TermsAndPrivacy from './components/TermsAndPrivacy';

// MemoryCache global para reutilizar instancias HTMLImageElement
import { imageMemoryCache } from './utils/imageMemoryCache';
// IndexedDB solo para imágenes críticas (Hero, Logo, About, Favicon)
import { preloadImages } from './utils/imageCache';
import { getLocalImageUrl } from './utils/images';

// Lazy-loaded components (below the fold / heavy)
const History = lazy(() => import('./components/History'));
const Catalog = lazy(() => import('./components/Catalog'));
const Customizer = lazy(() => import('./components/Customizer'));
const Gallery = lazy(() => import('./components/Gallery'));
const Reviews = lazy(() => import('./components/Reviews'));
const FAQ = lazy(() => import('./components/FAQ'));
const Contact = lazy(() => import('./components/Contact'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const OrderTracking = lazy(() => import('./components/OrderTracking'));

export default function App() {
  // Elegant entrance animation (auto-dismiss after ~1.6s)
  const [showEntrance, setShowEntrance] = useState(true);

  // Core App states loaded from Firestore
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);

  // Active view states ('inicio' / 'admin' / 'tracking')
  const [currentView, setCurrentView] = useState<string>('inicio');

  // Customizer pop-up trigger
  const [selectedProductForCustomize, setSelectedProductForCustomize] = useState<Product | null>(null);

  // Detect system preferred color scheme
  const getSystemTheme = (): 'light' | 'dark' => {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'dark'; // safe fallback
    }
  };

  // Restore saved preference or auto-detect system preference
  const getInitialTheme = (): 'light' | 'dark' | 'contrast' => {
    try {
      const saved = localStorage.getItem('maison_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'contrast') return saved;
    } catch {}
    // No saved preference → detect device's preferred color scheme
    return getSystemTheme();
  };
  const [theme, setTheme] = useState<'light' | 'dark' | 'contrast'>(getInitialTheme);

  // Track whether user has manually toggled theme (persisted in localStorage)
  const hasUserInteracted = useRef<boolean>(
    (() => { try { return localStorage.getItem('maison_theme') !== null; } catch { return false; }})()
  );

  // Admin authentication state saved locally
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Maintenance mode
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Countdown state
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [countdownActive, setCountdownActive] = useState(false);

  // Legal modals state
  const [legalModal, setLegalModal] = useState<{ isOpen: boolean; tab: 'terms' | 'privacy' }>({ isOpen: false, tab: 'terms' });

  // Precargar imágenes críticas inmediatamente desde localStorage (sin esperar Firestore)
  useEffect(() => {
    const savedHero = (() => { try { return localStorage.getItem('maison_hero_url'); } catch { return null; } })();
    const savedLogo = (() => { try { return localStorage.getItem('maison_logo_url'); } catch { return null; } })();
    const savedAbout = (() => { try { return localStorage.getItem('maison_about_url'); } catch { return null; } })();

    const urls = [savedHero, savedLogo, savedAbout].filter(Boolean) as string[];
    if (urls.length > 0) {
      // MemoryCache: new Image() → descarga iniciada, lista para el render
      imageMemoryCache.preloadAll(urls);

      // También convertir las URLs para que CachedImage pueda encontrarlas
      // (CachedImage aplica getLocalImageUrl() + optimizeImageUrl() antes de buscar)
      const convertedUrls = urls.map(u => getLocalImageUrl(u)).filter(Boolean);
      if (convertedUrls.length > 0) imageMemoryCache.preloadAll(convertedUrls);
      // IndexedDB: background fetch para visitas futuras
      preloadImages(urls);

      // Log de rendimiento: origen de la imagen
      setTimeout(() => {
        for (const url of urls) {
          const origin = imageMemoryCache.has(url) ? 'memory_cache' : 'network';
          console.log(`[PERF] Imagen cargada desde: ${origin} | ${url.substring(0, 60)}...`);
        }
      }, 100);
    }
  }, []);

  // Cuando Firestore entrega el config, actualizar en background sin bloquear
  useEffect(() => {
    if (!config?.heroImage) return;
    // Verificar si la URL cambió vs localStorage
    const current = (() => { try { return localStorage.getItem('maison_hero_url'); } catch { return null; } })();
    const newUrl = config.heroImage.split('?')[0];
    if (current !== newUrl) {
      // Nueva URL detectada → precargar en background sin afectar el render
      imageMemoryCache.update(newUrl);
      preloadImages([newUrl]);
    }
  }, [config?.heroImage]);

  // Logo background sync (misma lógica que hero)
  useEffect(() => {
    if (!config?.logoUrl) return;
    const current = (() => { try { return localStorage.getItem('maison_logo_url'); } catch { return null; } })();
    const newUrl = config.logoUrl.split('?')[0];
    if (current !== newUrl) {
      imageMemoryCache.update(newUrl);
      preloadImages([newUrl]);
    }
  }, [config?.logoUrl]);

  // Dynamic favicon & document title from Firestore config
  useEffect(() => {
    if (!config) return;

    // Update document title
    document.title = config.seoTitle || 'Maison Rosas | Pastelería de Autor & Repostería Fina';

    // Update favicon with cache-busting (only from admin upload, no fallback)
    const faviconLink = document.getElementById('dynamic-favicon') as HTMLLinkElement;
    if (faviconLink) {
      if (config.faviconUrl) {
        const cacheBuster = `?v=${Date.now()}`;
        const cleanUrl = config.faviconUrl.split('?')[0];
        faviconLink.href = cleanUrl + cacheBuster;
        faviconLink.type = '';
        faviconLink.rel = 'icon';
        // Persistir en localStorage para que aparezca en la próxima carga
        try { localStorage.setItem('maison_favicon_url', cleanUrl); } catch {}
      } else {
        faviconLink.href = 'data:,';
        faviconLink.type = '';
        faviconLink.rel = 'icon';
        // Limpiar localStorage cuando se elimina el favicon
        try { localStorage.removeItem('maison_favicon_url'); } catch {}
      }
    }

    // Persistir hero image y logo en localStorage para precarga durante la animación de entrada
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

    // Persistir calidad de compresión de imágenes
    if (config.imageQuality) {
      try { localStorage.setItem('maison_image_quality', String(config.imageQuality)); } catch {}
    } else {
      // Si no está configurada, guardar el default 0.8
      try { localStorage.setItem('maison_image_quality', '0.8'); } catch {}
    }
  }, [config]);

  // Initialize and load data from Firestore
  const loadDataFromFirestore = async () => {
    try {
      // 1. Seed if empty
      await seedDatabaseIfNeeded();

      // 2. Fetch everything parallelly for high-speed performance
      const [fetchedProducts, fetchedReviews, fetchedGallery, fetchedConfig, fetchedOrders] = await Promise.all([
        dbService.getProducts(),
        dbService.getReviews(),
        dbService.getGallery(),
        dbService.getConfig(),
        dbService.getOrders()
      ]);

      setProducts(fetchedProducts);
      setReviews(fetchedReviews);
      setGalleryItems(fetchedGallery);
      setConfig(fetchedConfig);
      setOrders(fetchedOrders);
      // Check maintenance mode from config
      if (fetchedConfig?.maintenanceMode) {
        setMaintenanceMode(true);
        // Initialize countdown if end time is set
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
      console.error('Error fetching data from Firestore:', error);
    }
  };

  useEffect(() => {
    // 1. Initial client-side routing based on path or code parameter
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const hasCode = searchParams.has('code');

      if (path === '/admin' || path === '/admin/') {
        setCurrentView('admin');
      } else if (hasCode || path === '/tracking' || path === '/tracking/') {
        setCurrentView('tracking');
      } else {
        setCurrentView('inicio');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);

    // 2. Load Firestore static content
    loadDataFromFirestore();
    
    // 3. Security: Secure Session verification via Server-side token check
    const checkSessionToken = async () => {
      const isValid = await dbService.adminVerifyToken();
      setIsAdminLoggedIn(isValid);
      // Restore role from localStorage on page reload
      if (isValid) {
        const savedRole = localStorage.getItem('maison_admin_role') as 'admin' | 'analyst' | 'stock_manager' | null;
        if (savedRole) {
          setAdminRole(savedRole);
        }
      }
    };
    checkSessionToken();

    // 4. Load initial orders and setup dual SSE/polling fallback
    let sse: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let fallbackPollInterval: ReturnType<typeof setInterval> | null = null;

    const loadOrdersFallback = async () => {
      try {
        const latestOrders = await dbService.getOrders();
        setOrders(latestOrders.slice(0, 15));
      } catch (err) {
        // Quiet fallback log
        console.warn('Orders fallback fetch paused, retrying...');
      }
    };

    // Load initial immediately to provide fast UI hydration
    loadOrdersFallback();

    const connectSSE = () => {
      if (sse) {
        sse.close();
      }
      sse = new EventSource('/api/orders/stream');

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'initial') {
            setOrders(data.orders);
            if (fallbackPollInterval) {
              clearInterval(fallbackPollInterval);
              fallbackPollInterval = null;
            }
          } else if (data.type === 'new' && data.order) {
            setOrders(prev => {
              const filtered = prev.filter(o => o.id !== data.order.id);
              return [data.order, ...filtered];
            });
          }
        } catch (err) {
          console.warn('Unable to parse stream update:', err);
        }
      };

      sse.onerror = () => {
        if (sse) {
          sse.close();
          sse = null;
        }

        // Start fallback polling if not already running
        if (!fallbackPollInterval) {
          fallbackPollInterval = setInterval(loadOrdersFallback, 30000);
        }

        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        reconnectTimeout = setTimeout(() => {
          connectSSE();
        }, 30000);
      };
    };

    connectSSE();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      if (sse) {
        sse.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (fallbackPollInterval) {
        clearInterval(fallbackPollInterval);
      }
    };
  }, []);

  // Countdown timer effect
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
    if (end <= Date.now()) {
      setCountdownActive(false);
      return;
    }
    const interval = setInterval(() => {
      calcCountdown(end);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownActive, config?.maintenanceEndTime]);

  // Follow system color scheme changes until user manually toggles themes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!hasUserInteracted.current) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Theme application with admin isolation:
  // - Admin panel → force clean slate (no .dark class) so it always renders in light mode
  // - Public site → apply user's saved or auto-detected theme preference
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Clean all theme classes and custom properties
    root.classList.remove('dark', 'contrast', 'light-theme');
    root.style.removeProperty('--color-brand-500');
    
    if (currentView === 'admin') return; // Clean slate = default light mode
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'contrast') {
      root.classList.add('contrast', 'dark');
      root.style.setProperty('--color-brand-500', '#FFD700');
    } else {
      root.classList.add('light-theme');
    }
  }, [theme, currentView]);

  // Synchronized route-changing helper using HTML5 PushState history API
  const handleViewChange = (viewId: string) => {
    setCurrentView(viewId);
    const targetPath = viewId === 'admin' ? '/admin' : '/';
    const targetUrl = viewId === 'inicio' ? targetPath : `${targetPath}${window.location.search}`;
    if (window.location.pathname !== targetPath || (viewId === 'inicio' && window.location.search)) {
      window.history.pushState({}, '', targetUrl);
    }
  };

  const [adminRole, setAdminRole] = useState<'admin' | 'analyst' | 'stock_manager'>('admin');

  const handleAdminLogin = (role: 'admin' | 'analyst' | 'stock_manager') => {
    setIsAdminLoggedIn(true);
    setAdminRole(role);
  };

  const handleAdminLogout = async () => {
    await dbService.adminLogout();
    localStorage.removeItem('maison_admin_role');
    setIsAdminLoggedIn(false);
    setAdminRole('admin');
    handleViewChange('admin'); // Redirect to admin login screen, not homepage
  };

  const scrollToSection = (sectionId: string) => {
    handleViewChange(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0, y: 20, scale: 0.99 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 20,
        mass: 0.5,
      }
    },
    exit: { 
      opacity: 0, 
      y: -10, 
      scale: 0.99,
      transition: {
        duration: 0.25,
        ease: 'easeInOut' as const,
      }
    },
  };

  // Auto-dismiss entrance animation after ~1.6s
  // Durante la animación, precargamos las imágenes críticas (hero + logo)
  // usando las URLs guardadas en localStorage de visitas anteriores
  useEffect(() => {
    // Precargar hero image y logo desde localStorage (guardados en visitas previas)
    // Esto se ejecuta INMEDIATAMENTE, aprovechando los 1.6s de animación
    const savedHeroUrl = (() => {
      try { return localStorage.getItem('maison_hero_url'); } catch { return null; }
    })();
    const savedLogoUrl = (() => {
      try { return localStorage.getItem('maison_logo_url'); } catch { return null; }
    })();

    const urlsToPreload: string[] = [];
    if (savedHeroUrl) urlsToPreload.push(savedHeroUrl);
    if (savedLogoUrl) urlsToPreload.push(savedLogoUrl);

    if (urlsToPreload.length > 0) {
      // Disparar la precarga en background (no bloquear la animación)
      preloadImages(urlsToPreload);
    }

    const timer = setTimeout(() => setShowEntrance(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Fallback component for Suspense
  const SectionFallback = () => (
    <div className="py-24 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
        <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Cargando sección...</span>
      </div>
    </div>
  );

  // Maintenance Mode Screen (clients see this, admin can still access /admin to disable it)
  if (maintenanceMode && currentView !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF9F5] via-white to-[#FFF9F5] flex items-center justify-center p-4 overflow-hidden">
        <GoogleAnalytics />
        
        {/* Decorative floating particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-brand-200/30"
              style={{
                left: `${10 + i * 18}%`,
                top: `${15 + (i % 3) * 30}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.6,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg w-full text-center space-y-5 relative z-10"
        >
          {/* Lottie 3D Cake Animation */}
          <div className="relative flex justify-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.08, 0.15] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute w-80 h-80 rounded-full bg-brand-200/40 blur-3xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="w-72 h-72 relative"
            >
              <DotLottieReact
                src="/cake.lottie"
                autoplay
                loop
                style={{ width: '100%', height: '100%' }}
              />
            </motion.div>
          </div>

          <div className="space-y-4">
            {/* Badge */}
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="inline-block px-4 py-1.5 bg-brand-50 border border-brand-200 rounded-full text-[10px] font-mono font-semibold text-brand-700 tracking-[0.2em] uppercase"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-2 align-middle" />
              {config?.maintenanceBadge || 'En mantenimiento'}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="font-serif text-3xl sm:text-4xl font-bold text-zinc-900 leading-tight"
            >
              {config?.maintenanceTitle || 'Volveremos muy pronto'}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-sm sm:text-base text-zinc-500 leading-relaxed font-sans max-w-sm mx-auto"
            >
              {config?.maintenanceDescription ? (
                <>{config.maintenanceDescription}</>
              ) : (
                <>
                  Estamos horneando nuevas sorpresas para ti. Mientras tanto,
                  <span className="text-zinc-700 font-medium"> todos tus pedidos y operaciones continúan activos</span>.
                  No tienes nada de qué preocuparte.
                </>
              )}
            </motion.p>

            {/* Countdown Timer */}
            {countdownActive && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-3"
              >
                {[
                  { label: 'Días', value: countdown.days },
                  { label: 'Horas', value: countdown.hours },
                  { label: 'Min', value: countdown.minutes },
                  { label: 'Seg', value: countdown.seconds },
                ].map((unit, i) => (
                  <div key={unit.label} className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/80 backdrop-blur-sm border border-brand-100 rounded-2xl flex items-center justify-center shadow-sm">
                        <span className="font-mono text-lg sm:text-xl font-bold text-brand-700 tabular-nums">
                          {String(unit.value).padStart(2, '0')}
                        </span>
                      </div>
                      <span className="block text-[9px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mt-1">
                        {unit.label}
                      </span>
                    </div>
                    {i < 3 && <span className="text-lg font-mono font-bold text-brand-300 -mt-5">:</span>}
                  </div>
                ))}
              </motion.div>
            )}

            {/* Reassurance cards */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="grid grid-cols-2 gap-2 max-w-xs mx-auto"
            >
              <div className="bg-white/70 backdrop-blur-sm border border-brand-100 rounded-xl p-3 text-center">
                <span className="block text-lg mb-0.5">✅</span>
                <span className="text-[10px] font-mono font-semibold text-zinc-600 uppercase tracking-wide">
                  Pedidos guardados
                </span>
              </div>
              <div className="bg-white/70 backdrop-blur-sm border border-brand-100 rounded-xl p-3 text-center">
                <span className="block text-lg mb-0.5">🔄</span>
                <span className="text-[10px] font-mono font-semibold text-zinc-600 uppercase tracking-wide">
                  Operaciones activas
                </span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="space-y-4 pt-1"
          >
            {/* Contact Info */}
            <div className="text-xs text-zinc-400 font-sans">
              <p>📧 {config?.email || 'edwinraulrosasalbines@gmail.com'}</p>
              <p>📱 {config?.whatsappNumber ? `+${config.whatsappNumber}` : '+51 902 568 187'}</p>
            </div>

            {/* Social Media Buttons */}
            <div className="flex items-center justify-center gap-3">
              {/* Facebook */}
              <a
                href={config?.facebookUrl || 'https://facebook.com/edwinraul.rosasalbines'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <span>Facebook</span>
              </a>
              {/* Instagram */}
              <a
                href={config?.instagramUrl || 'https://instagram.com/edwinraulrosas741/'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#515bd4] hover:opacity-90 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                <span>Instagram</span>
              </a>
              {/* WhatsApp */}
              <a
                href={`https://wa.me/${config?.whatsappNumber || '51902568187'}?text=Hola%20Carol%20y%20Edwin%2C%20quiero%20hacer%20un%20pedido`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                <span>WhatsApp</span>
              </a>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-[11px] text-zinc-400 font-serif italic"
          >
            — Con amor, Carol & Edwin Rosas Albines
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative dot-pattern" style={{backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)'}}>
      
      {/* Google Analytics 4 */}
      <GoogleAnalytics />

      {/* Elegant Entrance Animation Overlay — auto-dismisses after ~1.6s */}
      <AnimatePresence>
        {showEntrance && currentView === 'inicio' && (
          <motion.div
            key="entrance"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04, filter: 'blur(2px)' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{backgroundColor: 'var(--theme-bg)'}}
          >
            {/* Ambient warm glow */}
            <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full bg-brand-100/40 blur-3xl" />
            <div className="absolute bottom-1/3 right-1/3 w-48 h-48 rounded-full bg-brand-secondary/15 blur-3xl" />

            <div className="text-center relative z-10">
              {/* Animated Cake Icon */}
              <motion.div
                initial={{ opacity: 0, scale: 0.6, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="flex justify-center mb-2"
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                >
                  <Cake className="w-8 h-8 text-brand-400" />
                </motion.div>
              </motion.div>

              {/* Maison Rosas — elegant blur-to-clear reveal */}
              <motion.h1
                initial={{ opacity: 0, scale: 0.92, y: 12, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="font-serif text-4xl font-bold tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, #C4847D 0%, #D4A373 50%, #C4847D 100%)',
                  backgroundSize: '200% 200%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Maison Rosas
              </motion.h1>

              {/* Decorative line expanding from center */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.45, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
                className="h-px bg-gradient-to-r from-transparent via-brand-300/60 to-transparent mt-3 mx-auto origin-center"
                style={{ width: '50%' }}
              />

              {/* Tagline fade-in */}
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 0.7, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6, ease: 'easeOut' }}
                className="text-[10px] font-mono tracking-[0.3em] text-brand-500 uppercase mt-3"
              >
                Alma Artesanal
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Sticky Header Navbar — oculto en admin (login + panel) */}
      {currentView !== 'admin' && (
        <Navbar
          currentView={currentView}
          setCurrentView={handleViewChange}
          isAdminLoggedIn={isAdminLoggedIn}
          onLogout={handleAdminLogout}
          logoUrl={config?.logoUrl}
          theme={theme}
          onToggleTheme={() => {
            hasUserInteracted.current = true;
            const next = theme === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem('maison_theme', next); } catch {}
            setTheme(next);
          }}
        />
      )}

      {/* RENDER CURRENT VIEW ROUTE */}
      <AnimatePresence mode="wait">
        {currentView === 'admin' ? (
          <motion.main
            key="admin-page"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Suspense fallback={<SectionFallback />}>
              <AdminPanel
                products={products}
                orders={orders}
                setOrders={setOrders}
                reviews={reviews}
                galleryItems={galleryItems}
                config={config || {
                  whatsappNumber: '51902568187',
                  facebookUrl: 'https://facebook.com/maisonrosas.pasteleria',
                  instagramUrl: 'https://instagram.com/maisonrosas.pasteleria',
                  email: 'edwinraulrosasalbines@gmail.com',
                  address: 'Av. Ricardo Palma 213, Sánchez Cerro, Sullana, Piura',
                  openingHours: 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                  seoTitle: 'Maison Rosas',
                  seoDescription: 'Pastelería fina',
                  maintenanceMode: false,
                  maintenanceEndTime: ''
                }}
                onRefreshData={loadDataFromFirestore}
                onLoginSuccess={handleAdminLogin}
                isLoggedIn={isAdminLoggedIn}
                adminRole={adminRole}
                onLogout={handleAdminLogout}
              />
            </Suspense>
          </motion.main>
        ) : currentView === 'tracking' ? (
          <motion.main
            key="tracking-page"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Suspense fallback={<SectionFallback />}>
              <OrderTracking onBackToHome={() => handleViewChange('inicio')} />
            </Suspense>
          </motion.main>
        ) : (
          <motion.div
            key="home-pages"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* 1. Hero Landing Banner Section */}
            <Hero 
              onViewCatalog={() => scrollToSection('catalogo')} 
              onViewHistory={() => scrollToSection('historia')} 
              config={config}
            />

{/* 2. Catalog Section — pasteles primero para enganchar al cliente */}
            <Suspense fallback={<SectionFallback />}>
              <Catalog
                products={products}
                onSelectCustomize={(prod) => setSelectedProductForCustomize(prod)}
              />
            </Suspense>

            {/* 3. Story / About Us Timeline Section */}
            <Suspense fallback={<SectionFallback />}>
              <History config={config} />
            </Suspense>

            {/* 4. Shared Gallery Section */}
            <Suspense fallback={<SectionFallback />}>
              <Gallery galleryItems={galleryItems} />
            </Suspense>

            {/* 5. Customer Testimonial Opinions Review Section */}
            <Suspense fallback={<SectionFallback />}>
              <Reviews 
                reviews={reviews} 
                onRefreshReviews={loadDataFromFirestore} 
              />
            </Suspense>

            {/* 6. FAQ Accordion Section */}
            <Suspense fallback={<SectionFallback />}>
              <FAQ />
            </Suspense>

            {/* 7. Contact Details and Map representation section */}
            <Suspense fallback={<SectionFallback />}>
              <Contact config={config} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* POPUP INTERACTIVE CUSTOMIZATION MODAL */}
      <AnimatePresence>
        {selectedProductForCustomize && (
          <Customizer
            product={selectedProductForCustomize}
            onClose={() => setSelectedProductForCustomize(null)}
            whatsappNumber={config?.whatsappNumber || '51902568187'}
          />
        )}
      </AnimatePresence>

      {/* FOOTER — oculto en admin */}
      {currentView !== 'admin' && (
        <footer className="py-16" style={{backgroundColor: 'var(--theme-bg-alt)', color: 'var(--theme-text)', borderTop: '1px solid var(--theme-border)'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-4">
            <span className="font-serif text-2xl font-bold tracking-tight">Maison Rosas</span>
            <p className="text-xs leading-relaxed font-sans" style={{color: 'var(--theme-text-secondary)'}}>
              Pastelería de Autor & Repostería Fina hecha con amor en Sullana, Piura. 
              Modelos exclusivos de Carol Rosas Albines coordinados de forma segura por Edwin Raúl Rosas.
            </p>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400 mb-4">Nuestra Casa</h4>
            <ul className="space-y-2 text-xs" style={{color: 'var(--theme-text-secondary)'}}>
              <li>{config?.address || 'Av. Ricardo Palma 213, Sánchez Cerro'}</li>
              <li>Sullana, Piura, Perú</li>
              <li><a href="mailto:edwinraulrosasalbines@gmail.com" className="hover:opacity-80 transition-opacity" style={{color: 'var(--theme-text-secondary)'}}>{config?.email || 'edwinraulrosasalbines@gmail.com'}</a></li>
              <li><a href="https://wa.me/51902568187" target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity" style={{color: 'var(--theme-text-secondary)'}}>+{config?.whatsappNumber || '51902568187'}</a></li>
            </ul>
          </div>

          <div>              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400 mb-4">Enlaces</h4>
            <ul className="space-y-2 text-xs" style={{color: 'var(--theme-text-secondary)'}}>
              <li>
                <button onClick={() => scrollToSection('inicio')} className="transition-opacity hover:opacity-80 cursor-pointer">
                  Inicio
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('historia')} className="transition-opacity hover:opacity-80 cursor-pointer">
                  Nuestra Historia
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('catalogo')} className="transition-opacity hover:opacity-80 cursor-pointer">
                  Catálogo de Modelos
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('opiniones')} className="transition-opacity hover:opacity-80 cursor-pointer">
                  Opiniones de Clientes
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400 mb-4">Políticas & Confianza</h4>
            <p className="text-[11px] leading-relaxed" style={{color: 'var(--theme-text-secondary)'}}>
              Todos nuestros pasteles se hornean a pedido con un mínimo de 48 horas de anticipación. 
              Higiene, ingredientes premium y empaque Maison garantizado en cada entrega.
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
      )}

      {/* LEGAL MODALS: TÉRMINOS DE SERVICIO Y POLÍTICAS DE PRIVACIDAD */}
      <TermsAndPrivacy
        isOpen={legalModal.isOpen}
        onClose={() => setLegalModal({ ...legalModal, isOpen: false })}
        initialTab={legalModal.tab}
      />

    </div>
  );
}
