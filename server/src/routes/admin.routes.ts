import { Router } from 'express';
import { verifyAdminSession, requireRole } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import { upload } from '../middleware/upload.js';
import { authService } from '../services/AuthService.js';
import { productService } from '../services/ProductService.js';
import { orderService } from '../services/OrderService.js';
import { galleryService } from '../services/GalleryService.js';
import { reviewService } from '../services/ReviewService.js';
import { configService } from '../services/ConfigService.js';
import { stockService } from '../services/StockService.js';
import { ActivityLogService } from '../services/ActivityService.js';
import { storageService } from '../services/StorageService.js';
import { emailService } from '../services/EmailService.js';

const router = Router();

// ─── AUTH ───
router.post('/login', loginLimiter, async (req, res) => {
  const { password, role } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'Se requiere contraseña.' });
  }
  const result = await authService.login(password, role || 'admin');
  return res.json(result);
});

router.post('/verify', verifyAdminSession, (req, res) => {
  res.json({ success: true, valid: true, role: (req as any).adminRole });
});

router.post('/logout', async (req, res) => {
  const token = req.headers['x-admin-token'] as string;
  if (token) await authService.logout(token);
  res.json({ success: true });
});

router.post('/change-admin-password', verifyAdminSession, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const role = (req as any).adminRole || 'admin';
  const result = await authService.changePassword(role, currentPassword, newPassword);
  res.json(result);
});

router.get('/role-passwords', verifyAdminSession, async (req, res) => {
  const result = await authService.getRolePasswordsStatus();
  res.json(result);
});

router.post('/role-passwords', verifyAdminSession, async (req, res) => {
  const { analystPassword, stockManagerPassword } = req.body;
  const result = await authService.saveRolePasswords(analystPassword, stockManagerPassword);
  res.json(result);
});

router.post('/send-credentials', verifyAdminSession, async (req, res) => {
  const config = await configService.getAppConfig();
  const result = await emailService.sendCredentials(
    { admin: '****', analyst: '****', stock_manager: '****' },
    config
  );
  res.json(result);
});

// ─── ACTIVITY LOG ───
router.get('/activity-log', verifyAdminSession, async (req, res) => {
  try {
    const logs = await ActivityLogService.getRecent(50);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al obtener registro de actividades.' });
  }
});

// ─── PRODUCTS ───
router.get('/products', verifyAdminSession, async (req, res) => {
  const products = await productService.getActive();
  res.json({ success: true, products });
});

router.post('/products', verifyAdminSession, async (req, res) => {
  try {
    const product = await productService.create(req.body.product);
    res.json({ success: true, product });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error guardando producto.' });
  }
});

router.delete('/products/:id', verifyAdminSession, async (req, res) => {
  await productService.delete(req.params.id);
  res.json({ success: true });
});

// ─── ORDERS ───
router.get('/orders', verifyAdminSession, async (req, res) => {
  const orders = await orderService.getAll();
  res.json({ success: true, orders });
});

router.post('/orders/status', verifyAdminSession, async (req, res) => {
  const { orderId, status, cancelReason } = req.body;
  const success = await orderService.updateStatus(orderId, status, (req as any).adminRole, cancelReason);
  if (success) {
    // Re-enable sending email notifications in production
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: 'Pedido no encontrado.' });
  }
});

router.delete('/orders/:id', verifyAdminSession, async (req, res) => {
  await orderService.delete(req.params.id);
  res.json({ success: true });
});

router.post('/orders/update-full', verifyAdminSession, async (req, res) => {
  const { order } = req.body;
  await orderService.update(order.id, order);
  res.json({ success: true });
});

router.post('/orders/upload-voucher', verifyAdminSession, upload.single('voucher'), async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se recibió el archivo.' });
    }
    const result = await storageService.saveFromPath(
      req.file.path, req.file.originalname, req.file.mimetype, (req as any).adminRole
    );
    await orderService.update(orderId, { voucherUrl: result.url, voucherName: req.file.originalname });
    res.json({ success: true, voucherUrl: result.url });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error al subir comprobante.' });
  }
});

router.post('/orders/delete-voucher', verifyAdminSession, async (req, res) => {
  const { orderId, voucherPath } = req.body;
  if (voucherPath) await storageService.deleteFile(voucherPath);
  await orderService.update(orderId, { voucherUrl: '', voucherName: '' });
  res.json({ success: true });
});

router.post('/orders/update-payment', verifyAdminSession, async (req, res) => {
  const { orderId, paymentStatus, paymentMethod, montoPagado, fechaPago, confirmedByAdmin } = req.body;
  await orderService.update(orderId, {
    paymentStatus, paymentMethod, montoPagado, fechaPago,
    confirmedByAdmin: confirmedByAdmin || (req as any).adminRole,
  });
  res.json({ success: true });
});

router.post('/orders/assign-stock', verifyAdminSession, async (req, res) => {
  const { orderId, stockId } = req.body;
  const assigned = await stockService.assignToOrder(stockId, orderId);
  if (assigned) {
    await orderService.update(orderId, { fulfilledFromStock: true, assignedStockId: stockId, status: 'Listo' });
    res.json({ success: true, message: 'Stock asignado y pedido marcado como listo.' });
  } else {
    res.status(400).json({ success: false, error: 'No hay suficiente stock disponible.' });
  }
});

router.post('/orders/progress-photo', verifyAdminSession, async (req, res) => {
  const { orderId, imageUrl, caption, stage } = req.body;
  const order = await orderService.getById(orderId);
  if (!order) return res.status(404).json({ success: false, error: 'Pedido no encontrado.' });

  const photos = order.progressPhotos || [];
  photos.push({
    id: `photo-${Date.now()}`,
    imageUrl,
    caption,
    stage,
    uploadedAt: new Date().toISOString(),
  });

  await orderService.update(orderId, { progressPhotos: photos });
  res.json({ success: true });
});

router.post('/orders/delete-progress-photo', verifyAdminSession, async (req, res) => {
  const { orderId, photoId } = req.body;
  const order = await orderService.getById(orderId);
  if (!order) return res.status(404).json({ success: false, error: 'Pedido no encontrado.' });

  const photos = (order.progressPhotos || []).filter((p: any) => p.id !== photoId);
  await orderService.update(orderId, { progressPhotos: photos });
  res.json({ success: true });
});

// ─── GALLERY ───
router.post('/gallery', verifyAdminSession, async (req, res) => {
  const item = await galleryService.create(req.body.item);
  res.json({ success: true, item });
});

router.delete('/gallery/:id', verifyAdminSession, async (req, res) => {
  await galleryService.delete(req.params.id);
  res.json({ success: true });
});

// ─── REVIEWS ───
router.post('/reviews/approve', verifyAdminSession, async (req, res) => {
  const { reviewId } = req.body;
  await reviewService.update(reviewId, { approved: true });
  res.json({ success: true });
});

router.post('/reviews/reply', verifyAdminSession, async (req, res) => {
  const { reviewId, replyText } = req.body;
  await reviewService.update(reviewId, { response: replyText, approved: true });
  res.json({ success: true });
});

router.delete('/reviews/:id', verifyAdminSession, async (req, res) => {
  await reviewService.delete(req.params.id);
  res.json({ success: true });
});

// ─── CONFIG ───
router.post('/config', verifyAdminSession, async (req, res) => {
  const updated = await configService.updateAppConfig(req.body.config);
  res.json({ success: true, config: updated });
});

// ─── STOCK ───
router.get('/stock', verifyAdminSession, async (req, res) => {
  const stock = await stockService.getAll();
  res.json({ success: true, stock });
});

router.post('/stock', verifyAdminSession, async (req, res) => {
  const item = await stockService.create(req.body.item);
  res.json({ success: true, stock: [item] });
});

router.delete('/stock/:id', verifyAdminSession, async (req, res) => {
  await stockService.delete(req.params.id);
  res.json({ success: true });
});

// ─── STORAGE (Gestión de Archivos) ───
router.get('/storage/list', verifyAdminSession, async (req, res) => {
  try {
    const { files, totalSize, totalFiles } = await storageService.listFiles();
    res.json({
      success: true,
      files,
      totalSize,
      totalFiles,
      firebaseFiles: [],  // No hay Firebase Storage
      localFiles: files,   // Todos son locales
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error al listar archivos.' });
  }
});

router.delete('/storage/delete', verifyAdminSession, async (req, res) => {
  try {
    const { fullPath } = req.query;
    if (!fullPath || typeof fullPath !== 'string') {
      return res.status(400).json({ success: false, error: 'Se requiere fullPath.' });
    }
    const deleted = await storageService.deleteFile(fullPath as string);
    res.json({ success: deleted, deleted: deleted ? 1 : 0 });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error al eliminar archivo.' });
  }
});

router.post('/storage/delete-bulk', verifyAdminSession, async (req, res) => {
  try {
    const { files } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, error: 'Se requiere lista de archivos.' });
    }
    let deleted = 0;
    let errors = 0;
    for (const file of files) {
      const ok = await storageService.deleteFile(file.fullPath || file.url || '');
      if (ok) deleted++;
      else errors++;
    }
    res.json({ success: true, deleted, errors });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error en eliminación masiva.' });
  }
});

router.post('/storage/migrate-local', verifyAdminSession, async (req, res) => {
  try {
    // En el nuevo sistema MySQL, todos los archivos ya son locales.
    // No hay Firebase Storage configurado, así que esta operación no aplica.
    res.json({
      success: true,
      total: 0,
      migrated: 0,
      message: 'Almacenamiento remoto no configurado. Todos los archivos se gestionan localmente.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error en migración.' });
  }
});

// ─── AUDIT (Auditoría de URLs en BD) ───
router.get('/audit/urls', verifyAdminSession, async (req, res) => {
  try {
    const urls: Array<{
      collection: string;
      docId: string;
      field: string;
      url: string;
      type: 'firebase' | 'local' | 'unsplash' | 'external' | 'empty';
    }> = [];    // Revisar productos (campo images)
      const products = await productService.getActive();
    for (const p of products) {
      const images: string[] = p.images || [];
      for (const img of images) {
        urls.push({
          collection: 'products',
          docId: p.id,
          field: 'images',
          url: img || '',
          type: getUrlType(img),
        });
      }
    }    // Revisar galería
      const galleryItems = await galleryService.getAll();
      for (const g of galleryItems) {
        urls.push({
          collection: 'gallery',
          docId: g.id,
          field: 'image_url',
          url: g.imageUrl || '',
          type: getUrlType(g.imageUrl),
        });
      }    // Revisar config (heroImage, logoUrl, faviconUrl)
      const config = await configService.getAppConfig();
    if (config) {
      const imgFields = ['heroImage', 'logoUrl', 'faviconUrl'] as const;
      for (const field of imgFields) {
        const val = (config as any)[field];
        if (val) {
          urls.push({
            collection: 'config',
            docId: 'app',
            field,
            url: val || '',
            type: getUrlType(val),
          });
        }
      }
    }

    // Calcular conteos
    const counts = { total: 0, firebase: 0, local: 0, unsplash: 0, external: 0, empty: 0 };
    for (const u of urls) {
      counts.total++;
      counts[u.type]++;
    }

    res.json({ success: true, urls, counts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error al auditar URLs.' });
  }
});

/** Determina el tipo de una URL de imagen */
function getUrlType(url: string): 'firebase' | 'local' | 'unsplash' | 'external' | 'empty' {
  if (!url || url === 'data:,') return 'empty';
  if (url.startsWith('/uploads/')) return 'local';
  if (url.includes('unsplash.com')) return 'unsplash';
  if (url.startsWith('http') || url.startsWith('https')) {
    if (url.includes('firebase') || url.includes('firebasestorage')) return 'firebase';
    return 'external';
  }
  if (url.startsWith('data:')) return 'local';
  return 'external';
}

export default router;
