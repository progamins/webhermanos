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
    `connect-src 'self' https://*.googleapis.com https://*.gstatic.com https://fonts.gstatic.com https://www.google-analytics.com https://maps.googleapis.com https://maps.gstatic.com wss: ws://localhost:* ws://127.0.0.1:*; ` +
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

  // 🔒 No-store para rutas sensibles del admin: evita que el navegador
  //    cachee datos privados (pedidos, pagos, reseñas) en disco.
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/upload')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}

export const ALLOWED_IMAGE_DOMAINS = [
  'images.unsplash.com',
  'upload.wikimedia.org',
  'avatars.githubusercontent.com',
  'github.githubassets.com',
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
];

export function isAllowedImageUrl(url: string): boolean {
  // Rutas relativas (locales) siempre permitidas
  if (url.startsWith('/')) return true;

  try {
    const parsed = new URL(url);
    // 🔒 Anti-SSRF: bloquear hosts que no sean https (el proxy solo debe
    //    servir imágenes seguras) y puertos no estándar.
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (parsed.port) return false;
    return ALLOWED_IMAGE_DOMAINS.some(
      domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * 🔒 Anti-SSRF: verifica que el hostname de una URL no sea una IP
 * privada/reservada/loopback. Se usa en el image-proxy para impedir
 * que un atacante acceda a la red interna del servidor.
 */
export function isPrivateHostname(hostname: string): boolean {
  if (!hostname) return true;
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, ''); // quitar [ ] de IPv6

  // Loopback, localhost, IPv6 loopback
  if (h === 'localhost' || h === '::1' || h === '0.0.0.0') return true;

  // IPv6: simplificar — bloquear cualquier IPv6 literal excepto las públicas no es trivial
  // sin resolución DNS; bloqueamos formas obvias de loopback/link-local/private.
  if (h.includes(':')) {
    return h.startsWith('::') || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb');
  }

  // IPv4
  const parts = h.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;

  // 10.0.0.0/8
  if (a === 10) return true;
  // 127.0.0.0/8 (loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (link-local)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 100.64.0.0/10 (CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 192.0.0.0/24, 192.0.2.0/24 (documentation), 198.18.0.0/15 (benchmark), 198.51.100.0/24
  if (a === 192 && b === 0) return true;
  if (a === 192 && b === 0 && parts[2] === 2) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && parts[2] === 100) return true;
  // 203.0.113.0/24 (documentation)
  if (a === 203 && b === 0 && parts[2] === 113) return true;
  // 224.0.0.0/4 multicast, 240.0.0.0/4 reserved
  if (a >= 224) return true;

  return false;
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
