import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Cake, Menu, X, LogIn, ShoppingBag, HelpCircle, PhoneCall, Star } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isAdminLoggedIn: boolean;
  onLogout: () => void;
  logoUrl?: string;
}

export default function Navbar({ currentView, setCurrentView, isAdminLoggedIn, onLogout, logoUrl }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'inicio', label: 'Inicio', icon: Cake },
    { id: 'historia', label: 'Nuestra Historia', icon: HelpCircle },
    { id: 'catalogo', label: 'Catálogo', icon: ShoppingBag },
    { id: 'tracking', label: 'Consultar Pedido', icon: Cake },
    { id: 'opiniones', label: 'Opiniones', icon: Star },
    { id: 'contacto', label: 'Contacto', icon: PhoneCall },
  ];

  const handleNavigate = (viewId: string) => {
    if (viewId === 'tracking') {
      setCurrentView('tracking');
      setIsOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setCurrentView('inicio');
    setIsOpen(false);
    
    setTimeout(() => {
      const element = document.getElementById(viewId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/70 dark:bg-zinc-950/75 backdrop-blur-md border-b border-white/20 dark:border-white/5 shadow-sm py-3' 
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Brand Name */}
          <div 
            onClick={() => handleNavigate('inicio')} 
            className="flex items-center space-x-3 cursor-pointer group"
            id="nav-logo"
          >
            {logoUrl ? (
              <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 group-hover:scale-110 transition-transform duration-300 border border-zinc-200 dark:border-zinc-850 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <img 
                  src={logoUrl} 
                  alt="Maison Rosas Logo" 
                  referrerPolicy="no-referrer" 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="p-2.5 bg-brand-500 rounded-full text-white group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                <Cake className="h-5 w-5" />
              </div>
            )}
            <div>
              <span className="text-xl font-light tracking-[0.15em] uppercase text-zinc-900 dark:text-white block leading-none">
                Maison Rosas
              </span>
              <span className="text-[9px] tracking-[0.25em] uppercase opacity-70 text-brand-secondary dark:text-brand-300 block mt-1 font-medium">
                Alta Repostería Artesanal
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium tracking-wide transition-colors ${
                    currentView === item.id
                      ? 'text-brand-700 dark:text-brand-300 bg-brand-50/80 dark:bg-brand-950/20'
                      : 'text-zinc-600 dark:text-zinc-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                  }`}
                  id={`nav-item-${item.id}`}
                >
                  {item.label}
                  {currentView === item.id && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-500 rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-2" />

            {isAdminLoggedIn && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentView('admin')}
                  className="px-4 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 transition-all shadow-sm"
                  id="nav-admin-dashboard"
                >
                  Dashboard
                </button>
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 rounded-full text-xs font-mono border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-red-500 transition-colors"
                  id="nav-logout"
                >
                  Salir
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              id="mobile-menu-toggle"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900 px-4 pt-3 pb-6 space-y-2 shadow-xl"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left text-base font-medium transition-colors ${
                currentView === item.id
                  ? 'text-brand-700 bg-brand-50 dark:text-brand-300 dark:bg-brand-950/20'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
              }`}
              id={`mobile-nav-item-${item.id}`}
            >
              <item.icon className="h-5 w-5 text-brand-500" />
              <span>{item.label}</span>
            </button>
          ))}

          <div className="h-px bg-zinc-100 dark:bg-zinc-900 my-3" />

          {isAdminLoggedIn && (
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setCurrentView('admin');
                  setIsOpen(false);
                }}
                className="w-full flex justify-center items-center px-4 py-3 rounded-xl text-center font-bold bg-zinc-950 dark:bg-white text-white dark:text-zinc-900 shadow-sm"
                id="mobile-nav-admin"
              >
                Ir al Dashboard
              </button>
              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="w-full flex justify-center items-center px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-red-500 font-medium text-center"
                id="mobile-nav-logout"
              >
                Cerrar Sesión
              </button>
            </div>
          )}
        </motion.div>
      )}
    </motion.nav>
  );
}
