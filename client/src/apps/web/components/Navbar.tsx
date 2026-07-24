import { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

  // ─── Auto-ocultar el nav cuando hay un modal/overlay abierto (Customizer, etc.) ───
  // Desacoplado: observa el body y cualquier portal con z >= 100 o id "customizer-modal".
  useEffect(() => {
    const isOverlay = (el: HTMLElement): boolean => {
      if (el.id === 'customizer-modal') return true;
      const z = Number(el.style?.zIndex || getComputedStyle(el).zIndex || 0);
      return z >= 100;
    };
    const scan = () => {
      const overlayOpen =
        document.body.style.overflow === 'hidden' ||
        !!document.getElementById('customizer-modal') ||
        Array.from(document.body.children).some((c) => {
          if (!(c instanceof HTMLElement)) return false;
          return c.id !== 'root' && c.id !== 'admin-root' && (c.classList?.contains('fixed') || c.classList?.contains('inset-0')) && isOverlay(c);
        });
      setNavHidden((prev) => (prev === overlayOpen ? prev : overlayOpen));
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'], childList: true, subtree: true });
    return () => mo.disconnect();
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

  // ─── iOS 26 Liquid Glass: estilos memoizados ───
  // Se recalculaban en cada render (cada frame de scroll). Ahora solo cambian
  // cuando realmente varían sus inputs (atTop, scrolled, tema). El navbar
  // escuchando scroll dispara setScrolled/setAtTop, que re-render el componente;
  // si las strings idénticas fueran re-creadas React igual las propaga al <nav>
  // forzando layout/style invalidation. Con useMemo el <nav> solo recibe nuevas
  // props cuando los estilos realmente cambiaron.
  const glassStyles = useMemo(() => {
    // ─── iOS 26 Liquid Glass: tinte translúcido mínimamente opaco ───
    // La saturación/brillo la aporta backdrop-filter; aquí solo damos el tinte.
    const glassBg = isDark
      ? atTop
        ? 'linear-gradient(135deg, rgba(28,25,23,0.55), rgba(18,16,14,0.35))'
        : 'linear-gradient(135deg, rgba(28,25,23,0.22), rgba(18,16,14,0.12))'
      : atTop
        ? 'linear-gradient(135deg, rgba(255,255,255,0.40), rgba(255,255,255,0.20))'
        : 'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))';

    // Borde specular dual: línea brillante + halo (refracción del borde del vidrio)
    const glassBorder = isDark
      ? atTop ? '0.5px solid rgba(255,255,255,0.35)' : '0.5px solid rgba(255,255,255,0.22)'
      : atTop ? '0.5px solid rgba(255,255,255,0.75)' : '0.5px solid rgba(255,255,255,0.50)';

    // Sombra interna superior (highlight) + inferior (inner shadow) + drop + glow etéreo
    const glassShadow = atTop
      ? isDark
        ? '0 0 0 0.5px rgba(255,255,255,0.08) inset, 0 10px 40px -10px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.14), inset 0 -1px 2px rgba(0,0,0,0.35)'
        : '0 0 0 0.5px rgba(255,255,255,0.18) inset, 0 10px 40px -10px rgba(0,0,0,0.10), 0 2px 12px rgba(212,163,115,0.08), inset 0 1px 1px rgba(255,255,255,0.55), inset 0 -1px 2px rgba(0,0,0,0.06)'
      : scrolled
        ? isDark
          ? '0 0 0 0.5px rgba(255,255,255,0.06) inset, 0 24px 70px -12px rgba(0,0,0,0.6), 0 12px 40px -10px rgba(212,163,115,0.05), inset 0 1px 1px rgba(255,255,255,0.10), inset 0 -1px 2px rgba(0,0,0,0.4)'
          : '0 0 0 0.5px rgba(255,255,255,0.14) inset, 0 24px 70px -12px rgba(0,0,0,0.15), 0 12px 40px -10px rgba(212,163,115,0.10), inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -1px 2px rgba(0,0,0,0.08)'
        : isDark
          ? '0 0 0 0.5px rgba(255,255,255,0.07) inset, 0 18px 55px -12px rgba(0,0,0,0.5), 0 8px 30px -10px rgba(212,163,115,0.04), inset 0 1px 1px rgba(255,255,255,0.12), inset 0 -1px 2px rgba(0,0,0,0.38)'
          : '0 0 0 0.5px rgba(255,255,255,0.16) inset, 0 18px 55px -12px rgba(0,0,0,0.12), 0 8px 30px -10px rgba(212,163,115,0.09), inset 0 1px 1px rgba(255,255,255,0.50), inset 0 -1px 2px rgba(0,0,0,0.07)';

    // ─── Vidrio físico iOS 26: blur amplio + saturación + brightness ───
    // Mientras más translúcida la capa, más se cuela el color del fondo con saturación extra.
    // Mobile: blur reducido (~14-18px) para rendimiento en GPUs entry-level.
    const blurAmount = isMobile
      ? (scrolled || atTop ? 18 : 14)
      : (scrolled || atTop ? 34 : 28);
    const saturateAmount = isMobile
      ? '165%'
      : `${atTop ? 210 : 200}%`;
    const glassBlurFilter = `blur(${blurAmount}px) saturate(${saturateAmount}) brightness(${isMobile ? 105 : 108}%)`;

    return { glassBg, glassBorder, glassShadow, glassBlurFilter };
  }, [atTop, scrolled, isDark, isMobile]);

  return (
    <>
      {/* ═══ LIQUID GLASS NAV — Apple iOS 26 ═══ */}
      {/* Cuando el menú mobile está abierto, ocultamos el navbar */}
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: -16 }}
        animate={{
          opacity: navHidden ? 0 : 1,
          y: navHidden ? -20 : 0,
          // ─── Centrado del pill flotante: delegado a Framer Motion (x: '-50%') ───
          // Importante: si mezclamos `translate: '-50% 0'` (CSS) con el `transform`
          // que Framer Motion escribe para animar `y`, hay una carrera que hace que
          // al recargar/scroll rápido el nav "salte" hacia la izquierda (se pierde
          // el translateX(-50%) de centrado). Centralizar aquí evita el conflicto.
          x: atTop ? '0%' : '-50%',
          // ─── Posición del pill flotante ───
          // Mobile y desktop comparten el mismo mecanismo (spring) para que el nav
          // reaccione suavemente al pasar de "barra anclada al tope" (atTop=true) a
          // "pill centrado flotante" (atTop=false). Antes desktop usaba transiciones
          // CSS sobre `top/left/width/translate` — eso peleaba con Framer Motion al
          // recargar+scroll rápido y producía saltos horizontales.
          ...(isMobile ? {
            top: atTop ? 0 : 16,
            left: atTop ? 0 : '50%',
            width: atTop ? '100%' : 'min(calc(100% - 32px), 640px)',
          } : {
            top: atTop ? 0 : 20,
            left: atTop ? '0%' : '50%',
            width: atTop ? '100%' : 'min(1400px, calc(100vw - 40px))',
          }),
        }}
        transition={reducedMotion ? { duration: 0 } : {
          type: 'spring',
          // Spring más amortiguado en mobile para evitar rebote visual del pill
          // al cruzar el breakpoint del scroll (atTop ⇄ flotante) en pantallas
          // chicas con inercia táctil activa.
          stiffness: 400,
          damping: isMobile ? 24 : 20,
          mass: 0.6,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'fixed',
          zIndex: 90,
          pointerEvents: navHidden ? 'none' : 'auto',
        }}
        whileHover={reducedMotion || atTop ? undefined : { y: -2 }}
      >
        <nav
          ref={navRef}
          className="group"
          style={{
            width: '100%',
            borderRadius: atTop ? '0px' : '999px',
            overflow: 'hidden',
            position: 'relative',

            // ─── Vidrio físico iOS 26: blur/saturación/brightness memoizados ───
            backdropFilter: glassStyles.glassBlurFilter,
            WebkitBackdropFilter: glassStyles.glassBlurFilter,
            background: glassStyles.glassBg,
            border: glassStyles.glassBorder,
            boxShadow: glassStyles.glassShadow,

            transition: reducedMotion
              ? 'none'
              : 'all 0.2s cubic-bezier(.22,.61,.36,1), backdrop-filter 0.2s cubic-bezier(.22,.61,.36,1), box-shadow 0.2s cubic-bezier(.22,.61,.36,1)',

            willChange: isMobile ? 'transform' : 'transform, backdrop-filter',
          }}
          role="navigation"
          aria-label="Navegación principal"
        >
          {/* ─── Glass Layer: gradiente de superficie pulida (efecto lente superior) ─── */}
          {!isMobile && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isDark
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 45%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.04) 45%, transparent 70%)',
                borderRadius: 'inherit',
              }}
              aria-hidden="true"
            />
          )}

          {/* ─── Specular Highlight: sigue al cursor (illumination touch-point de iOS 26) ─── */}
          {!isMobile && (
            <div
              className="absolute pointer-events-none"
              style={{
                top: '-100%',
                left: '-10%',
                width: '70%',
                height: '300%',
                background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,${isHovering ? 0.45 : 0.22}) 0%, rgba(255,255,255,0.06) 35%, transparent 65%)`,
                filter: 'blur(45px)',
                borderRadius: 'inherit',
                mixBlendMode: isDark ? 'screen' : 'soft-light',
                transition: reducedMotion ? 'none' : isHovering ? 'none' : 'opacity 0.3s ease',
                opacity: isHovering ? 1 : 0.55,
                willChange: 'transform, opacity',
              }}
              aria-hidden="true"
            />
          )}

          {/* ─── Edge Specular: borde brillante tipo refracción del vidrio (solo desktop) ─── */}
          {!isMobile && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 22%, transparent 78%, rgba(255,255,255,0.18) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, transparent 22%, transparent 78%, rgba(255,255,255,0.45) 100%)',
                borderRadius: 'inherit',
                padding: '0.5px',
                WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
              aria-hidden="true"
            />
          )}

          {/* ─── Sheen sutil: reflejo diagonal del vidrio (solo desktop) ─── */}
          {!isMobile && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.04) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.30) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.12) 100%)',
                borderRadius: 'inherit',
                mask: 'linear-gradient(to bottom, black 0%, black 35%, transparent 55%, transparent 100%)',
                WebkitMask: 'linear-gradient(to bottom, black 0%, black 35%, transparent 55%, transparent 100%)',
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
