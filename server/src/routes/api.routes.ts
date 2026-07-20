import { Router } from 'express';
import { orderService } from '../services/OrderService.js';
import { productService } from '../services/ProductService.js';
import { reviewService } from '../services/ReviewService.js';
import { galleryService } from '../services/GalleryService.js';
import { configService } from '../services/ConfigService.js';
import { emailService } from '../services/EmailService.js';
import { otpService } from '../services/OtpService.js';
import { contactLimiter } from '../middleware/rateLimit.js';
import { RealtimeService } from '../services/RealtimeService.js';

const router = Router();

// ─── Health ───
router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── Products ───
router.get('/products', async (req, res) => {
  try {
    const products = await productService.getAll();
    res.json(products);
  } catch (err: any) {
    console.error('[Products Error]', err);
    res.status(500).json({ error: 'Error al obtener productos.' });
  }
});

// ─── Reviews ───
router.get('/reviews', async (req, res) => {
  try {
    const reviews = await reviewService.getApproved();
    res.json(reviews);
  } catch (err: any) {
    console.error('[Reviews Error]', err);
    res.status(500).json({ error: 'Error al obtener reseñas.' });
  }
});

// ─── Gallery ───
router.get('/gallery', async (req, res) => {
  try {
    const gallery = await galleryService.getAll();
    res.json(gallery);
  } catch (err: any) {
    console.error('[Gallery Error]', err);
    res.status(500).json({ error: 'Error al obtener galería.' });
  }
});

// ─── Config ───
router.get('/config', async (req, res) => {
  try {
    const config = await configService.getAppConfig();
    res.json(config);
  } catch (err: any) {
    console.error('[Config Error]', err);
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
    console.error('[Config Critical URLs Error]', err);
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
    console.error('[Orders Error]', err);
    res.status(500).json({ error: 'Error al obtener pedidos.' });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const { order } = req.body;
    if (!order || !order.customerName || !order.customerEmail || !order.productName) {
      return res.status(400).json({ error: 'Datos del pedido incompletos.' });
    }

    const result = await orderService.create(order);

    // Send confirmation email (non-blocking)
    emailService.sendOrderConfirmation({
      ...order,
      id: result.id,
      trackingCode: result.trackingCode,
    }).catch(() => {});

    // Notify admin via SSE
    RealtimeService.emitOrderEvent('new_order', { id: result.id, trackingCode: result.trackingCode });

    res.json({ success: true, id: result.id, trackingCode: result.trackingCode });
  } catch (err: any) {
    console.error('[Order Create Error]', err);
    res.status(500).json({ error: err.message || 'Error al crear el pedido.' });
  }
});

// ─── OTP ───
router.post('/otp/send', async (req, res) => {
  try {
    const { email, customerName } = req.body;
    if (!email || !customerName) {
      return res.status(400).json({ error: 'Email y nombre requeridos.' });
    }
    const orders = await orderService.getByEmail(email);
    const result = await otpService.generateAndSend(email, customerName, orders);
    res.json(result);
  } catch (err: any) {
    console.error('[OTP Send Error]', err);
    res.status(500).json({ error: 'Error al enviar código de verificación.' });
  }
});

router.post('/otp/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email y código requeridos.' });
    }
    const result = await otpService.verify(email, code);
    res.json(result);
  } catch (err: any) {
    console.error('[OTP Verify Error]', err);
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

    // Send notification email
    await emailService.sendContactNotification(name, email, message).catch(() => {});

    res.json({ success: true, message: 'Mensaje enviado correctamente.' });
  } catch (err: any) {
    console.error('[Contact Error]', err);
    res.status(500).json({ error: 'Error al procesar mensaje de contacto.' });
  }
});

// ─── Image Proxy ───
router.get('/image-proxy', async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: 'URL requerida.' });

  try {
    const parsed = new URL(url);
    const { isAllowedImageUrl } = await import('../middleware/security.js');
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

  req.on('close', () => {
    console.log(`[SSE] Client ${clientId} disconnected.`);
  });
});

export default router;
