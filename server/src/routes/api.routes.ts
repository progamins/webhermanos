import logger from '../lib/logger.js';
import { Router } from 'express';
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
