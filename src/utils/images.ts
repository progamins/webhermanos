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

  // Unsplash URLs: force WebP format for better compression
  if (url.includes('images.unsplash.com')) {
    const base = url.split('?')[0];
    return `${base}?w=${optimalWidth}&auto=format&fit=crop&q=${quality}&fm=webp`;
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
