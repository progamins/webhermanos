import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

export default defineConfig(() => {
  // Hosts permitidos en dev — separados por coma via env
  const allowedHosts = process.env.VITE_ALLOWED_HOSTS
    ? process.env.VITE_ALLOWED_HOSTS.split(',').map(s => s.trim())
    : true;

  // Ruta secreta del admin: obligatoria via VITE_ADMIN_SECRET_PATH
  const adminSecretPath = process.env.VITE_ADMIN_SECRET_PATH;
  if (!adminSecretPath) {
    throw new Error('Falta VITE_ADMIN_SECRET_PATH en .env. Defínela antes de arrancar.');
  }

  // IPs permitidas + MACs autorizadas
  // ⚠️ Sincronizar con server/src/config/env.ts cuando se añadan IPs
  // Vacío = sin restricción por IP/MAC (solo credenciales).
  const allowedAdminIPs = (process.env.VITE_ALLOWED_ADMIN_IPS || '127.0.0.1,::1')
    .split(',').map(s => s.trim());
  const allowedMACs = new Set(
    (process.env.VITE_ALLOWED_MAC_ADDRESSES || '')
      .split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
  );

  // Plugin que protege el admin en dev mode (solo local → import dinámico)
  const adminSecretPlugin: Plugin = {
    name: 'admin-secret-path',
    configureServer(server) {
      // Importar utilidades de verificación SÓLO cuando se configure el server
      // (nunca durante el build, así evitamos dependencias del server en build)
      server.middlewares.use(async (req, res, next) => {
        try {
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
            // Import dinámico — las funciones sólo se cargan aquí, en dev mode
            const { isIPAllowed: checkIP, isMACAllowed: checkMAC, getMACFormHTML: macForm, getDeniedHTML: deniedHTML } = await import('../server/src/lib/verification.ts');

            function viteClientIP(r: any): string {
              const forwarded = r.headers?.['x-forwarded-for'];
              if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
              if (Array.isArray(forwarded) && forwarded.length > 0) return forwarded[0].trim();
              return r.socket?.remoteAddress || 'unknown';
            }

            function viteGetMAC(r: any): string | null {
              const cookie = r.headers?.cookie;
              if (cookie) {
                const match = cookie.split(';').find((c: string) => c.trim().startsWith('maison_device_mac='));
                if (match) {
                  try {
                    const val = match.split('=')[1].trim();
                    return Buffer.from(decodeURIComponent(val), 'base64').toString('utf-8').toUpperCase();
                  } catch {}
                }
              }
              const header = r.headers?.['x-device-mac'];
              if (typeof header === 'string') return header.trim().toUpperCase();
              return null;
            }

            // ═══ PRIMERO: Manejar POST de verificación MAC ═══
            if (req.method === 'POST' && req.headers?.['x-device-mac']) {
              const mac = (req.headers['x-device-mac'] as string).trim().toUpperCase();
              if (checkMAC(mac, allowedMACs)) {
                const encoded = Buffer.from(mac).toString('base64');
                res.setHeader('Set-Cookie', `maison_device_mac=${encodeURIComponent(encoded)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${30*24*60*60}`);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
                return;
              }
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'MAC no autorizada' }));
              return;
            }

            const clientIP = viteClientIP(req);
            // CONDICIÓN 1: IP
            if (!checkIP(clientIP, allowedAdminIPs)) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(deniedHTML(clientIP));
              return;
            }
            // CONDICIÓN 2: MAC (desde cookie o header)
            const deviceMAC = viteGetMAC(req);
            if (!checkMAC(deviceMAC, allowedMACs)) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(macForm());
              return;
            }
            req.url = '/admin.html';
          }
          next();
        } catch (err) {
          console.error('[AdminSecretPath] Error en middleware:', err);
          next();
        }
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
