import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Genera un nonce criptográfico por request para CSP.
 * Se almacena en `res.locals.cspNonce` para que otros middlewares o
 * templates puedan usarlo en etiquetas <script nonce="...">.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  const nonce = crypto.randomBytes(16).toString('base64url');
  res.locals.cspNonce = nonce;

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; ` +
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com; ` +
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ` +
    `img-src 'self' data: blob: https:; ` +
    `font-src 'self' https://fonts.gstatic.com; ` +
    `connect-src 'self' https://*.googleapis.com https://www.google-analytics.com wss: ws://localhost:* ws://127.0.0.1:*; ` +
    `frame-src 'self'; ` +
    `media-src 'self' https:; ` +
    `object-src 'none'; ` +
    `base-uri 'self'; ` +
    `form-action 'self'`
  );
  next();
}

export const ALLOWED_IMAGE_DOMAINS = [
  'images.unsplash.com',
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
];

export function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_IMAGE_DOMAINS.some(
      domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}
