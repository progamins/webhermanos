/**
 * Convierte URLs de imágenes externas a URLs locales del servidor.
 * Las imágenes de orígenes externos se sirven a través del proxy local
 * /api/image-proxy para:
 * - Eliminar SSL handshake + DNS lookup externos
 * - Aprovechar la caché del mismo origen (Cache-Control: immutable)
 * - Cargar más rápido al no depender de conexiones externas
 *
 * Las URLs que ya son locales (/uploads/) o data: se devuelven tal cual.
 */
export function getLocalImageUrl(url: string): string {
  if (!url) return url;
  // Ya es /api/uploads/ → no tocar
  if (url.startsWith('/api/uploads/') || url.startsWith('data:')) return url;
  // Redirigir URLs antiguas /uploads/ → /api/uploads/ (ruta que tiene handler en Vercel)
  if (url.startsWith('/uploads/')) return url.replace('/uploads/', '/api/uploads/');
  // ✅ Ruta relativa del MISMO origen (ej: /logo.png, /favicon.svg, /img/...)
  //    Se sirve directa — NO debe pasar por el proxy (el server no puede
  //    hacer fetch de una ruta relativa → error 400).
  if (url.startsWith('/')) return url;
  // Bare filename (sin prefijo ni ruta) → asumir que es /api/uploads/
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `/api/uploads/${url}`;
  }
  // Ya está en el mismo origen → no tocar
  if (typeof window !== 'undefined' && url.startsWith(window.location.origin)) return url;
  // URL externa → proxy local
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Extrae la URL original de una URL de proxy (/api/image-proxy?url=...).
 * Útil para fallbacks: si el proxy falla, se puede intentar la URL directa.
 */
export function extractProxyTarget(url: string): string | null {
  if (!url || !url.includes('/api/image-proxy')) return null;
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const target = parsed.searchParams.get('url');
    return target && (target.startsWith('http://') || target.startsWith('https://')) ? target : null;
  } catch {
    return null;
  }
}

/**
 * Detects if the current device is likely mobile based on screen width.
 * This runs during SSR/build too, where window is undefined (returns false).
 */
function isMobileWidth(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

/**
 * Returns the optimal image width based on the current viewport.
 * Mobile devices get smaller images for faster loading.
 */
function getOptimalWidth(requestedWidth: number): number {
  if (isMobileWidth()) {
    // Mobile: use at most 400px width (much smaller files)
    return Math.min(requestedWidth, 400);
  }
  // Desktop/tablet: use the requested width
  return requestedWidth;
}

/**
 * Optimizes an image URL by:
 * 1. Converting Unsplash images to WebP format for ~30% smaller files
 * 2. Using responsive widths based on viewport
 * 3. Reducing quality slightly for mobile
 *
 * @param url - The original image URL
 * @param width - Desired width in pixels (auto-reduced on mobile)
 * @returns Optimized URL pointing to WebP format when possible
 */
export function optimizeImageUrl(url: string, width: number = 600): string {
  if (!url) return url;

  // Safety net: bare filename → prefijar con /api/uploads/
  if (!url.startsWith('/') && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
    url = `/api/uploads/${url}`;
  }

  // ✅ Rutas locales del mismo origen: ya son archivos optimizados (webp),
  //    no se tocan. IMPORTANTE: esto evita que una URL de proxy
  //    (/api/image-proxy?url=...) que CONTENGA 'images.unsplash.com'
  //    en el parámetro url= sea malinterpretada por el bloque de Unsplash de
  //    abajo (encodeURIComponent NO codifica letras/puntos, así que la URL
  //    literalmente contiene el dominio). Sin este guard, split('?')[0]
  //    devolvería '/api/image-proxy' y se perdería el parámetro url=,
  //    causando un 400.

  // 🔁 URL de proxy local (/api/image-proxy?url=...): el ancho/calidad se
  //    reescribe DENTRO del target envuelto (ej. Unsplash). Así el srcSet
  //    genera variantes reales (320/480/960) en vez de 3 copias de la misma
  //    URL con el ancho horneado en el dato (bug: la galería descargaba
  //    w=800 para tarjetas de ~180px). Targets no redimensionables se
  //    devuelven sin cambios.
  if (url.startsWith('/api/image-proxy')) {
    const target = extractProxyTarget(url);
    if (!target) return url;
    const optimizedTarget = optimizeImageUrl(target, width);
    if (optimizedTarget === target) return url; // no resizable → igual
    return `/api/image-proxy?url=${encodeURIComponent(optimizedTarget)}`;
  }

  if (url.startsWith('/')) return url;

  const optimalWidth = getOptimalWidth(width);
  const quality = isMobileWidth() ? 60 : 80; // Lower quality on mobile = smaller files

  // Unsplash URLs: use auto=format for automatic WebP negotiation via Accept header
  // Avoid explicit fm=webp which can cause 404s on some images
  if (url.includes('images.unsplash.com')) {
    const base = url.split('?')[0];
    return `${base}?w=${optimalWidth}&auto=format&fit=crop&q=${quality}`;
  }

  // For other URLs, return as-is (they may already be optimized)
  return url;
}

/**
 * Props to spread on <img> elements for performance optimization.
 * Includes loading="lazy" and decoding="async".
 */
export const IMG_OPTIMIZATIONS = {
  loading: 'lazy' as const,
  decoding: 'async' as const,
};

/**
 * Props for the Hero/LCP image (should NOT be lazy loaded).
 * Uses fetchPriority="high" for faster LCP.
 */
export const HERO_IMG_PROPS = {
  fetchPriority: 'high' as const,
  decoding: 'async' as const,
};

// ─── Reporte de imágenes rotas al servidor ───
// Cuando una <img> falla (onError), se reporta la URL original al endpoint
// /api/uploads/report-broken. El sweep de limpieza del servidor considera
// rotas las URLs reportadas ≥ 2 veces (dedupe + contador server-side), así
// las imágenes que el navegador no puede renderizar terminan eliminándose
// de la BD aunque existan en disco.
const brokenReportQueue: string[] = [];
let brokenReportTimer: ReturnType<typeof setTimeout> | null = null;
const BROKEN_REPORT_DELAY_MS = 1500;

/**
 * Reporta una URL de imagen como rota (fire-and-forget, batch con debounce).
 * Solo reporta uploads locales y URLs externas; ignora data: y assets estáticos.
 */
export function reportBrokenImage(url: string) {
  if (!url) return;
  const normalized = url.trim();
  const isUpload = normalized.startsWith('/uploads/') || normalized.startsWith('/api/uploads/');
  const isExternal = normalized.startsWith('http://') || normalized.startsWith('https://');
  if (!isUpload && !isExternal) return;
  if (brokenReportQueue.includes(normalized)) return;
  brokenReportQueue.push(normalized);
  if (brokenReportTimer) return;
  brokenReportTimer = setTimeout(() => {
    brokenReportTimer = null;
    const urls = brokenReportQueue.splice(0, brokenReportQueue.length);
    if (urls.length === 0) return;
    fetch('/api/uploads/report-broken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    }).catch(() => { /* no crítico */ });
  }, BROKEN_REPORT_DELAY_MS);
}

/**
 * Lee la calidad de compresión configurada por el admin desde localStorage.
 * Si no está configurada, devuelve el valor por defecto (0.8).
 */
export function getImageQuality(): number {
  try {
    const saved = localStorage.getItem('maison_image_quality');
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val >= 0.1 && val <= 1.0) return val;
    }
  } catch {}
  return 0.8;
}

/**
 * Comprime y redimensiona una imagen en el cliente antes de subirla.
 * Reduce significativamente el peso de las imágenes (~60-80% menos)
 * optimizando almacenamiento y velocidad de carga.
 *
 * @param file - Archivo de imagen original
 * @param options - Opciones: maxWidth (default 1200), quality (default 0.8), format (default 'webp')
 * @returns Un nuevo archivo comprimido (Blob)
 */
export function compressImage(
  file: File,
  options: { maxWidth?: number; quality?: number; format?: 'webp' | 'jpeg' } = {}
): Promise<Blob> {
  const { maxWidth = 1200, quality = getImageQuality(), format = 'webp' } = options;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Redimensionar si es necesario (respetar proporciones)
      if (width > maxWidth || height > maxWidth) {
        const ratio = Math.min(maxWidth / width, maxWidth / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Dibujar en canvas comprimido
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // fallback: devolver original
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convertir al formato deseado
      const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback si WebP no es soportado
            canvas.toBlob(
              (fallbackBlob) => {
                resolve(fallbackBlob || file);
              },
              'image/jpeg',
              quality
            );
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback: devolver original
    };

    img.src = url;
  });
}
