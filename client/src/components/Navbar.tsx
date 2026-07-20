import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { useReducedMotion, useIsMobile } from '../hooks';
import { Cake, Menu, X, ShoppingBag, HelpCircle, PhoneCall, Star, Sun, Moon } from 'lucide-react';
import CachedImage from './CachedImage';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  logoUrl?: string;
  theme?: 'light' | 'dark' | 'contrast';
  onToggleTheme?: () => void;
  onNavigate?: (viewId: string) => void;
}

const NAV_ITEMS = [
  { id: 'inicio', label: 'Inicio', icon: Cake },
  { id: 'historia', label: 'Nuestra Historia', icon: HelpCircle },
  { id: 'catalogo', label: 'Catálogo', icon: ShoppingBag },
  { id: 'tracking', label: 'Consultar Pedido', icon: Cake },
  { id: 'opiniones', label: 'Opiniones', icon: Star },
  { id: 'contacto', label: 'Contacto', icon: PhoneCall },
] as const;

function Navbar({ currentView, setCurrentView, logoUrl, theme = 'dark', onToggleTheme }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        toggleBtnRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleNavigate = useCallback(
    (viewId: string) => {
      setIsOpen(false);
      if (viewId === 'tracking') {
        setCurrentView('tracking');
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
        return;
      }
      setCurrentView('inicio');
      requestAnimationFrame(() => {
        const element = document.getElementById(viewId);
        if (element) {
          element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
        }
      });
    },
    [setCurrentView, reducedMotion]
  );

  const isActive = (id: string) =>
    id === 'tracking' ? currentView === 'tracking' : currentView === 'inicio' && id !== 'tracking';

  return (
    <nav
      className={`fixed z-50 transition-all duration-500 ease-out will-change-transform ${
        scrolled
          ? 'top-3 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[92%] max-w-7xl rounded-full border py-2 px-3 md:px-6 backdrop-blur-lg'
          : 'top-0 left-0 right-0 py-5 border-b border-transparent'
      }`}
      style={{
        backgroundColor: scrolled ? 'var(--theme-surface-glass)' : 'transparent',
        borderColor: scrolled ? 'var(--theme-border)' : 'transparent',
        transform: scrolled ? undefined : undefined,
      }}
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className={scrolled ? 'w-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}>
        <div className="flex items-center justify-between h-14">
          <button
            onClick={() => handleNavigate('inicio')}
            className="flex items-center space-x-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg"
            aria-label="Ir al inicio"
          >
            {logoUrl ? (
              <div className="h-11 w-11 rounded-full overflow-hidden shrink-0 group-hover:scale-110 transition-transform duration-300 border-2" style={{ borderColor: 'var(--theme-border)' }}>
                <CachedImage src={logoUrl} width={100} alt="Maison Rosas" wrapperClassName="w-full h-full" className="w-full h-full object-cover" priority />
              </div>
            ) : (
              <div className="relative">
                <div className="p-2.5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: 'var(--theme-brand-primary)', color: '#fff' }}>
                  <Cake className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="absolute -inset-1 rounded-full border" style={{ borderColor: 'var(--theme-brand-primary)', opacity: 0.3 }} aria-hidden="true" />
              </div>
            )}
            <div>
              <span className="text-xl font-serif font-bold tracking-tight block leading-none" style={{ color: 'var(--theme-text)' }}>Maison Rosas</span>
              <span className="text-[9px] tracking-[0.25em] uppercase block mt-1 font-medium font-mono" style={{ color: 'var(--theme-brand-primary)', opacity: 0.8 }}>Alta Repostería Artesanal</span>
            </div>
          </button>

          <div className="hidden md:flex items-center space-x-1" role="menubar">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    currentView === item.id
                      ? 'text-brand-700 dark:text-brand-300 bg-brand-50/80 dark:bg-brand-950/20'
                      : 'text-[var(--theme-text-secondary)] hover:text-brand-600 dark:hover:text-brand-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                  }`}
                  role="menuitem"
                  aria-current={currentView === item.id ? 'page' : undefined}
                  id={`nav-item-${item.id}`}
                >
                  <Icon className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}

            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="ml-2 p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>

          <div className="md:hidden">
            <button
              ref={toggleBtnRef}
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
              id="mobile-menu-toggle"
            >
              {isOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          ref={mobileMenuRef}
          id="mobile-menu"
          role="menu"
          aria-label="Navegación móvil"
          className={`md:hidden px-4 pt-3 pb-6 space-y-2 shadow-xl ${isOpen ? 'block' : 'hidden'}`}
          style={{ backgroundColor: 'var(--theme-surface)', borderTop: '1px solid var(--theme-border)' }}
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  currentView === item.id
                    ? 'text-brand-700 bg-brand-50 dark:text-brand-300 dark:bg-brand-950/20'
                    : 'text-[var(--theme-text-secondary)] hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                }`}
                role="menuitem"
                aria-current={currentView === item.id ? 'page' : undefined}
                id={`mobile-nav-item-${item.id}`}
              >
                <Icon className="h-5 w-5 text-brand-500" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
              <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

export default memo(Navbar);
