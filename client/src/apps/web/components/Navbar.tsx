import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
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
  const [atTop, setAtTop] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const navRef = useRef<HTMLDivElement>(null);
  const sheetCloseLockRef = useRef(false);

  useEffect(() => {
    // ─── Forzar scroll al tope al montar el navbar ───
    window.scrollTo(0, 0);
    setScrolled(false);
    setAtTop(true);

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          setScrolled(y > 50);
          setAtTop(y < 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  // ─── Mouse tracking para el highlight especular (Apple touch-point illumination) ───
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!navRef.current || reducedMotion) return;
    const rect = navRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  }, [reducedMotion]);

  const handleMouseEnter = useCallback(() => {
    if (!reducedMotion) setIsHovering(true);
  }, [reducedMotion]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setMousePos({ x: 50, y: 50 });
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (sheetCloseLockRef.current && !open) return;
    setIsOpen(open);
    setNavHidden(open);
    if (!open) {
      setTimeout(() => {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }, 200);
    }
  }, []);

  const handleNavigate = useCallback(
    (viewId: string) => {
      sheetCloseLockRef.current = true;
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      setIsOpen(false);
      setTimeout(() => { sheetCloseLockRef.current = false; }, 200);

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

  const isDark = theme === 'dark';
  const textColor = isDark ? '#f0ede8' : '#3d2a25';
  const textMuted = isDark ? 'rgba(240,237,232,0.7)' : 'rgba(61,42,37,0.7)';
  const glassBg = isDark
    ? atTop
      ? 'linear-gradient(135deg, rgba(25,23,21,0.85), rgba(20,18,16,0.75))'
      : 'linear-gradient(135deg, rgba(30,28,26,0.35), rgba(20,18,16,0.20))'
    : atTop
      ? 'linear-gradient(135deg, rgba(255,255,255,0.70), rgba(255,255,255,0.50))'
      : 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))';
  const glassBorder = isDark
    ? atTop ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.10)'
    : atTop ? '1px solid rgba(255,255,255,0.40)' : '1px solid rgba(255,255,255,0.35)';
  const glassShadow = atTop
    ? isDark
      ? '0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)'
      : '0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)'
    : scrolled
      ? isDark
        ? '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.08), inset 0 -1px 1px rgba(0,0,0,0.2)'
        : '0 24px 60px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 1px rgba(255,255,255,0.08)'
      : isDark
        ? '0 20px 50px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(0,0,0,0.15)'
        : '0 20px 50px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.7), inset 0 -1px 1px rgba(255,255,255,0.12)';

  return (
    <>
      {/* ═══ LIQUID GLASS NAV — Apple iOS 26 ═══ */}
      {/* Cuando el menú mobile está abierto, ocultamos el navbar */}
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: -16 }}
        animate={{
          opacity: navHidden ? 0 : 1,
          y: navHidden ? -20 : 0,
          // ─── En mobile: animamos posición con spring rápido ───
          ...(isMobile ? {
            top: atTop ? 0 : 20,
            left: atTop ? 0 : '50%',
            width: atTop ? '100%' : 'min(1400px, calc(100vw - 40px))',
          } : {}),
        }}
        transition={reducedMotion ? { duration: 0 } : {
          type: 'spring',
          stiffness: isMobile ? 400 : 400,
          damping: isMobile ? 22 : 20,
          mass: isMobile ? 0.6 : 0.6,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'fixed',
          // ─── Desktop: CSS transitions gestionan la posición ───
          top: isMobile ? undefined : (atTop ? '0px' : '20px'),
          left: isMobile ? undefined : (atTop ? '0px' : '50%'),
          translate: atTop ? '0 0' : '-50% 0',
          width: isMobile ? undefined : (atTop ? '100%' : 'min(1400px, calc(100vw - 40px))'),
          zIndex: 9999,
          transform: isHovering && !reducedMotion && !atTop ? 'translateY(-2px)' : 'translateY(0)',
          pointerEvents: navHidden ? 'none' : 'auto',
          // ─── Desktop: CSS transitions (mobile usa las de Framer Motion) ───
          transition: isMobile
            ? (reducedMotion ? 'none' : 'translate 0.3s cubic-bezier(.22,.61,.36,1), transform 0.2s cubic-bezier(.22,.61,.36,1), pointer-events 0s 0.2s')
            : (reducedMotion
              ? 'none'
              : 'top 0.2s cubic-bezier(.22,.61,.36,1), left 0.2s cubic-bezier(.22,.61,.36,1), width 0.2s cubic-bezier(.22,.61,.36,1), translate 0.2s cubic-bezier(.22,.61,.36,1), transform 0.2s cubic-bezier(.22,.61,.36,1), pointer-events 0s 0.2s'),
        }}
      >
        <nav
          ref={navRef}
          className="group"
          style={{
            width: '100%',
            borderRadius: atTop ? '0px' : '999px',
            overflow: 'hidden',
            position: 'relative',

            // ─── Vidrio físico (mobile: blur reducido para rendimiento) ───
            backdropFilter: isMobile
              ? `blur(${scrolled || atTop ? 15 : 10}px) saturate(110%) brightness(105%)`
              : `blur(${scrolled || atTop ? 40 : 30}px) saturate(200%) brightness(108%)`,
            WebkitBackdropFilter: isMobile
              ? `blur(${scrolled || atTop ? 15 : 10}px) saturate(110%) brightness(105%)`
              : `blur(${scrolled || atTop ? 40 : 30}px) saturate(200%) brightness(108%)`,
            background: glassBg,
            border: glassBorder,
            boxShadow: glassShadow,

            transition: reducedMotion
              ? 'none'
              : 'all 0.2s cubic-bezier(.22,.61,.36,1), backdrop-filter 0.2s cubic-bezier(.22,.61,.36,1), box-shadow 0.2s cubic-bezier(.22,.61,.36,1)',

            willChange: isMobile ? 'transform' : 'transform, backdrop-filter',
          }}
          role="navigation"
          aria-label="Navegación principal"
        >
          {/* ─── Glass Layer: gradiente de superficie pulida (solo desktop) ─── */}
          {!isMobile && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isDark
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.06), transparent 60%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.20), transparent 60%)',
                borderRadius: 'inherit',
              }}
              aria-hidden="true"
            />
          )}

          {/* ─── Specular Highlight: sigue al cursor (solo desktop) ─── */}
          {!isMobile && (
            <div
              className="absolute pointer-events-none"
              style={{
                top: '-100%',
                left: '-10%',
                width: '60%',
                height: '300%',
                background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,${isHovering ? 0.40 : 0.20}), transparent 60%)`,
                filter: 'blur(50px)',
                borderRadius: 'inherit',
                transition: reducedMotion ? 'none' : isHovering ? 'none' : 'background 0.3s ease',
                opacity: isHovering ? 1 : 0.6,
                willChange: 'transform, opacity',
              }}
              aria-hidden="true"
            />
          )}

          {/* ─── Sheen sutil: reflejo de borde (solo desktop) ─── */}
          {!isMobile && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%, rgba(255,255,255,0.10) 100%)',
                borderRadius: 'inherit',
                mask: 'linear-gradient(to bottom, black 0%, black 40%, transparent 60%, transparent 100%)',
                WebkitMask: 'linear-gradient(to bottom, black 0%, black 40%, transparent 60%, transparent 100%)',
              }}
              aria-hidden="true"
            />
          )}

          {/* ─── Contenido ─── */}
          <div
            className="relative flex items-center justify-between"
            style={{
              padding: scrolled ? '10px 22px' : '14px 26px',
              transition: reducedMotion ? 'none' : 'padding 0.2s cubic-bezier(.22,.61,.36,1)',
            }}
          >
          {/* ─── Logo ─── */}
          <button
            onClick={() => handleNavigate('inicio')}
            className="flex items-center space-x-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg"
            aria-label="Ir al inicio"
          >
            {logoUrl ? (
              <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300" style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)'}` }}>
                <CachedImage src={logoUrl} width={100} alt="Maison Rosas" wrapperClassName="w-full h-full" className="w-full h-full object-cover" priority />
              </div>
            ) : (
              <div className="p-2 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', color: textColor }}>
                <Cake className="h-5 w-5" aria-hidden="true" />
              </div>
            )}
            <div>
              <span className="text-base font-bold tracking-tight block leading-none" style={{ color: textColor }}>Maison Rosas</span>
              <span className="text-[8px] tracking-[0.2em] uppercase block mt-0.5 font-medium" style={{ color: textMuted }}>Alta Repostería Artesanal</span>
            </div>
          </button>

          {/* ─── Desktop ─── */}
          <div className="hidden md:flex items-center space-x-1" role="menubar">
            {NAV_ITEMS.map((item, i) => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  initial={reducedMotion ? undefined : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reducedMotion ? { duration: 0 } : {
                    type: 'spring', stiffness: 400, damping: 20, delay: 0.02 + i * 0.015,
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative px-3 py-1.5 rounded-full text-sm font-medium tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 transition-all duration-200"
                  style={{
                    color: active ? textColor : textMuted,
                    background: active
                      ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.25)')
                      : 'transparent',
                    backdropFilter: active ? 'blur(4px)' : 'none',
                  }}
                  role="menuitem"
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{item.label}</span>
                  </span>
                </motion.button>
              );
            })}

            {onToggleTheme && (
              <motion.button
                onClick={onToggleTheme}
                initial={reducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={reducedMotion ? { duration: 0 } : {
                  type: 'spring', stiffness: 400, damping: 20, delay: 0.15,
                }}
                whileHover={{ scale: 1.12, rotate: theme === 'dark' ? 90 : -90 }}
                whileTap={{ scale: 0.9 }}
                className="ml-2 p-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(4px)',
                  color: textColor,
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                }}
                aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
              </motion.button>
            )}
          </div>

          {/* ─── Mobile ─── */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={handleOpenChange}>
              <SheetTrigger
                className="p-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-all duration-200"
                style={{ color: textColor }}
                aria-label="Abrir menú"
                id="mobile-menu-toggle"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
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
        </div>{/* ─── fin content ─── */}
      </nav>
      </motion.div>
    </>
  );
}

export default memo(Navbar);
