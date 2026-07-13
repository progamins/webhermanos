import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Moon, Sun, AlertCircle, ShoppingBag, Eye, LogOut } from 'lucide-react';

// Database service & types
import { dbService, seedDatabaseIfNeeded } from './dbService';
import { Product, Order, Review, GalleryItem, AppConfig } from './types';

// Components
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import RecentPurchases from './components/RecentPurchases';
import History from './components/History';
import Catalog from './components/Catalog';
import Customizer from './components/Customizer';
import Gallery from './components/Gallery';
import Reviews from './components/Reviews';
import FAQ from './components/FAQ';
import Contact from './components/Contact';
import AdminPanel from './components/AdminPanel';
import OrderTracking from './components/OrderTracking';

export default function App() {
  // Page load screen state
  const [initialLoading, setInitialLoading] = useState(true);

  // Core App states loaded from Firestore
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);

  // Active view states ('inicio' / 'admin')
  const [currentView, setCurrentView] = useState<string>('inicio');

  // Customizer pop-up trigger
  const [selectedProductForCustomize, setSelectedProductForCustomize] = useState<Product | null>(null);

  // Theme configuration (light/dark/high-contrast)
  const [theme, setTheme] = useState<'light' | 'dark' | 'contrast'>('light');

  // Admin authentication state saved locally
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

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
    } catch (error) {
      console.error('Error fetching data from Firestore:', error);
    } finally {
      // Delay slightly for premium entry animation
      setTimeout(() => {
        setInitialLoading(false);
      }, 1500);
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
    let reconnectTimeout: any = null;
    let fallbackPollInterval: any = null;

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

    // Safety fallback: force-disable loading screen after 6 seconds to prevent infinite loader
    const fallbackTimeout = setTimeout(() => {
      setInitialLoading(false);
    }, 6000);

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

  // Render Premium Initial Loader Screen
  if (initialLoading) {
    return (
      <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 transition-colors duration-500">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6"
        >
          {/* Custom Spinning Glowing Pastry Loader SVG */}
          <div className="relative flex justify-center items-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
              className="w-24 h-24 rounded-full border-4 border-dashed border-brand-500/30 border-t-brand-500"
            />
            <div className="absolute text-3xl">🧁</div>
          </div>

          <div>
            <span className="font-serif text-3xl font-bold tracking-tight text-zinc-900 dark:text-white block">
              Maison Rosas
            </span>
            <span className="text-xs font-mono tracking-widest text-brand-600 dark:text-brand-400 uppercase mt-1 block">
              PASTELERÍA DE AUTOR • CAROL & EDWIN
            </span>
          </div>

          <p className="text-[10px] text-zinc-400 font-sans tracking-wide">
            Cargando recetas familiares y texturas elegantes...
          </p>
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
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
          >
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
                email: 'maisonrosas@gmail.com',
                address: 'AV ricardo palma 213 sanchez cerro piura sullana peru',
                openingHours: 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                seoTitle: 'Maison Rosas',
                seoDescription: 'Pastelería fina',
                maintenanceMode: false
              }}
              onRefreshData={loadDataFromFirestore}
              onLoginSuccess={handleAdminLogin}
              isLoggedIn={isAdminLoggedIn}
            />
          </motion.main>
        ) : currentView === 'tracking' ? (
          <motion.main
            key="tracking-page"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
          >
            <OrderTracking onBackToHome={() => handleViewChange('inicio')} />
          </motion.main>
        ) : (
          <motion.div
            key="home-pages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
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
            <History config={config} />

            {/* 3. Catalog Section with Customization trigger */}
            <Catalog
              products={products}
              onSelectCustomize={(prod) => setSelectedProductForCustomize(prod)}
            />

            {/* 4. Shared Gallery Section */}
            <Gallery galleryItems={galleryItems} />

            {/* 5. Customer Testimonial Opinions Review Section */}
            <Reviews 
              reviews={reviews} 
              onRefreshReviews={loadDataFromFirestore} 
            />

            {/* 6. FAQ Accordion Section */}
            <FAQ />

            {/* 7. Contact Details and Map representation section */}
            <Contact config={config} />
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
              <li>{config?.address || 'AV ricardo palma 213, sanchez cerro'}</li>
              <li>Sullana, Piura, Perú</li>
              <li>{config?.email || 'maisonrosas@gmail.com'}</li>
              <li>+{config?.whatsappNumber || '51902568187'}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400 mb-4">Enlaces Rápidos</h4>
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
            <span className="hover:text-zinc-300 cursor-pointer">Términos de Servicio</span>
            <span className="hover:text-zinc-300 cursor-pointer">Políticas de Privacidad</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
