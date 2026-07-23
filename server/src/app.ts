import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { securityHeaders } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { apiLimiter, adminLimiter } from './middleware/rateLimit.js';
import { env } from './config/env.js';
import adminRoutes from './routes/admin.routes.js';
import apiRoutes from './routes/api.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import {
  isIPAllowed,
  isMACAllowed,
  getMACFormHTML,
  getDeniedHTML,
} from './lib/verification.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAC_COOKIE = 'maison_device_mac';
const MAC_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 días

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── CORS ───
  const isDev = env.NODE_ENV === 'development';
  const devOrigins = isDev
    ? ['http://localhost:5173', 'http://127.0.0.1:5173']
    : [];
  const extraOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .filter(Boolean);

  app.use(cors({
    origin: [
      ...(env.APP_URL ? [env.APP_URL] : []),
      ...devOrigins,
      ...extraOrigins,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-token', 'Authorization', 'x-device-mac'],
  }));

  app.use(securityHeaders);
  app.use('/api', apiLimiter);
  app.use('/api/admin', adminLimiter);

  // Static files
  const uploadsDir = path.resolve(env.UPLOAD_DIR);
  app.use('/uploads', express.static(uploadsDir, {
    maxAge: '7d', immutable: true, etag: true, lastModified: true,
    setHeaders: (res) => {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    },
  }));

  const clientDist = path.resolve(__dirname, '../../client/dist');

  // Bloquear /admin.html directo y redirect /admin → ruta secreta
  app.use((req, res, next) => {
    if (req.path === '/admin.html') {
      return res.sendFile(path.resolve(clientDist, 'index.html'), (err) => {
        if (err) res.redirect('/');
      });
    }
    if (req.path === '/admin' || req.path.startsWith('/admin/')) {
      return res.redirect(301, `/${env.ADMIN_SECRET_PATH}`);
    }
    next();
  });

  app.use(express.static(clientDist));

  // ─── Utilidades IP / MAC ───
  const allowedMACs = new Set(env.ALLOWED_MAC_ADDRESSES);

  function getClientIP(req: express.Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  function getDeviceMAC(req: express.Request): string | null {
    // Intentar leer de cookie primero, luego de header
    const cookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith(`${MAC_COOKIE}=`));
    if (cookie) {
      try {
        const val = cookie.split('=')[1].trim();
        const decoded = Buffer.from(decodeURIComponent(val), 'base64').toString('utf-8').toUpperCase();
        if (env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] Express | MAC desde cookie:', decoded);
        return decoded;
      } catch { /* ignore */ }
    }
    const header = req.headers['x-device-mac'];
    if (typeof header === 'string') {
      if (env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] Express | MAC desde header:', header.trim().toUpperCase());
      return header.trim().toUpperCase();
    }
    return null;
  }

  function setMACCookie(res: express.Response, mac: string): void {
    const encoded = Buffer.from(mac).toString('base64');
    res.setHeader('Set-Cookie', `${MAC_COOKIE}=${encodeURIComponent(encoded)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAC_COOKIE_MAX_AGE / 1000}`);
  }

  // ─── Middleware IP + MAC combinado ───
  const adminPrefix = `/${env.ADMIN_SECRET_PATH}`;

  const adminAccessFilter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // ⚠️ Si el POST handler ya respondió (seteó cookie y devolvió JSON),
    // no continuar o intentar enviar otra respuesta (headers already sent).
    if (res.headersSent) return;

    const clientIP = getClientIP(req);

    // CONDICIÓN 1: IP autorizada (exacta, CIDR o wildcard)
    if (!isIPAllowed(clientIP, env.ALLOWED_ADMIN_IPS)) {
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({ error: 'Acceso denegado: IP no autorizada', clientIP });
      }
      return res.status(403).send(getDeniedHTML(clientIP));
    }

    // CONDICIÓN 2: MAC del dispositivo
    const deviceMAC = getDeviceMAC(req);
    if (env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] Express | path:', req.path, '| method:', req.method, '| MAC:', deviceMAC, '| MACs permitidas:', env.ALLOWED_MAC_ADDRESSES);
    if (!isMACAllowed(deviceMAC, allowedMACs)) {
      // Si es una petición POST con MAC en el header, verificar
      if (req.method === 'POST' && req.headers['x-device-mac']) {
        const mac = (req.headers['x-device-mac'] as string).trim().toUpperCase();
        if (env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] Express | POST con MAC:', mac, '| coincide?', isMACAllowed(mac, allowedMACs));
        if (isMACAllowed(mac, allowedMACs)) {
          if (env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] ✅ Express | MAC autorizada vía POST, cookie seteada');
          setMACCookie(res, mac);
          return res.json({ success: true });
        }
      }
      // Mostrar formulario para ingresar MAC
      if (env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] 📋 Express | Mostrando formulario MAC (no hay cookie válida)');
      return res.status(401).send(getMACFormHTML());
    } else {
      if (env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] ✅ Express | MAC permitida, pasando...');
    }

    next();
  };

  // ─── Aplicar filtros a admin page + admin API ───
  // Manejar POST para verificación MAC (llega antes que los GET)
  app.post(adminPrefix, express.json(), (req, res, next) => {
    const mac = req.headers['x-device-mac'] as string;
    if (env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] Express | POST handler | MAC recibida:', mac, '| permitida?', mac ? isMACAllowed(mac.trim().toUpperCase(), allowedMACs) : 'no hay MAC');
    if (mac && isMACAllowed(mac.trim().toUpperCase(), allowedMACs)) {
      if (env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] ✅ Express | POST handler | MAC válida, seteando cookie');
      setMACCookie(res, mac.trim().toUpperCase());
      return res.json({ success: true });
    }
    if (env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] ❌ Express | POST handler | MAC no autorizada');
    res.status(401).json({ error: 'MAC no autorizada' });
  });

  app.use(adminPrefix, adminAccessFilter);
  app.use('/api/admin', adminAccessFilter);

  // ─── Admin SPA ───
  app.get(adminPrefix, (req, res) => {
    const adminPath = path.resolve(clientDist, 'admin.html');
    res.sendFile(adminPath, (err) => { if (err) res.redirect('/'); });
  });
  app.get(`${adminPrefix}/*`, (req, res) => {
    const adminPath = path.resolve(clientDist, 'admin.html');
    res.sendFile(adminPath, (err) => { if (err) res.redirect('/'); });
  });

  // ─── Config cache ───
  let cachedCriticalUrls: { heroImage?: string; logoUrl?: string; faviconUrl?: string } = {};
  let configCacheTimestamp = 0;
  const CONFIG_CACHE_TTL = 30_000;

  async function refreshConfigCache() {
    try {
      const { configService } = await import('./services/ConfigService.js');
      const config = await configService.getAppConfig();
      cachedCriticalUrls = {
        heroImage: config.heroImage || undefined,
        logoUrl: config.logoUrl || undefined,
        faviconUrl: config.faviconUrl || undefined,
      };
    } catch { /* ignore */ }
  }

  async function getCriticalUrls() {
    const now = Date.now();
    if (now - configCacheTimestamp > CONFIG_CACHE_TTL) { configCacheTimestamp = now; await refreshConfigCache(); }
    return cachedCriticalUrls;
  }

  function generatePreloadLinksHtml(config: any): string {
    const links: string[] = [];
    const urls = [
      { url: config.heroImage, label: 'hero' },
      { url: config.logoUrl, label: 'logo' },
      { url: config.faviconUrl, label: 'favicon' },
    ];
    for (const { url } of urls) { if (url && url.length > 10 && !url.startsWith('data:')) links.push(`    <link rel="preload" as="image" href="${url}" fetchpriority="high" />`); }
    return links.join('\n');
  }

  refreshConfigCache().catch(() => {});

  app.use((req, res, next) => {
    const originalSend = res.send.bind(res);
    res.send = function (body: any) {
      if (typeof body === 'string' && body.includes('SERVER_PRELOAD_IMAGES')) {
        const preloadHtml = generatePreloadLinksHtml(cachedCriticalUrls);
        if (preloadHtml) body = body.replace('<!-- SERVER_PRELOAD_IMAGES -->', preloadHtml);
      }
      return originalSend(body);
    };
    next();
  });

  // ─── API Routes ───
  app.use('/api', apiRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/upload', uploadRoutes);

  // ─── SPA fallback ───
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return notFoundHandler(req, res);
    const indexPath = path.resolve(clientDist, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) res.status(200).send(`<!doctype html><html><head><title>Maison Rosas</title></head><body><div id="root"></div><script>console.log('Client build not found. Run: cd client && npm run build')</script></body></html>`);
    });
  });

  app.use(errorHandler);
  return app;
}
