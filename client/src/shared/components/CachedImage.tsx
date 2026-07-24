import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { imageCache } from '../utils/imageCache';
import { imageMemoryCache } from '../utils/imageMemoryCache';
import { optimizeImageUrl, getLocalImageUrl } from '../utils/images';
import { ImageOff } from 'lucide-react';

interface CachedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onLoad' | 'onError'> {
  /** URL de la imagen a cargar */
  src: string;
  /** Ancho para optimización (se pasa a optimizeImageUrl). En mobile se reduce automáticamente. */
  width?: number;
  /** Alto explícito para evitar Layout Shift (CLS) */
  height?: number;
  /** Si es true: loading=eager, fetchPriority=high, decoding=async */
  priority?: boolean;
  /** Atributo sizes para imágenes responsive: "(max-width: 768px) 90vw, 600px" etc.
   *  Si se provee, se genera un srcSet automático con 3 resoluciones (width, width*2, 320px). */
  sizes?: string;
  /** Callback cuando la imagen termina de cargar */
  onLoad?: () => void;
  /** Callback cuando hay error */
  onError?: () => void;
  /** Clase extra para el wrapper */
  wrapperClassName?: string;
}

function CachedImage({
  src,
  width = 600,
  height,
  priority = false,
  sizes,
  onLoad,
  onError,
  wrapperClassName = '',
  className = '',
  alt = '',
  style,
  ...imgProps
}: CachedImageProps) {
  // ═══════════════════════════════════════════
  // TODOS LOS HOOKS AL INICIO — antes de cualquier return condicional
  // (React Rules of Hooks: mismo orden en cada render)
  // ═══════════════════════════════════════════

  const [isMobileWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const effectiveWidth = priority && isMobileWidth ? Math.min(width, 320) : width;

  // Convertir URL externa → local (proxy) → optimizada con el ancho efectivo
  const localUrl = getLocalImageUrl(src);
  const directUrl = optimizeImageUrl(localUrl, effectiveWidth);

  // srcSet responsive — 3 resoluciones: effectiveWidth, 2x, y 320px (mobile mínimo)
  const srcSet = useMemo(() => {
    if (!sizes || !src) return undefined;
    const resolutions = [
      optimizeImageUrl(localUrl, Math.min(effectiveWidth, 320)),
      optimizeImageUrl(localUrl, effectiveWidth),
      optimizeImageUrl(localUrl, effectiveWidth * 2),
    ];
    const widths: (string | null)[] = ['320w', effectiveWidth > 320 ? `${effectiveWidth}w` : null, `${effectiveWidth * 2}w`];
    return resolutions
      .map((url, i) => widths[i] ? `${url} ${widths[i]}` : null)
      .filter(Boolean)
      .join(', ');
  }, [localUrl, effectiveWidth, sizes, src]);

  // Estado de la imagen
  const [cachedSrc, setCachedSrc] = useState<string>(directUrl);
  const [error, setError] = useState(false);
  const [loadOrigin, setLoadOrigin] = useState<'memory' | 'network' | ''>('');
  const mountedRef = useRef(true);

  // Verificar en background si está en MemoryCache o IndexedDB
  useEffect(() => {
    mountedRef.current = true;
    setError(false);

    const localSrc = getLocalImageUrl(src);
    const optimized = optimizeImageUrl(localSrc, effectiveWidth);
    setCachedSrc(optimized);

    // 1. MemoryCache (HTMLImageElement ya cargado) → reusar URL directa
    if (imageMemoryCache.has(optimized)) {
      setLoadOrigin('memory');
      if (mountedRef.current) setCachedSrc(optimized);
      return;
    }

    // 2. MemoryCache (base64) → swap instantáneo
    if (imageCache.has(optimized)) {
      imageCache.get(optimized).then((b64) => {
        if (mountedRef.current && b64 && b64 !== optimized) {
          setCachedSrc(b64);
          setLoadOrigin('memory');
        }
      });
    } else {
      // 3. Descargar en background para próxima vez
      imageCache.get(optimized).catch(() => {});
    }

    return () => { mountedRef.current = false; };
  }, [src, effectiveWidth]);

  // Callbacks estables con useCallback
  const handleImgError = useCallback(() => {
    if (!mountedRef.current) return;
    setError(true);
    onError?.();
  }, [onError]);

  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!mountedRef.current) return;
    const img = e.currentTarget;
    if (img.src) imageMemoryCache.preload(img.src);
    onLoad?.();
  }, [onLoad]);

  // ═══════════════════════════════════════════
  // RENDER — condicionales sin hooks
  // ═══════════════════════════════════════════

  // Sin src → espacio vacío, sin layout shift si hay height
  if (!src) {
    return (
      <div
        className={`relative overflow-hidden bg-zinc-100/30 dark:bg-zinc-900/30 ${wrapperClassName || className}`}
        style={{
          aspectRatio: height ? undefined : (style?.aspectRatio || '4/3'),
          width: style?.width,
          height: height || style?.height,
          ...style,
        }}
      />
    );
  }

  // Estado de error
  if (error) {
    return (
      <div
        className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center justify-center gap-2 ${wrapperClassName || className}`}
        style={{
          aspectRatio: height ? undefined : (style?.aspectRatio || '4/3'),
          width: style?.width,
          height: height || style?.height,
          ...style,
        }}
      >
        <ImageOff className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
        <span className="text-[9px] font-mono tracking-widest text-zinc-300 dark:text-zinc-600 uppercase">
          Sin imagen
        </span>
      </div>
    );
  }

  // Nunca renderizar <img src=""> — si cachedSrc está vacío mostramos placeholder
  // (ocurre durante la transición: src pasa de "" a URL real pero cachedSrc aún es "").
  if (!cachedSrc) {
    return (
      <div
        className={`relative overflow-hidden rounded-xl ${wrapperClassName || className}`}
        style={{
          aspectRatio: height ? undefined : (style?.aspectRatio || '4/3'),
          width: style?.width,
          height: height || style?.height,
          ...style,
        }}
      />
    );
  }

  // ─── Render: imagen con carga inmediata ───
  return (
    <img
      src={cachedSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={effectiveWidth}
      height={height}
      className={className}
      style={style}
      onLoad={handleImgLoad}
      onError={handleImgError}
      referrerPolicy="no-referrer"
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'async' : 'async'}
      fetchPriority={priority ? 'high' : undefined}
      {...imgProps}
    />
  );
}

// React.memo: evitar re-renders si las props no cambian
export default memo(CachedImage, (prev, next) => {
  return prev.src === next.src
    && prev.priority === next.priority
    && prev.width === next.width
    && prev.className === next.className
    && prev.alt === next.alt
    && prev.sizes === next.sizes;
});
