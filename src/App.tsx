import { useState, useEffect, lazy, Suspense } from 'react';
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
import RecentPurchases from './components/RecentPurchases';
import TermsAndPrivacy from './components/TermsAndPrivacy';

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

// Loading messages for the splash screen
const LOADING_MESSAGES = [
  'Preparando recetas familiares...',
  'Caramelizando ingredientes frescos...',
  'Decorando con amor artesanal...',
  'Horneando el bizcocho perfecto...',
  'Espolvoreando polvo de estrellas...',
  '¡Bienvenido a Maison Rosas! ✨',
];

export default function App() {
  // Page load screen state
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);

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

  // Theme configuration (light/dark/high-contrast)
  const [theme, setTheme] = useState<'light' | 'dark' | 'contrast'>('light');

  // Admin authentication state saved locally
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Maintenance mode
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Countdown state
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [countdownActive, setCountdownActive] = useState(false);

  // Legal modals state
  const [legalModal, setLegalModal] = useState<{ isOpen: boolean; tab: 'terms' | 'privacy' }>({ isOpen: false, tab: 'terms' });

  // Cycle loading messages
  useEffect(() => {
    if (!initialLoading) return;
    const interval = setInterval(() => {
      setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      setLoadingProgress(prev => Math.min(prev + Math.random() * 18 + 5, 98));
    }, 900);
    return () => clearInterval(interval);
  }, [initialLoading]);

  // Note: Hero image preload removed intentionally.
  // The Hero component already uses fetchPriority="high" and decoding="async"
  // on its <img> tag, which is sufficient for LCP optimization.
  // A separate <link rel="preload"> caused browser warnings about unused preloads.

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
  }, [config]);

  // Initialize and load data from Firestore
  const loadDataFromFirestore = async () => {
    try {
      // 1. Seed if empty
      await seedDatabaseIfNeeded();

      // Set progress after seed
      setLoadingProgress(20);

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
      setLoadingProgress(85);
    } catch (error) {
      console.error('Error fetching data from Firestore:', error);
    } finally {
      setLoadingProgress(100);
      // Small delay for the final message to show
      setTimeout(() => {
        setInitialLoading(false);
      }, 600);
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

    // Safety fallback: force-disable loading screen after 8 seconds to prevent infinite loader
    const fallbackTimeout = setTimeout(() => {
      setInitialLoading(false);
    }, 8000);

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
      clearTimeout(fallbackTimeout);
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

  // Theme updates
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark', 'contrast');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'contrast') {
      root.classList.add('contrast');
      root.style.setProperty('--color-brand-500', '#FFD700'); // Highly visible yellow
    }
  }, [theme]);

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

  // Fallback component for Suspense
  const SectionFallback = () => (
    <div className="py-24 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
        <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Cargando sección...</span>
      </div>
    </div>
  );

  // Render Premium Initial Loader Screen
  if (initialLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-brand-50 via-white to-brand-50/50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
        {/* Ambient Background Glow */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-brand-200/20 dark:bg-brand-500/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-brand-secondary/10 dark:bg-brand-300/5 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Floating sparkle particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-brand-300/40 dark:bg-brand-400/20"
              style={{
                left: `${15 + i * 10}%`,
                top: `${20 + (i % 5) * 15}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0, 0.8, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.4,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center space-y-8 relative z-10"
        >
          {/* Animated Cake Logo Container */}
          <div className="relative flex justify-center items-center">
            {/* Outer pulsing ring */}
            <motion.div
              animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.3, 0.1, 0.3] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="absolute w-32 h-32 rounded-full bg-brand-200/30 dark:bg-brand-500/10 blur-xl"
            />
            
            {/* Rotating ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
              className="absolute w-28 h-28 rounded-full border-2 border-dashed border-brand-300/40 dark:border-brand-400/20"
            />
            
            {/* Inner rotating ring (opposite direction) */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
              className="absolute w-20 h-20 rounded-full border border-brand-secondary/20 dark:border-brand-300/10"
            />

            {/* Cake Icon */}
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className="relative"
            >
              <Cake className="w-12 h-12 text-brand-500 dark:text-brand-400" />
            </motion.div>
          </div>

          {/* Logo Text with Gradient */}
          <div>
            <motion.h1
              className="font-serif text-4xl font-bold tracking-tight text-zinc-900 dark:text-white"
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
              style={{
                background: 'linear-gradient(135deg, #C4847D 0%, #D4A373 50%, #C4847D 100%)',
                backgroundSize: '200% 200%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Maison Rosas
            </motion.h1>
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-xs font-mono tracking-[0.3em] text-brand-600 dark:text-brand-400 uppercase mt-2 block"
            >
              PASTELERÍA DE AUTOR
            </motion.span>
          </div>

          {/* Progress Bar */}
          <div className="w-56 mx-auto space-y-3">
            <div className="h-0.5 bg-brand-200/40 dark:bg-brand-800/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-brand-400 to-brand-secondary rounded-full"
                animate={{ width: `${loadingProgress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            
            {/* Animated Loading Messages */}
            <AnimatePresence mode="wait">
              <motion.p
                key={loadingMessageIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono tracking-wider"
              >
                {LOADING_MESSAGES[loadingMessageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-brand-bg text-zinc-800 transition-colors duration-300 relative selection:bg-brand-100 selection:text-brand-900 dot-pattern">
      
      {/* Google Analytics 4 */}
      <GoogleAnalytics />

      {/* Main Sticky Header Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={handleViewChange}
        isAdminLoggedIn={isAdminLoggedIn}
        onLogout={handleAdminLogout}
        logoUrl={config?.logoUrl}
      />

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

            {/* Live activity social proof recent purchases ticker */}
            <RecentPurchases orders={orders} />

            {/* 2. Story / About Us Timeline Section */}
            <Suspense fallback={<SectionFallback />}>
              <History config={config} />
            </Suspense>

            {/* 3. Catalog Section with Customization trigger */}
            <Suspense fallback={<SectionFallback />}>
              <Catalog
                products={products}
                onSelectCustomize={(prod) => setSelectedProductForCustomize(prod)}
              />
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

      {/* FOOTER */}
      <footer className="bg-zinc-900 text-white py-16 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-4">
            <span className="font-serif text-2xl font-bold tracking-tight">Maison Rosas</span>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Pastelería de Autor & Repostería Fina hecha con amor en Sullana, Piura. 
              Modelos exclusivos de Carol Rosas Albines coordinados de forma segura por Edwin Raúl Rosas.
            </p>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400 mb-4">Nuestra Casa</h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>{config?.address || 'Av. Ricardo Palma 213, Sánchez Cerro'}</li>
              <li>Sullana, Piura, Perú</li>
              <li><a href="mailto:edwinraulrosasalbines@gmail.com" className="hover:text-white transition-colors">{config?.email || 'edwinraulrosasalbines@gmail.com'}</a></li>
              <li><a href="https://wa.me/51902568187" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">+{config?.whatsappNumber || '51902568187'}</a></li>
            </ul>
          </div>

          <div>              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400 mb-4">Enlaces</h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <button onClick={() => scrollToSection('inicio')} className="hover:text-white transition-colors">
                  Inicio
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('historia')} className="hover:text-white transition-colors">
                  Nuestra Historia
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('catalogo')} className="hover:text-white transition-colors">
                  Catálogo de Modelos
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('opiniones')} className="hover:text-white transition-colors">
                  Opiniones de Clientes
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400 mb-4">Políticas & Confianza</h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Todos nuestros pasteles se hornean a pedido con un mínimo de 48 horas de anticipación. 
              Higiene, ingredientes premium y empaque Maison garantizado en cada entrega.
            </p>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-zinc-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-4">
          <span>&copy; {new Date().getFullYear()} Maison Rosas. Todos los derechos reservados.</span>
          <div className="flex space-x-4">
            <button onClick={() => setLegalModal({ isOpen: true, tab: 'terms' })} className="hover:text-zinc-300 cursor-pointer">Términos de Servicio</button>
            <button onClick={() => setLegalModal({ isOpen: true, tab: 'privacy' })} className="hover:text-zinc-300 cursor-pointer">Políticas de Privacidad</button>
          </div>
        </div>
      </footer>

      {/* LEGAL MODALS: TÉRMINOS DE SERVICIO Y POLÍTICAS DE PRIVACIDAD */}
      <TermsAndPrivacy
        isOpen={legalModal.isOpen}
        onClose={() => setLegalModal({ ...legalModal, isOpen: false })}
        initialTab={legalModal.tab}
      />

    </div>
  );
}
