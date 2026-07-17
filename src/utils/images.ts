/**
 * Convierte URLs de imágenes externas a URLs locales del servidor.
 * Las imágenes de Firebase Storage y otros orígenes externos
 * se sirven a través del proxy local /api/image-proxy para:
 * - Eliminar SSL handshake + DNS lookup externos
 * - Aprovechar la caché del mismo origen (Cache-Control: immutable)
 * - Cargar más rápido al no depender de conexiones externas
 *
 * Las URLs que ya son locales (/uploads/) o data: se devuelven tal cual.
 */
export function getLocalImageUrl(url: string): string {
  if (!url) return url;
  // Ya es local → no tocar
  if (url.startsWith('/uploads/') || url.startsWith('data:')) return url;
  // Ya está en el mismo origen → no tocar
  if (typeof window !== 'undefined' && url.startsWith(window.location.origin)) return url;
  // URL externa → proxy local
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
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
