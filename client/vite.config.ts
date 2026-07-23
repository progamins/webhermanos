import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import {
  isIPAllowed,
  isMACAllowed,
  getMACFormHTML,
  getDeniedHTML,
} from '../server/src/lib/verification.ts';

export default defineConfig(() => {
  // Hosts permitidos en dev (ngrok, etc.) — separados por coma via env
  const allowedHosts = process.env.VITE_ALLOWED_HOSTS
    ? process.env.VITE_ALLOWED_HOSTS.split(',').map(s => s.trim())
    : true;

  // Ruta secreta del admin: lee VITE_ADMIN_SECRET_PATH o usa default
  const adminSecretPath = process.env.VITE_ADMIN_SECRET_PATH || 'ADMIN_SECRET_PATH_PLACEHOLDER';

  // IPs permitidas + MACs autorizadas
  const allowedAdminIPs = (process.env.VITE_ALLOWED_ADMIN_IPS || '127.0.0.1,::1,192.168.15.0/24')
    .split(',').map(s => s.trim());
  const allowedMACs = new Set(
    (process.env.VITE_ALLOWED_MAC_ADDRESSES || '00-00-00-00-00-00')
      .split(',').map(s => s.trim().toUpperCase())
  );

  function viteClientIP(req: any): string {
    const forwarded = req.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    if (Array.isArray(forwarded) && forwarded.length > 0) return forwarded[0].trim();
    return req.socket?.remoteAddress || 'unknown';
  }

  function viteGetMAC(req: any): string | null {
    const cookie = req.headers?.cookie;
    if (cookie) {
      const match = cookie.split(';').find((c: string) => c.trim().startsWith('maison_device_mac='));
      if (match) {
        try {
          const val = match.split('=')[1].trim();
          return Buffer.from(decodeURIComponent(val), 'base64').toString('utf-8').toUpperCase();
        } catch {}
      }
    }
    const header = req.headers?.['x-device-mac'];
    if (typeof header === 'string') return header.trim().toUpperCase();
    return null;
  }

  // Plugin que protege el admin en dev mode
  const adminSecretPlugin: Plugin = {
    name: 'admin-secret-path',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) { next(); return; }

        if (req.url === '/admin' || req.url.startsWith('/admin/')) {
          res.statusCode = 301;
          res.setHeader('Location', `/${adminSecretPath}`);
          res.end();
          return;
        }
        else if (req.url === '/admin.html') {
          req.url = '/';
        }
        else if (req.url.startsWith(`/${adminSecretPath}`)) {
          // ═══ PRIMERO: Manejar POST de verificación MAC ═══
          // Esto DEBE ir antes de leer la MAC con viteGetMAC() porque:
          //   viteGetMAC() lee la MAC del header x-device-mac y, como ya está
          //   en la lista permitida, NO entra al bloque !isMACAllowed, y por
          //   tanto NUNCA setea la cookie — en vez de eso rewritea a admin.html
          //   y falla al servir un POST como página estática.
          if (req.method === 'POST' && req.headers?.['x-device-mac']) {
            const mac = (req.headers['x-device-mac'] as string).trim().toUpperCase();
            if (process.env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] Vite | POST verificación MAC:', mac, '| permitida?', isMACAllowed(mac, allowedMACs));
            if (isMACAllowed(mac, allowedMACs)) {
              const encoded = Buffer.from(mac).toString('base64');
              if (process.env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] ✅ Vite | MAC autorizada, cookie seteada');
              res.setHeader('Set-Cookie', `maison_device_mac=${encodeURIComponent(encoded)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${30*24*60*60}`);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
              return;
            }
            if (process.env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] ❌ Vite | MAC no autorizada en POST');
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'MAC no autorizada' }));
            return;
          }

          const clientIP = viteClientIP(req);
          // CONDICIÓN 1: IP
          if (!isIPAllowed(clientIP, allowedAdminIPs)) {
            if (process.env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] 🚫 IP denegada:', clientIP, '| IPs permitidas:', allowedAdminIPs);
            res.statusCode = 403;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(getDeniedHTML());
            return;
          }
          // CONDICIÓN 2: MAC (desde cookie o header)
          const deviceMAC = viteGetMAC(req);
          if (process.env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] Vite | path:', req.url, '| method:', req.method, '| MAC leída:', deviceMAC, '| MACs permitidas:', [...allowedMACs]);
          if (!isMACAllowed(deviceMAC, allowedMACs)) {
            if (process.env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] 📋 Vite | Mostrando formulario MAC (no hay cookie ni header válido)');
            res.statusCode = 401;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(getMACFormHTML());
            return;
          }
          if (process.env.NODE_ENV !== 'production') console.log('[DEBUG-MAC] ✅ Vite | MAC permitida, sirviendo admin.html');
          req.url = '/admin.html';
        }
        next();
      });
    },
  };

  return {
    plugins: [react(), tailwindcss(), adminSecretPlugin],
    define: {
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(process.env.GOOGLE_MAPS_PLATFORM_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/shared'),
      },
    },
    build: {
      cssCodeSplit: true,
      sourcemap: false,
      minify: 'esbuild',
      esbuild: {
        drop: ['console', 'debugger'],
      },
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          admin: path.resolve(__dirname, 'admin.html'),
        },
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-motion': ['motion'],
            'vendor-icons': ['lucide-react'],
            'vendor-recharts': ['recharts'],
            'vendor-lottie': ['@lottiefiles/dotlottie-react'],
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
      cssMinify: true,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 600,
    },
    server: {
      port: 5173,
      allowedHosts,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
