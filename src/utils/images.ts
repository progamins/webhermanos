/**
 * Optimizes an image URL by:
 * 1. Converting Unsplash images to WebP format for ~30% smaller files
 * 2. Preserving other URLs as-is
 *
 * @param url - The original image URL
 * @param width - Desired width in pixels (only applies to Unsplash URLs)
 * @returns Optimized URL pointing to WebP format when possible
 */
export function optimizeImageUrl(url: string, width: number = 600): string {
  if (!url) return url;

  // Unsplash URLs: force WebP format for better compression
  if (url.includes('images.unsplash.com')) {
    // Remove existing width param and add our own with WebP
    const base = url.split('?')[0];
    return `${base}?w=${width}&auto=format&fit=crop&q=80&fm=webp`;
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
