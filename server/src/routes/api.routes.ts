import logger from '../lib/logger.js';
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { orderService } from '../services/OrderService.js';
import { productService } from '../services/ProductService.js';
import { reviewService } from '../services/ReviewService.js';
import { galleryService } from '../services/GalleryService.js';
import { configService } from '../services/ConfigService.js';
import { emailService } from '../services/EmailService.js';
import { otpService } from '../services/OtpService.js';
import { contactLimiter, apiLimiter } from '../middleware/rateLimit.js';
import { isValidEmail, escapeHtml, isAllowedImageUrl } from '../middleware/security.js';
import { RealtimeService } from '../services/RealtimeService.js';
import { calculatePrice } from '../services/PricingService.js';
import { env } from '../config/env.js';
const router = Router();

// ─── Health ───
router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── Status / Diagnostics ───
router.get('/status', async (req, res, next) => {
  try {
    const results: Record<string, any> = {
      server: {
        status: 'running',
        node: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'not set',
        vercel: process.env.VERCEL === 'true' ? 'yes' : 'no',
        time: new Date().toISOString(),
        uptime: process.uptime(),
      },
      env: {},
      database: { connected: false, tables: {}, error: null },
    };

    // ─── Env vars check (sin mostrar valores sensibles) ───
    const requiredEnv = [
      'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
      'ADMIN_SECRET_PATH', 'ADMIN_DEFAULT_PASSWORD',
      'ANALYST_DEFAULT_PASSWORD', 'STOCK_MANAGER_DEFAULT_PASSWORD',
      'APP_URL',
    ];
    const optionalEnv = ['BLOB_READ_WRITE_TOKEN', 'GOOGLE_MAPS_PLATFORM_KEY', 'VITE_GA_MEASUREMENT_ID'];
    for (const key of requiredEnv) {
      results.env[key] = process.env[key] ? '✅ configurado' : '❌ faltante';
    }
    for (const key of optionalEnv) {
      results.env[key] = process.env[key] ? '✅ configurado' : '⚪ opcional';
    }

    // ─── Database test + Admin Auth (una sola conexión) ───
    let conn: any = null;
    try {
      const { getPool } = await import('../config/db.js');
      const pool = getPool();
      conn = await pool.getConnection();
      await conn.ping();
      results.database.connected = true;

      // ── Tablas ──
      const tableNames = ['products', 'reviews', 'gallery', 'orders', 'config', 'admin_auth', 'cake_stock', 'contact_messages'];
      for (const table of tableNames) {
        try {
          const [rows] = await conn.query(`SELECT COUNT(*) as count FROM \`${table}\``);
          results.database.tables[table] = (rows as any[])[0].count;
        } catch {
          results.database.tables[table] = '❌ no existe';
        }
      }

      // ── Admin Auth Test ──
      results.auth = { roles: {} };
      const expectedPasswords: Record<string, string | undefined> = {
        admin: process.env.ADMIN_DEFAULT_PASSWORD,
        analyst: process.env.ANALYST_DEFAULT_PASSWORD,
        stock_manager: process.env.STOCK_MANAGER_DEFAULT_PASSWORD,
      };
      const [authRows] = await conn.query('SELECT role, password_hash FROM admin_auth ORDER BY role');
      const foundRoles = new Set<string>();
      for (const row of authRows as any[]) {
        foundRoles.add(row.role);
        const role = row.role;
        const hash = row.password_hash;
        const expected = expectedPasswords[role];
        if (!expected) {
          results.auth.roles[role] = { status: '❌ contraseña no configurada en env vars', passwordSet: false, hashPresent: !!hash };
        } else if (!hash) {
          results.auth.roles[role] = { status: '❌ sin hash en BD', passwordSet: true, hashPresent: false };
        } else {
          const match = bcrypt.compareSync(expected, hash);
          results.auth.roles[role] = {
            status: match ? '✅ contraseña coincide' : '❌ contraseña NO coincide',
            passwordSet: true,
            hashPresent: true,
          };
        }
      }
      // Detectar roles esperados que no existen en BD
      for (const [role] of Object.entries(expectedPasswords)) {
        if (!foundRoles.has(role)) {
          results.auth.roles[role] = { status: '❌ rol no encontrado en BD', passwordSet: !!expectedPasswords[role], hashPresent: false };
        }
      }
      const allMatch = Object.values(results.auth.roles).every((r: any) => r.status?.startsWith('✅'));
      results.auth.summary = allMatch
        ? '✅ Todas las contraseñas de roles coinciden'
        : '⚠️ Hay problemas con las contraseñas de roles';
    } catch (err: any) {
      results.database.connected = false;
      results.database.error = err?.message || 'Error desconocido al conectar a BD';
      if (!results.auth) {
        results.auth = { roles: {}, summary: '⚠️ No se pudo verificar (BD no conectada)', error: err?.message };
      }
    } finally {
      if (conn) {
        try { conn.release(); } catch { /* ignore release errors */ }
      }
    }

    // ─── Overall status ───
    const allTablesOk = Object.values(results.database.tables).every(v => typeof v === 'number');
    const allEnvOk = Object.values(results.env).every(v => v === '✅ configurado');
    const authOk = results.auth.summary?.startsWith('✅');

    results.overall = allTablesOk && allEnvOk && results.database.connected && authOk
      ? '✅ TODO FUNCIONANDO'
      : '⚠️ Hay problemas que revisar';

    res.json(results);
  } catch (err: any) {
    logger.error('Error en status endpoint', { service: 'API', error: err?.message });
    res.status(500).json({ error: 'Error al generar diagnóstico.', detail: err?.message });
  }
});

// ─── Products ───
router.get('/products', async (req, res) => {
  try {
    const products = await productService.getAll();
    res.json(products);
  } catch (err: any) {
    logger.error('Error fetching products', { service: 'API', error: err?.message });
    res.status(500).json({ error: 'Error al obtener productos.' });
  }
});

// ─── Reviews ───
router.get('/reviews', async (req, res) => {
  try {
    const reviews = await reviewService.getApproved();
    res.json(reviews);
  } catch (err: any) {
    logger.error('Error fetching reviews', { service: 'API', error: err?.message });
    res.status(500).json({ error: 'Error al obtener reseñas.' });
  }
});

// ─── Gallery ───
router.get('/gallery', async (req, res) => {
  try {
    const gallery = await galleryService.getAll();
    res.json(gallery);
  } catch (err: any) {
    logger.error('Error fetching gallery', { service: 'API', error: err?.message });
    res.status(500).json({ error: 'Error al obtener galería.' });
  }
});

// ─── Config ───
router.get('/config', async (req, res) => {
  try {
    const config = await configService.getAppConfig();
    res.json(config);
  } catch (err: any) {
    logger.error('Error fetching config', { service: 'API', error: err?.message });
    res.status(500).json({ error: 'Error al obtener configuración.' });
  }
});

router.get('/config/critical-urls', async (req, res) => {
  try {
    const config = await configService.getAppConfig();
    res.json({
      heroImage: config.heroImage,
      logoUrl: config.logoUrl,
      faviconUrl: config.faviconUrl,
    });
  } catch (err: any) {
    logger.error('Error fetching critical URLs', { service: 'API', error: err?.message });
    res.status(500).json({ error: 'Error al obtener URLs críticas.' });
  }
});

// ─── Orders ───
router.get('/orders', async (req, res) => {
  try {
    const { trackingCode, email } = req.query;
    if (trackingCode) {
      const order = await orderService.getByTrackingCode(trackingCode as string);
      if (order) {
        const timeline = await orderService.getTimeline(order.id);
        return res.json({ ...order, timeline });
      }
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }
    if (email) {
      const orders = await orderService.getByEmail(email as string);
      return res.json(orders);
    }
    res.status(400).json({ error: 'Se requiere trackingCode o email.' });
  } catch (err: any) {
    logger.error('Error fetching orders', { service: 'API', error: err?.message });
    res.status(500).json({ error: 'Error al obtener pedidos.' });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const { order } = req.body;
    if (!order || !order.customerName || !order.customerEmail || !order.productName) {
      return res.status(400).json({ error: 'Datos del pedido incompletos.' });
    }

    if (!isValidEmail(order.customerEmail)) {
      return res.status(400).json({ error: 'Email del cliente inválido.' });
    }

    // ─── Calcular el precio final desde el servidor ───
    // El servidor SIEMPRE tiene la última palabra sobre el precio.
    // Usa el PricingService que replica la lógica del cliente (tamaño + relleno).
    const priceResult = await calculatePrice({
      productId: order.productId,
      size: order.size,
      flavor: order.flavor,
      sizeModifier: order.sizeModifier,
      fillingPrice: order.fillingPrice,
    });

    const totalPrice = priceResult.totalPrice;

    if (priceResult.source !== 'client') {
      logger.info('Precio calculado por servidor', {
        service: 'API',
        source: priceResult.source,
        basePrice: priceResult.basePrice,
        sizeModifier: priceResult.sizeModifier,
        fillingPrice: priceResult.fillingPrice,
        totalPrice,
        productId: order.productId,
      });
    }

    const sanitizedOrder = {
      ...order,
      customerName: escapeHtml(order.customerName),
      customerEmail: order.customerEmail.trim().toLowerCase(),
      totalPrice, // precio validado
      // Sanitizar campos de texto
      theme: order.theme ? escapeHtml(order.theme) : order.theme,
      specialNotes: order.specialNotes ? escapeHtml(order.specialNotes) : order.specialNotes,
      message: order.message ? escapeHtml(order.message) : order.message,
      celebratedName: order.celebratedName ? escapeHtml(order.celebratedName) : order.celebratedName,
      selectedDecoration: order.selectedDecoration ? escapeHtml(order.selectedDecoration) : order.selectedDecoration,
      customColor: order.customColor ? escapeHtml(order.customColor) : order.customColor,
      flavor: order.flavor ? escapeHtml(order.flavor) : order.flavor,
      productName: order.productName ? escapeHtml(order.productName) : order.productName,
      // Sanitizar campos numéricos
      customerAge: order.customerAge ? Number(order.customerAge) : undefined,
    };

    const result = await orderService.create(sanitizedOrder);

    // Send confirmation email (non-blocking)
    emailService.sendOrderConfirmation({
      ...sanitizedOrder,
      id: result.id,
      trackingCode: result.trackingCode,
    }).catch(() => {});

    // Notify admin via SSE
    RealtimeService.emitOrderEvent('new_order', { id: result.id, trackingCode: result.trackingCode });

    res.json({ success: true, id: result.id, trackingCode: result.trackingCode });
  } catch (err: any) {
    logger.error('Error creating order', { service: 'API', error: err?.message });
    res.status(500).json({ error: err.message || 'Error al crear el pedido.' });
  }
});

// ─── OTP (con rate limiting específico) ───
// OTP send limited to 3 attempts per IP per 15 minutes to prevent brute force
router.post('/otp/send', apiLimiter, async (req, res) => {
  try {
    const { email, customerName } = req.body;
    if (!email || !customerName) {
      return res.status(400).json({ error: 'Email y nombre requeridos.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Email inválido.' });
    }
    const orders = await orderService.getByEmail(email);
    const result = await otpService.generateAndSend(email, customerName, orders);
    res.json(result);
  } catch (err: any) {
    logger.error('Error sending OTP', { service: 'API', error: err?.message });
    res.status(500).json({ error: 'Error al enviar código de verificación.' });
  }
});

// OTP verify also rate limited to prevent brute force
router.post('/otp/verify', apiLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email y código requeridos.' });
    }
    // Validate code format: must be exactly 6 digits
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'El código debe tener exactamente 6 dígitos.' });
    }
    const result = await otpService.verify(email, code);
    res.json(result);
  } catch (err: any) {
    logger.error('Error verifying OTP', { service: 'API', error: err?.message });
    res.status(500).json({ error: 'Error al verificar código.' });
  }
});

// ─── Contact ───
router.post('/contact', contactLimiter, async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !message) {
      return res.status(400).json({ error: 'Nombre y mensaje requeridos.' });
    }
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Email inválido.' });
    }

      // Sanitize input before processing
    const sanitizedName = escapeHtml(name.trim());
    const sanitizedMessage = escapeHtml(message.trim());
    const sanitizedEmail = email ? email.trim().toLowerCase() : '';

    // Send notification email
    await emailService.sendContactNotification(sanitizedName, sanitizedEmail, sanitizedMessage).catch(() => {});

    res.json({ success: true, message: 'Mensaje enviado correctamente.' });
  } catch (err: any) {
    logger.error('Error sending contact', { service: 'API', error: err?.message });
    res.status(500).json({ error: 'Error al procesar mensaje de contacto.' });
  }
});

// ─── CSP Report endpoint (POST only, no auth required) ───
router.post('/csp-report', (req, res) => {
  // Log CSP violations for monitoring
  const report = req.body?.['csp-report'] || req.body;
  logger.warn('CSP Violation', {
    service: 'CSP',
    'blocked-uri': report?.['blocked-uri'],
    'violated-directive': report?.['violated-directive'],
    'source-file': report?.['source-file'],
    'line-number': report?.['line-number'],
  });
  res.status(204).end();
});

// Placeholder SVG para imágenes no encontradas
const MISSING_IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#f4f4f5"/>
  <text x="200" y="140" text-anchor="middle" fill="#a1a1aa" font-family="monospace" font-size="14">📷</text>
  <text x="200" y="170" text-anchor="middle" fill="#a1a1aa" font-family="monospace" font-size="11">Imagen no disponible</text>
</svg>`;

// ─── Serve uploaded files (Vercel /tmp fallback) ───
router.get('/uploads/:filename', async (req, res) => {
  try {
    // 🔒 Sanitizar: solo el nombre base, evitar path traversal
    const filename = path.basename(req.params.filename);
    const isVercel = process.env.VERCEL === 'true';

    if (isVercel) {
      // En Vercel, los archivos subidos sin Blob se guardan en /tmp
      const filePath = path.join('/tmp', filename);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filename).toLowerCase();
        const mimeMap: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.pdf': 'application/pdf',
        };
        const contentType = mimeMap[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        const fileBuffer = fs.readFileSync(filePath);
        return res.send(fileBuffer);
      }
      // Intentar buscar en la BD por si hay un registro con URL externa
      try {
        const { UploadRepository } = await import('../repositories/index.js');
        const uploadRepo = new UploadRepository();
        const upload = await uploadRepo.findByFilename(filename);
        if (upload?.url && upload.url.startsWith('http')) {
          return res.redirect(302, upload.url);
        }
      } catch { /* ignore */ }
      // No encontrado en /tmp ni en BD → placeholder SVG
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'no-cache');
      return res.send(MISSING_IMAGE_SVG);
    }

    // En local, usar env.UPLOAD_DIR (importado estáticamente)
    const uploadsDir = env.UPLOAD_DIR;
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    // Placeholder SVG para archivos locales no encontrados
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache');
    return res.send(placeholder);
  } catch (err: any) {
    logger.error('Error serving upload', { service: 'API', error: err?.message });
    return res.status(500).json({ error: 'Error al servir archivo.' });
  }
});

// ─── Image Proxy ───
router.get('/image-proxy', async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: 'URL requerida.' });

  try {
    if (!isAllowedImageUrl(url)) {
      return res.status(403).json({ error: 'Dominio no permitido.' });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MaisonRosas/1.0',
        'Accept': 'image/*',
      },
    });
    if (!response.ok) throw new Error('Fetch failed');

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch {
    res.status(400).json({ error: 'Error al obtener la imagen.' });
  }
});

// ─── SSE ───
router.get('/events', (req, res) => {
  RealtimeService.sendSSEHeaders(res);
  const clientId = RealtimeService.addClient(res);

  req.on('close', () => {        logger.info('SSE client disconnected', { service: 'SSE', clientId });
  });
});

export default router;
