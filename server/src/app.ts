import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { securityHeaders } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { env } from './config/env.js';
import adminRoutes from './routes/admin.routes.js';
import apiRoutes from './routes/api.routes.js';
import uploadRoutes from './routes/upload.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Trust proxy — the app runs behind Apache (reverse proxy) which forwards
  // X-Forwarded-For headers. Without this, express-rate-limit gets a single
  // IP (the proxy's) for all clients and warns about unexpected headers.
  app.set('trust proxy', 1);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS — permite conexiones desde frontend en Render u otros orígenes
  app.use(cors({
    origin: env.NODE_ENV === 'production'
      ? [env.APP_URL, 'https://maison-rosas.onrender.com', ...(process.env.CORS_ORIGINS || '').split(',').filter(Boolean)]
      : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-token', 'Authorization'],
  }));

  // Security headers
  app.use(securityHeaders);

  // Rate limiting on API
  app.use('/api', apiLimiter);

  // Static files - uploaded images with caching
  const uploadsDir = path.resolve(env.UPLOAD_DIR);
  app.use('/uploads', express.static(uploadsDir, {
    maxAge: '7d',
    immutable: true,
    etag: true,
    lastModified: true,
    setHeaders: (res) => {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    },
  }));

  // Static files - client build in production
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));

  // ─── Admin SPA ───
  // Serve the admin build at /admin (separate entry point)
  app.get('/admin', (req, res) => {
    const adminPath = path.resolve(clientDist, 'admin.html');
    res.sendFile(adminPath, (err) => {
      if (err) {
        res.redirect('/');
      }
    });
  });
  app.get('/admin/*', (req, res) => {
    const adminPath = path.resolve(clientDist, 'admin.html');
    res.sendFile(adminPath, (err) => {
      if (err) {
        res.redirect('/');
      }
    });
  });

  // ─── Config cache middleware ───
  // Cache critical URLs from DB for preload injection
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
    if (now - configCacheTimestamp > CONFIG_CACHE_TTL) {
      configCacheTimestamp = now;
      await refreshConfigCache();
    }
    return cachedCriticalUrls;
  }

  function generatePreloadLinksHtml(config: any): string {
    const links: string[] = [];
    const urls = [
      { url: config.heroImage, label: 'hero' },
      { url: config.logoUrl, label: 'logo' },
      { url: config.faviconUrl, label: 'favicon' },
    ];
    for (const { url } of urls) {
      if (url && url.length > 10 && !url.startsWith('data:')) {
        links.push(`    <link rel="preload" as="image" href="${url}" fetchpriority="high" />`);
      }
    }
    return links.join('\n');
  }

  refreshConfigCache().catch(() => {});

  // Intercept HTML responses to inject preload links
  app.use((req, res, next) => {
    const originalSend = res.send.bind(res);
    res.send = function (body: any) {
      if (typeof body === 'string' && body.includes('SERVER_PRELOAD_IMAGES')) {
        const preloadHtml = generatePreloadLinksHtml(cachedCriticalUrls);
        if (preloadHtml) {
          body = body.replace('<!-- SERVER_PRELOAD_IMAGES -->', preloadHtml);
        }
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
  // In production, serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return notFoundHandler(req, res);
    }
    const indexPath = path.resolve(clientDist, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(200).send(`
          <!doctype html>
          <html><head><title>Maison Rosas</title></head>
          <body><div id="root"></div>
          <script>console.log('Client build not found. Run: cd client && npm run build')</script>
          </body></html>
        `);
      }
    });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}
