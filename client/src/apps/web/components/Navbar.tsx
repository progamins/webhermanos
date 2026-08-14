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
  // Ref espejo de `isOpen` para leerla dentro del scroll listener y del
  // MutationObserver (ambos con deps [] estables) sin re-suscribirlos.
  const isOpenRef = useRef(false);
  // Ancho del viewport en px: la anchura del pill se anima numéricamente
  // (Framer no interpola entre '100%' y 'min(calc(...))' → producía saltos).
  const [vw, setVw] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  // Throttle del mousemove con rAF: el evento dispara ~60-120 veces/seg y cada
  // setMousePos re-renderiza el navbar. Con rAF solo actualizamos 1 vez por frame.
  const mouseMoveRafRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (mouseMoveRafRef.current !== null) cancelAnimationFrame(mouseMoveRafRef.current);
  }, []);

  useEffect(() => {
    // ─── Forzar scroll al tope al montar el navbar ───
    window.scrollTo(0, 0);
    setScrolled(false);
    setAtTop(true);

    let ticking = false;
    const handleScroll = () => {
      // Con el menú móvil abierto el navbar está oculto: ignoramos scroll para
      // que no actualice su estado visual (ni reactive el estilo "scrolled").
      if (isOpenRef.current) return;
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          setScrolled(y > 50);
          // Histéresis en el umbral: al subir, el pill vuelve a barra solo al
          // llegar muy arriba (y < 10); al bajar, la barra se despega solo al
          // superar y > 70. Sin esto, un scroll lento alrededor del umbral
          // alternaba los estados y el navbar temblaba.
          if (y < 10) setAtTop(true);
          else if (y > 70) setAtTop(false);
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

  // Mantener `vw` fresco al rotar/redimensionar (throttled con rAF).
  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setVw(window.innerWidth));
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
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
      // El menú móvil (Sheet) gestiona su propio ocultado: mientras esté abierto
      // forzamos navHidden y no dejamos que el scan lo reactive. Base UI bloquea
      // el scroll con overflow en longhand (overflowY/overflowX sobre html/body),
      // que este scan no detecta — por eso el navbar volvía a flotar sobre el menú.
      if (isOpenRef.current) {
        setNavHidden(true);
        return;
      }
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
  // Throttled con rAF: máximo 1 actualización por frame, nunca bloquea el hilo.
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!navRef.current || reducedMotion) return;
    if (mouseMoveRafRef.current !== null) return; // ya hay un frame pendiente
    const cx = e.clientX;
    const cy = e.clientY;
    mouseMoveRafRef.current = requestAnimationFrame(() => {
      mouseMoveRafRef.current = null;
      if (!navRef.current) return;
      const rect = navRef.current.getBoundingClientRect();
      setMousePos({
        x: ((cx - rect.left) / rect.width) * 100,
        y: ((cy - rect.top) / rect.height) * 100,
      });
    });
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
    isOpenRef.current = open;
    setIsOpen(open);
    if (open) {
      // Menú abierto: el navbar queda fuera de juego — invisible, sin interacción
      // y con z-index por debajo del overlay del sheet (ver style del motion.div).
      setNavHidden(true);
    } else {
      // Al cerrar esperamos a que termine la animación de salida del sheet (200ms)
      // antes de restaurar scroll y navbar a su estado anterior.
      setTimeout(() => {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        setNavHidden(false);
        // Re-sincronizar el estado de scroll: en iOS el fondo puede quedar
        // desplazado a pesar del bloqueo mientras el menú estuvo abierto.
        const y = window.scrollY;
        setScrolled(y > 50);
        setAtTop(y < 10);
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
  // Texto a opacidad plena y colores sólidos: el nav flota sobre secciones
  // de cualquier tono (crema, cacao oscuro, fotos), así que la legibilidad
  // no puede depender de semitransparencias que se funden con el fondo.
  const textColor = isDark ? '#F7EDDA' : '#2B1A12';
  const textMuted = isDark ? '#C9B29A' : '#6E5345';

  // ─── iOS 26 Liquid Glass: estilos memoizados ───
  // Se recalculaban en cada render (cada frame de scroll). Ahora solo cambian
  // cuando realmente varían sus inputs (atTop, scrolled, tema). El navbar
  // escuchando scroll dispara setScrolled/setAtTop, que re-render el componente;
  // si las strings idénticas fueran re-creadas React igual las propaga al <nav>
  // forzando layout/style invalidation. Con useMemo el <nav> solo recibe nuevas
  // props cuando los estilos realmente cambiaron.
  const glassStyles = useMemo(() => {
    // ─── iOS 26 Liquid Glass: dos estados, una misma identidad ───
    // TOP (atTop): barra integrada al hero. Fondo casi transparente con tinte
    // crema que sigue el gradiente del hero (beige → crema), blur MUY sutil y
    // sin sombra de separación: el navbar pertenece a la página, no flota.
    // SCROLL (pill flotante): vidrio casi opaco, blur amplio y elevación suave;
    // el efecto actual que ya funciona se conserva intacto.
    const glassBg = isDark
      ? atTop
        ? 'linear-gradient(180deg, rgba(42,26,18,0.42) 0%, rgba(32,19,13,0.20) 100%)'
        : 'linear-gradient(135deg, rgba(32,19,13,0.84), rgba(24,15,10,0.76))'
      : atTop
        ? 'linear-gradient(180deg, rgba(245,230,200,0.32) 0%, rgba(251,243,226,0.10) 100%)'
        : 'linear-gradient(135deg, rgba(255,253,245,0.90), rgba(255,251,242,0.84))';

    // Borde specular: en TOP casi invisible (solo un catch-light sutil); en el
    // pill, la línea brillante única que define el borde del vidrio.
    const glassBorder = isDark
      ? atTop ? '0.5px solid rgba(255,255,255,0.10)' : '0.5px solid rgba(255,255,255,0.18)'
      : atTop ? '0.5px solid rgba(255,255,255,0.28)' : '0.5px solid rgba(255,255,255,0.55)';

    // Sombra limpia: en TOP sin drop shadow (eso lo separaría del hero), solo
    // un highlight interior sutil. En el pill: una elevación suave + highlight.
    const glassShadow = atTop
      ? isDark
        ? 'inset 0 1px 1px rgba(255,255,255,0.06)'
        : 'inset 0 1px 1px rgba(255,255,255,0.30)'
      : isDark
        ? 'inset 0 1px 1px rgba(255,255,255,0.12), 0 18px 45px -14px rgba(0,0,0,0.55)'
        : 'inset 0 1px 1px rgba(255,255,255,0.50), 0 18px 45px -14px rgba(0,0,0,0.16)';

    // ─── Vidrio físico iOS 26 ───
    // TOP: blur/saturación/brightness mínimos — el hero ya aporta el color.
    // SCROLL: blur amplio + saturación moderada para el pill flotante.
    // Mobile: blur reducido (~8-18px) para rendimiento en GPUs entry-level.
    const blurAmount = isMobile
      ? (atTop ? 8 : (scrolled ? 18 : 14))
      : (atTop ? 10 : (scrolled ? 32 : 26));
    const saturateAmount = isMobile
      ? (atTop ? '105%' : '150%')
      : (atTop ? '110%' : '165%');
    const glassBlurFilter = `blur(${blurAmount}px) saturate(${saturateAmount}) brightness(${atTop ? 100 : (isMobile ? 105 : 106)}%)`;

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
          // ─── Centrado permanente del pill: left: '50%' + x: '-50%' fijos ───
          // 1) El centrado vive en Framer Motion (nunca en CSS `translate`): si
          //    mezcláramos translateX(-50%) CSS con el transform que Framer escribe
          //    para animar `y`, hay una carrera que al recargar/scroll rápido hace
          //    que el nav "salte" a la izquierda. 2) Antes se animaban left y x
          //    junto con width, y a mitad de transición el pill quedaba descentrado
          //    (el translateX depende del ancho propio) → sacudida lateral. Con
          //    left/x fijos solo animan width y top, siempre centrado.
          x: '-50%',
          // ─── Posición del pill flotante ───
          // Mobile y desktop comparten el mismo mecanismo (spring) para que el nav
          // reaccione suavemente al pasar de "barra anclada al tope" (atTop=true) a
          // "pill centrado flotante" (atTop=false).
          ...(isMobile ? {
            top: atTop ? 0 : 16,
            left: '50%',
            width: atTop ? vw : Math.min(vw - 32, 640),
          } : {
            top: atTop ? 0 : 20,
            left: '50%',
            width: atTop ? vw : Math.min(1400, vw - 40),
          }),
        }}
        transition={reducedMotion ? { duration: 0 } : {
          type: 'spring',
          // Spring suave sin rebote: amortiguamiento cercano al crítico.
          // El anterior (stiffness 400 / damping 20-24 / mass 0.6) oscilaba
          // visiblemente al cruzar el umbral y en mobile se percibía como
          // temblor al subir despacio.
          stiffness: 320,
          damping: isMobile ? 36 : 30,
          mass: 0.8,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'fixed',
          // Mientras el navbar está oculto (menú móvil abierto o en animación de
          // salida) baja por debajo del overlay/popup del sheet (z-50): así jamás
          // puede quedar flotando sobre el menú, ni siquiera a mitad de transición.
          zIndex: navHidden ? 40 : 90,
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
                  ? `linear-gradient(180deg, rgba(255,255,255,${atTop ? 0.03 : 0.06}) 0%, transparent 45%)`
                  : `linear-gradient(180deg, rgba(255,255,255,${atTop ? 0.10 : 0.24}) 0%, rgba(255,255,255,${atTop ? 0.02 : 0.03}) 45%, transparent 70%)`,
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
                left: '-12%',
                width: '62%',
                height: '260%',
                background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,${isHovering ? 0.28 : 0.13}) 0%, rgba(255,255,255,0.05) 35%, transparent 65%)`,
                filter: 'blur(32px)',
                borderRadius: 'inherit',
                mixBlendMode: isDark ? 'screen' : 'soft-light',
                transition: reducedMotion ? 'none' : isHovering ? 'none' : 'opacity 0.3s ease',
                opacity: isHovering ? 1 : 0.45,
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
                  ? `linear-gradient(135deg, rgba(255,255,255,${atTop ? 0.05 : 0.16}) 0%, transparent 22%, transparent 78%, rgba(255,255,255,${atTop ? 0.04 : 0.13}) 100%)`
                  : `linear-gradient(135deg, rgba(255,255,255,${atTop ? 0.14 : 0.45}) 0%, transparent 22%, transparent 78%, rgba(255,255,255,${atTop ? 0.10 : 0.35}) 100%)`,
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
                  ? `linear-gradient(135deg, rgba(255,255,255,${atTop ? 0.015 : 0.04}) 0%, transparent 40%, transparent 60%, rgba(255,255,255,${atTop ? 0.01 : 0.03}) 100%)`
                  : `linear-gradient(135deg, rgba(255,255,255,${atTop ? 0.08 : 0.22}) 0%, transparent 40%, transparent 60%, rgba(255,255,255,${atTop ? 0.04 : 0.10}) 100%)`,
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
              <div
                className="h-10 w-10 rounded-full overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300"
                style={{
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.3)'}`,
                  // En dark mode el logo suele ser oscuro y se pierde contra el
                  // vidrio: se monta sobre un disco crema y se contiene el logo,
                  // así siempre queda visible sin distorsionar sus colores.
                  ...(isDark
                    ? {
                        background: 'radial-gradient(circle at 35% 30%, #FFFDF6 0%, #F4EADA 55%, #E9D8C2 100%)',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.7)',
                        padding: 5,
                      }
                    : {}),
                }}
              >
                <CachedImage
                  src={logoUrl}
                  width={100}
                  alt="Maison Rosas"
                  wrapperClassName="w-full h-full"
                  className={`w-full h-full ${isDark ? 'object-contain' : 'object-cover'}`}
                  priority
                />
              </div>
            ) : (
              <div className="p-2 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', color: textColor }}>
                <Cake className="h-5 w-5" aria-hidden="true" />
              </div>
            )}
            <div>
              <span className="text-base font-bold tracking-tight block leading-none" style={{ color: textColor }}>Maison Rosas</span>
              <span className="text-[8px] tracking-[0.2em] uppercase block mt-0.5 font-medium" style={{ color: textMuted }}>Kekes Artesanales Peruanos</span>
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
                    // Activo = acento guinda (color con significado): texto y píldora
                    // en guinda para distinguirlo de un vistazo del resto de ítems.
                    color: active ? (isDark ? '#E2623F' : '#A93624') : textMuted,
                    background: active
                      ? (isDark ? 'rgba(226,98,63,0.16)' : 'rgba(199,68,46,0.08)')
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
