import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Cake, Menu, X, LogIn, ShoppingBag, HelpCircle, PhoneCall, Star, Sun, Moon } from 'lucide-react';
import { optimizeImageUrl } from '../utils/images';
import CachedImage from './CachedImage';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isAdminLoggedIn: boolean;
  onLogout: () => void;
  logoUrl?: string;
  theme?: 'light' | 'dark' | 'contrast';
  onToggleTheme?: () => void;
}

export default function Navbar({ currentView, setCurrentView, isAdminLoggedIn, onLogout, logoUrl, theme = 'dark', onToggleTheme }: NavbarProps) {
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

  return (        <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ 
        type: 'spring',
        stiffness: 120,
        damping: 20,
        mass: 0.8,
      }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 will-change-transform ${
        scrolled 
          ? 'backdrop-blur-md border-b shadow-sm py-3' 
          : 'bg-transparent py-5'
      }`}
      style={{
        backgroundColor: scrolled ? 'var(--theme-surface-glass)' : 'transparent',
        borderColor: scrolled ? 'var(--theme-border)' : 'transparent',
      }}
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
              <div className="h-11 w-11 rounded-full overflow-hidden shrink-0 group-hover:scale-110 transition-transform duration-300 border-2" style={{borderColor: 'var(--theme-border)'}}>
                <CachedImage 
                  src={logoUrl || ''} 
                  width={100}
                  alt="Maison Rosas Logo" 
                  className="w-full h-full object-cover"
                  wrapperClassName="w-full h-full"
                  spinnerSize={16}
                />
              </div>
            ) : (
              <div className="relative">
                <div className="p-2.5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300" style={{backgroundColor: 'var(--theme-brand-primary)', color: '#fff'}}>
                  <Cake className="h-5 w-5" />
                </div>
                {/* Decorative ring */}
                <div className="absolute -inset-1 rounded-full border" style={{borderColor: 'var(--theme-brand-primary)', opacity: 0.3}} />
              </div>
            )}
            <div>
              <span className="text-xl font-serif font-bold tracking-tight block leading-none" style={{color: 'var(--theme-text)'}}>
                Maison Rosas
              </span>
              <span className="text-[9px] tracking-[0.25em] uppercase block mt-1 font-medium font-mono" style={{color: 'var(--theme-brand-primary)', opacity: 0.8}}>
                Alta Repostería Artesanal
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links — hidden for admin, only show Panel + Salir */}
          <div className="hidden md:flex items-center space-x-1">
            {!isAdminLoggedIn && navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium tracking-wide transition-colors ${
                    currentView === item.id
                      ? 'text-brand-700 dark:text-brand-300 bg-brand-50/80 dark:bg-brand-950/20'
                      : 'hover:text-brand-600 dark:hover:text-brand-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                  }`}
                  style={{color: currentView === item.id ? undefined : 'var(--theme-text-secondary)'}}
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

            {/* Theme Toggle Pill */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="ml-2 p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 border"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                }}
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}

            {!isAdminLoggedIn && <div className="h-4 w-px" style={{backgroundColor: 'var(--theme-border)'}} />}

            {isAdminLoggedIn && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentView('admin')}
                  className="px-4 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider shadow-sm"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    color: 'var(--theme-text)',
                  }}
                  id="nav-admin-dashboard"
                >
                  Panel
                </button>
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 rounded-full text-xs font-mono border transition-colors"
                  style={{
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text-muted)',
                  }}
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
          className="md:hidden px-4 pt-3 pb-6 space-y-2 shadow-xl"
          style={{backgroundColor: 'var(--theme-surface)', borderTop: '1px solid var(--theme-border)'}}
        >
          {!isAdminLoggedIn && navItems.map((item) => (
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

          {/* Theme toggle for mobile */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--theme-surface)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)',
              }}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
            </button>
          )}

          {!isAdminLoggedIn && (
            <div className="h-px" style={{backgroundColor: 'var(--theme-border)'}} />
          )}

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
