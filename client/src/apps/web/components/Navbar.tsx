import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { useReducedMotion, useIsMobile } from '../../../shared/hooks';
import { Cake, Menu, ShoppingBag, HelpCircle, PhoneCall, Star, Sun, Moon } from 'lucide-react';
import CachedImage from '../../../shared/components/CachedImage';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../../../shared/components/ui';

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

  // Sheet maneja Escape nativamente, no necesita handler manual
  // El overflow del body se maneja en handleOpenChange y handleNavigate

  // Referencia para evitar re-abrir el Sheet durante cleaner
  const sheetCloseLockRef = useRef(false);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (sheetCloseLockRef.current && !open) return;
    setIsOpen(open);
    if (!open) {
      setTimeout(() => {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }, 350);
    }
  }, []);

  const handleNavigate = useCallback(
    (viewId: string) => {
      sheetCloseLockRef.current = true;
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      setIsOpen(false);
      setTimeout(() => { sheetCloseLockRef.current = false; }, 350);

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
      className={`fixed z-50 ${
        scrolled
          ? 'top-3 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[92%] max-w-7xl rounded-full border py-2 px-3 md:px-6 backdrop-blur-lg'
          : 'top-0 left-0 right-0 py-5 border-b border-transparent'
      }`}
      style={{
        // ═══ Premium transition: propiedades específicas con spring easing ═══
        backgroundColor: scrolled ? 'var(--theme-surface-glass)' : 'transparent',
        borderColor: scrolled ? 'var(--theme-border)' : 'transparent',
        backdropFilter: reducedMotion ? 'none' : (scrolled ? 'blur(16px) saturate(180%)' : 'blur(0px) saturate(100%)'),
        WebkitBackdropFilter: reducedMotion ? 'none' : (scrolled ? 'blur(16px) saturate(180%)' : 'blur(0px) saturate(100%)'),
        borderRadius: scrolled ? '9999px' : '0px',
        boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.06)' : '0 0px 0px rgba(0,0,0,0)',
        transition: reducedMotion ? 'none' : 'background-color 0.5s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.5s cubic-bezier(0.16, 1, 0.3, 1), backdrop-filter 0.6s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1), padding 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform',
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
            {NAV_ITEMS.map((item, i) => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`group relative px-4 py-2 rounded-full text-sm font-medium tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    active
                      ? 'text-brand-700 dark:text-brand-300'
                      : 'text-[var(--theme-text-secondary)] hover:text-brand-600 dark:hover:text-brand-400'
                  }`}
                  style={{
                    transition: 'color 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    animation: reducedMotion ? 'none' : `nav-item-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${0.05 + i * 0.04}s both`,
                  }}
                  role="menuitem"
                  aria-current={active ? 'page' : undefined}
                  id={`nav-item-${item.id}`}
                >
                  {/* Sliding underline indicator */}
                  <span
                    className="absolute inset-0 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: active ? 'var(--color-brand-50)' : 'transparent',
                      opacity: active ? 0.8 : 0,
                      transform: active ? 'scale(1)' : 'scale(0.92)',
                      transition: 'background-color 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                  {/* Bottom dot indicator — se desliza suavemente */}
                  <span
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full transition-all duration-300"
                    style={{
                      width: active ? '16px' : '0px',
                      height: active ? '2.5px' : '0px',
                      backgroundColor: 'var(--color-brand-500)',
                      transition: 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1), height 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                      opacity: active ? 1 : 0,
                    }}
                  />
                  {/* Hover background — sutil y suave */}
                  <span
                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      backgroundColor: !active ? 'var(--theme-bg-alt)' : 'transparent',
                      transition: 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                  <span className="relative z-10 flex items-center">
                    <Icon className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5 transition-transform duration-200" style={{ transform: active ? 'scale(1.1)' : 'scale(1)' }} aria-hidden="true" />
                    {item.label}
                  </span>
                </button>
              );
            })}

            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="ml-2 p-2 rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 hover:scale-[1.12] hover:shadow-md active:scale-95 transition-all duration-200"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                  cursor: 'pointer',
                }}
                aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
              >
                <span className="block">
                  {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
                </span>
              </button>
            )}
          </div>

          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={handleOpenChange}>
              <SheetTrigger
                className="p-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 hover:scale-105 hover:bg-[var(--theme-bg-alt)] transition-all duration-200"
                style={{ color: 'var(--theme-text-secondary)' }}
                aria-label="Abrir menú"
                id="mobile-menu-toggle"
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[300px] sm:w-[380px] p-0 border-l"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  borderColor: 'var(--theme-border)',
                }}
              >
                <SheetHeader className="px-6 pt-6 pb-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                  <SheetTitle className="font-serif text-xl font-bold" style={{ color: 'var(--theme-text)' }}>
                    Menú
                  </SheetTitle>
                  <SheetDescription className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                    Navegación principal
                  </SheetDescription>
                </SheetHeader>

                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto" aria-label="Navegación móvil">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          // Forzar cierre del Sheet antes de navegar
                          const closeBtn = document.querySelector('[data-slot="sheet-close"]');
                          if (closeBtn instanceof HTMLElement) closeBtn.click();
                          handleNavigate(item.id);
                        }}
                        className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl text-left text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                          currentView === item.id
                            ? 'text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/20'
                            : 'text-[var(--theme-text-secondary)] hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-brand-600 dark:hover:text-brand-400'
                        }`}
                        role="menuitem"
                        aria-current={currentView === item.id ? 'page' : undefined}
                        id={`mobile-nav-item-${item.id}`}
                      >
                        <div className="p-2 rounded-lg" style={{
                          backgroundColor: currentView === item.id ? 'var(--theme-brand-primary)' : 'var(--theme-bg-alt)',
                          color: currentView === item.id ? '#fff' : 'var(--theme-text-secondary)',
                        }}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <span className="flex-1">{item.label}</span>
                      </button>
                    );
                  })}

                  {onToggleTheme && (
                    <button
                      onClick={onToggleTheme}
                      className="w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 mt-4 border"
                      style={{
                        backgroundColor: 'var(--theme-bg-alt)',
                        borderColor: 'var(--theme-border)',
                        color: 'var(--theme-text)',
                      }}
                    >
                      <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--theme-surface)' }}>
                        {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
                      </div>
                      <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
                    </button>
                  )}
                </nav>

                <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg-alt)' }}>
                  <p className="text-[10px] font-mono tracking-wider text-center" style={{ color: 'var(--theme-text-muted)' }}>
                    Maison Rosas &copy; {new Date().getFullYear()}
                  </p>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default memo(Navbar);
