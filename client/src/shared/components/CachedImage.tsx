import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { imageCache } from '../utils/imageCache';
import { imageMemoryCache } from '../utils/imageMemoryCache';
import { optimizeImageUrl, getLocalImageUrl } from '../utils/images';
import { ImageOff } from 'lucide-react';

interface CachedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onLoad' | 'onError'> {
  /** URL de la imagen a cargar */
  src: string;
  /** Ancho para optimización (se pasa a optimizeImageUrl) */
  width?: number;
  /** Alto explícito para evitar Layout Shift (CLS) */
  height?: number;
  /** Si es true: loading=eager, fetchPriority=high, decoding=async */
  priority?: boolean;
  /** Callback cuando la imagen termina de cargar */
  onLoad?: () => void;
  /** Callback cuando hay error */
  onError?: () => void;
  /** Clase extra para el wrapper */
  wrapperClassName?: string;
  /** Mostrar placeholder vacío mientras carga */
  showPlaceholder?: boolean;
}

function CachedImage({
  src,
  width = 600,
  height,
  priority = false,
  onLoad,
  onError,
  wrapperClassName = '',
  showPlaceholder = false,
  className = '',
  alt = '',
  style,
  ...imgProps
}: CachedImageProps) {
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

  // Convertir URL externa → local (proxy) → optimizada
  const localUrl = getLocalImageUrl(src);
  const directUrl = optimizeImageUrl(localUrl, width);

  // Estado: arranca con la URL directa (INMEDIATAMENTE, sin esperar)
  const [cachedSrc, setCachedSrc] = useState<string>(directUrl);
  const [error, setError] = useState(false);
  const [loadOrigin, setLoadOrigin] = useState<'memory' | 'network' | ''>('');
  const mountedRef = useRef(true);

  // Verificar en background si está en MemoryCache o IndexedDB
  useEffect(() => {
    mountedRef.current = true;
    setError(false);

    const localSrc = getLocalImageUrl(src);
    const optimized = optimizeImageUrl(localSrc, width);
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
  }, [src, width]);

  // Callbacks estables con useCallback
  const handleImgError = useCallback(() => {
    if (!mountedRef.current) return;
    setError(true);
    onError?.();
  }, [onError]);

  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!mountedRef.current) return;
    // Registrar en MemoryCache para reuso instantáneo en misma sesión
    const img = e.currentTarget;
    if (img.src) imageMemoryCache.preload(img.src);
    onLoad?.();
  }, [onLoad]);

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

  // Placeholder solo cuando se pide explícitamente
  if (showPlaceholder && !cachedSrc) {
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
      alt={alt}
      width={width}
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
    && prev.alt === next.alt;
});
