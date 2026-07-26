import type { Request, Response, NextFunction } from 'express';

/**
 * Aplica headers de seguridad HTTP a todas las respuestas.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  const isDev = process.env.NODE_ENV === 'development';

  // Standard hardening headers (Helmet-equivalent)
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // 🔒 HSTS (Strict-Transport-Security) solo en producción.
  //    En desarrollo sobre HTTP, el navegador ignora HSTS para localhost/IPs,
  //    pero si se prueba sobre HTTPS en un dominio real, podría forzar HTTPS
  //    permanentemente y bloquear conexiones HTTP posteriores.
  if (!isDev) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ⚠️ NOTA IMPORTANTE sobre CSP:
  // El HTML compilado (index.html, admin.html) contiene scripts inline
  // estáticos (Google Analytics, precarga de imágenes, service worker,
  // JSON-LD) que NO pueden tener un nonce porque son archivos estáticos
  // servidos directamente por express.static().
  //
  // Por eso usamos 'unsafe-inline' en TODOS los entornos. Las scripts
  // externas (cargadas via <script src="...">) ya están protegidas por
  // 'self'. Los scripts inline son código propio de confianza.
  //
  // En desarrollo adicionalmente necesitamos 'unsafe-inline' porque Vite
  // inyecta scripts inline para HMR.
  const scriptPolicy = `script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; `;

  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; ` +
    scriptPolicy +
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ` +
    `img-src 'self' data: blob: https:; ` +
    `font-src 'self' https://fonts.gstatic.com; ` +
    `connect-src 'self' https://*.googleapis.com https://fonts.gstatic.com https://www.google-analytics.com wss: ws://localhost:* ws://127.0.0.1:*; ` +
    `frame-src 'self' https://www.google.com https://www.google.com.pe; ` +
    `media-src 'self' https:; ` +
    `object-src 'none'; ` +
    `base-uri 'self'; ` +
    `form-action 'self'; ` +
    `report-uri /api/csp-report`
  );

  // Cross-Origin headers — relaxed for this site because it loads many
  // external resources (Google Fonts, Google Analytics, Unsplash images).
  // COOP: same-origin allows popups (e.g. WhatsApp links).
  // COEP and CORP are intentionally NOT set because require-corp would
  // block all cross-origin resources that don't explicitly opt in.
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
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
  if (email.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}
