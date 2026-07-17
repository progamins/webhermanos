import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { imageCache } from '../utils/imageCache';
import { optimizeImageUrl } from '../utils/images';
import { ImageOff } from 'lucide-react';

interface CachedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onLoad' | 'onError'> {
  /** URL de la imagen a cargar */
  src: string;
  /** Ancho para optimización (se pasa a optimizeImageUrl) */
  width?: number;
  /** Si es true, usa fetchPriority high (para LCP hero images) */
  priority?: boolean;
  /** Callback cuando la imagen termina de cargar */
  onLoad?: () => void;
  /** Callback cuando hay error */
  onError?: () => void;
  /** Clase extra para el contenedor del placeholder */
  wrapperClassName?: string;
  /** Tamaño del spinner en px */
  spinnerSize?: number;
  /** Mostrar placeholder/spinner mientras carga (solo para imágenes no críticas) */
  showPlaceholder?: boolean;
}

export default function CachedImage({
  src,
  width = 600,
  priority = false,
  onLoad,
  onError,
  wrapperClassName = '',
  spinnerSize = 20,
  showPlaceholder = false,
  className = '',
  alt = '',
  style,
  ...imgProps
}: CachedImageProps) {
  const directUrl = optimizeImageUrl(src, width);

  // Estado inicial: usar la URL directa INMEDIATAMENTE (ni un ms de espera)
  const [cachedSrc, setCachedSrc] = useState<string>(directUrl);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // En background, ver si tenemos base64 en memoria caché (instantáneo)
  // o disparar la descarga/conversión para futuras visitas
  useEffect(() => {
    mountedRef.current = true;
    setError(false);

    // Siempre arrancar con la URL directa
    const optimized = optimizeImageUrl(src, width);
    setCachedSrc(optimized);

    // Ver si ya está en memoria caché → swap instantáneo a base64
    if (imageCache.has(optimized)) {
      imageCache.get(optimized).then((b64) => {
        if (mountedRef.current && b64 && b64 !== optimized) {
          setCachedSrc(b64);
        }
      });
    } else {
      // No está en caché → descargar en background y guardar para próxima visita
      imageCache.get(optimized).catch(() => {});
    }

    return () => { mountedRef.current = false; };
  }, [src, width]);

  const handleImgError = useCallback(() => {
    if (!mountedRef.current) return;
    setError(true);
    onError?.();
  }, [onError]);

  const handleImgLoad = useCallback(() => {
    if (!mountedRef.current) return;
    onLoad?.();
  }, [onLoad]);

  // ─── Placeholder / Spinner (solo si showPlaceholder está activo) ───

  if (showPlaceholder && !cachedSrc) {
    return (
      <div
        className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center ${wrapperClassName || className}`}
        style={{
          aspectRatio: style?.aspectRatio || '4/3',
          ...style,
        }}
        aria-label="Cargando imagen..."
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        />
        <div className="relative z-10 flex flex-col items-center gap-2">
          <motion.div
            className="text-brand-500"
            style={{
              width: spinnerSize,
              height: spinnerSize,
              borderRadius: '50%',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
            }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          />
          <span className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase">
            Cargando...
          </span>
        </div>
      </div>
    );
  }

  // ─── Estado de error ───

  if (error) {
    return (
      <div
        className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center justify-center gap-2 ${wrapperClassName || className}`}
        style={{
          aspectRatio: style?.aspectRatio || '4/3',
          ...style,
        }}
      >
        <ImageOff className="w-6 h-6 text-zinc-400" />
        <span className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase">
          Sin imagen
        </span>
      </div>
    );
  }

  // ─── Imagen: carga desde URL directa INMEDIATAMENTE ───

  return (
    <img
      ref={imgRef}
      src={cachedSrc}
      alt={alt}
      className={className}
      style={style}
      onLoad={handleImgLoad}
      onError={handleImgError}
      referrerPolicy="no-referrer"
      loading={priority ? undefined : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : undefined}
      {...imgProps}
    />
  );
}
