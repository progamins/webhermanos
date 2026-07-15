import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Moon, Sun, AlertCircle, ShoppingBag, Eye, LogOut, Cake } from 'lucide-react';

// Database service & types
import { dbService, seedDatabaseIfNeeded } from './dbService';
import { Product, Order, Review, GalleryItem, AppConfig } from './types';

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

    // Update favicon with cache-busting to force browser refresh
    const faviconLink = document.getElementById('dynamic-favicon') as HTMLLinkElement;
    if (faviconLink) {
      if (config.faviconUrl) {
        // Add cache-busting query param so the browser re-downloads the favicon
        const cacheBuster = `?v=${Date.now()}`;
        const cleanUrl = config.faviconUrl.split('?')[0];
        faviconLink.href = cleanUrl + cacheBuster;
        faviconLink.type = ''; // Let browser auto-detect type from URL
      } else {
        // Reset to default favicon when none is configured
        faviconLink.href = '/favicon.svg';
        faviconLink.type = 'image/svg+xml';
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

  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
  };

  const handleAdminLogout = async () => {
    await dbService.adminLogout();
    setIsAdminLoggedIn(false);
    handleViewChange('inicio');
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

  return (
    <div className="min-h-screen bg-brand-bg text-zinc-800 transition-colors duration-300 relative selection:bg-brand-100 selection:text-brand-900 dot-pattern">
      
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
                  maintenanceMode: false
                }}
                onRefreshData={loadDataFromFirestore}
                onLoginSuccess={handleAdminLogin}
                isLoggedIn={isAdminLoggedIn}
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
