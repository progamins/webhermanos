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
    const data = req.body.product;
    // Upsert: if product already exists, update it; otherwise create new
    const existing = await productService.getById(data.id);
    let product;
    if (existing) {
      await productService.update(data.id, data);
      product = await productService.getById(data.id);
    } else {
      product = await productService.create(data);
    }
    res.json({ success: true, product });
  } catch (err: any) {
    console.error('[Admin Products] Error al guardar producto:', err);
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

// ─── STORAGE BACKFILL — registrar archivos existentes en la tabla uploads ───
router.post('/storage/backfill', verifyAdminSession, async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { env } = await import('../config/env.js');
    const { UploadRepository } = await import('../repositories/index.js');

    const uploadDir = path.resolve(env.UPLOAD_DIR);
    const uploadRepo = new UploadRepository();

    // Get already registered files
    const existing = await uploadRepo.findAll();
    const registeredNames = new Set(existing.map((u: any) => u.filename));

    // Scan disk
    let diskFiles: string[] = [];
    try {
      diskFiles = fs.readdirSync(uploadDir).filter((f: string) => f !== '.' && f !== '..');
    } catch { /* ignore */ }

    const registered: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    const extMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif',
      '.webp': 'image/webp', '.svg': 'image/svg+xml',
      '.avif': 'image/avif', '.ico': 'image/x-icon',
      '.mp4': 'video/mp4', '.webm': 'video/webm',
      '.lottie': 'application/json',
    };

    for (const file of diskFiles) {
      if (registeredNames.has(file)) {
        skipped.push(file);
        continue;
      }
      try {
        const stat = fs.statSync(path.join(uploadDir, file));
        if (!stat.isFile()) {
          skipped.push(file);
          continue;
        }
        const ext = path.extname(file).toLowerCase();
        const mime = extMap[ext] || 'application/octet-stream';
        await uploadRepo.create({
          filename: file,
          original_name: file,
          mime_type: mime,
          size_bytes: stat.size,
          url: `/uploads/${file}`,
          uploaded_by: 'backfill',
        } as any);
        registered.push(file);
      } catch (e: any) {
        errors.push(`${file}: ${e.message}`);
      }
    }

    await ActivityLogService.log(
      'Backfill de uploads',
      `${registered.length} archivos registrados, ${skipped.length} omitidos, ${errors.length} errores`,
      (req as any).adminRole || 'admin'
    );

    res.json({
      success: true,
      registered,
      registeredCount: registered.length,
      skippedCount: skipped.length,
      errorCount: errors.length,
      errors,
    });
  } catch (err: any) {
    console.error('[Backfill Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── STORAGE CLEANUP — eliminar archivos huérfanos ───
router.post('/storage/cleanup-orphans', verifyAdminSession, async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { env } = await import('../config/env.js');
    const { UploadRepository, ProductRepository, GalleryRepository } = await import('../repositories/index.js');

    const uploadDir = path.resolve(env.UPLOAD_DIR);
    const uploadRepo = new UploadRepository();
    const productRepo = new ProductRepository();
    const galleryRepo = new GalleryRepository();

    // 1. Collect all URLs referenced in DB
    const referencedUrls = new Set<string>();

    // Products images (JSON field)
    const products = await productRepo.findAll();
    for (const p of products) {
      const images: string[] = JSON.parse(typeof p.images === 'string' ? p.images : '[]');
      for (const img of images) {
        if (typeof img === 'string' && img.startsWith('/uploads/')) {
          referencedUrls.add(img.replace('/uploads/', ''));
        }
      }
    }

    // Gallery
    const gallery = await galleryRepo.findAll();
    for (const g of gallery) {
      if (g.image_url && g.image_url.startsWith('/uploads/')) {
        referencedUrls.add(g.image_url.replace('/uploads/', ''));
      }
    }

    // Config (hero, logo, favicon) — use ConfigService like the audit endpoint
    const { configService } = await import('../services/ConfigService.js');
    const config = await configService.getAppConfig();
    if (config) {
      for (const field of ['heroImage', 'logoUrl', 'faviconUrl'] as const) {
        const val = (config as any)[field];
        if (val && typeof val === 'string' && val.startsWith('/uploads/')) {
          referencedUrls.add(val.replace('/uploads/', ''));
        }
      }
    }

    // Uploads table
    const uploads = await uploadRepo.findAll();
    for (const u of uploads) {
      if (u.filename) referencedUrls.add(u.filename);
    }

    // Cake stock images
    try {
      const { CakeStockRepository } = await import('../repositories/index.js');
      const stockRepo = new CakeStockRepository();
      const stockItems = await stockRepo.findAll();
      for (const s of stockItems) {
        if (s.image_url && s.image_url.startsWith('/uploads/')) {
          referencedUrls.add(s.image_url.replace('/uploads/', ''));
        }
      }
    } catch { /* ignore */ }

    // Orders voucher URLs & progress photos
    try {
      const { OrderRepository } = await import('../repositories/index.js');
      const orderRepo = new OrderRepository();
      const orders = await orderRepo.findAll();
      for (const o of orders) {
        if (o.voucher_url && o.voucher_url.startsWith('/uploads/')) {
          referencedUrls.add(o.voucher_url.replace('/uploads/', ''));
        }
        if (o.progress_photos) {
          const photos: any[] = JSON.parse(typeof o.progress_photos === 'string' ? o.progress_photos : '[]');
          for (const p of photos) {
            if (p.imageUrl && p.imageUrl.startsWith('/uploads/')) {
              referencedUrls.add(p.imageUrl.replace('/uploads/', ''));
            }
          }
        }
      }
    } catch { /* ignore */ }

    // 2. Scan disk
    let diskFiles: string[] = [];
    try {
      diskFiles = fs.readdirSync(uploadDir).filter((f: string) => f !== '.' && f !== '..');
    } catch { /* ignore */ }

    // 3. Find orphans (on disk but not referenced anywhere)
    const orphans = diskFiles.filter(f => !referencedUrls.has(f) && f !== '.gitkeep');

    // 4. Delete orphans
    const deleted: string[] = [];
    const deleteErrors: string[] = [];
    for (const file of orphans) {
      try {
        fs.unlinkSync(path.join(uploadDir, file));
        deleted.push(file);
      } catch (e: any) {
        deleteErrors.push(`${file}: ${e.message}`);
      }
    }

    await ActivityLogService.log(
      'Limpieza de archivos huérfanos',
      `${deleted.length} eliminados de ${orphans.length} huérfanos encontrados`,
      (req as any).adminRole || 'admin'
    );

    res.json({
      success: true,
      orphansFound: orphans.length,
      deleted,
      deletedCount: deleted.length,
      errors: deleteErrors,
      errorCount: deleteErrors.length,
    });
  } catch (err: any) {
    console.error('[Cleanup Orphans Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── STORAGE FIND DUPLICATES — detectar imágenes duplicadas por hash ───
router.post('/storage/find-duplicates', verifyAdminSession, async (req, res) => {
  try {
    const crypto = await import('crypto');
    const fs = await import('fs');
    const path = await import('path');
    const { env } = await import('../config/env.js');
    const { UploadRepository, ProductRepository, GalleryRepository } = await import('../repositories/index.js');

    const uploadDir = path.resolve(env.UPLOAD_DIR);
    const uploadRepo = new UploadRepository();
    const productRepo = new ProductRepository();
    const galleryRepo = new GalleryRepository();

    // 1. Scan disk and compute SHA256 hash for each file
    let diskFiles: string[] = [];
    try {
      diskFiles = fs.readdirSync(uploadDir).filter((f: string) => f !== '.' && f !== '..' && !f.startsWith('.'));
    } catch { /* ignore */ }

    const fileHashes: Map<string, { filename: string; size: number; hash: string }> = new Map();
    const hashGroups: Map<string, { filename: string; size: number }[]> = new Map();

    for (const file of diskFiles) {
      try {
        const filePath = path.join(uploadDir, file);
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) continue;
        const buffer = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        fileHashes.set(file, { filename: file, size: stat.size, hash });

        if (!hashGroups.has(hash)) hashGroups.set(hash, []);
        hashGroups.get(hash)!.push({ filename: file, size: stat.size });
      } catch { /* skip unreadable */ }
    }

    // 2. Collect all URLs referenced in DB
    const referencedUrls = new Set<string>();

    // Products images
    const products = await productRepo.findAll();
    for (const p of products) {
      const images: string[] = JSON.parse(typeof p.images === 'string' ? p.images : '[]');
      for (const img of images) {
        if (typeof img === 'string' && img.startsWith('/uploads/')) {
          referencedUrls.add(img.replace('/uploads/', ''));
        }
      }
    }

    // Gallery
    const gallery = await galleryRepo.findAll();
    for (const g of gallery) {
      if (g.image_url && g.image_url.startsWith('/uploads/')) {
        referencedUrls.add(g.image_url.replace('/uploads/', ''));
      }
    }

    // Config
    const { configService } = await import('../services/ConfigService.js');
    const config = await configService.getAppConfig();
    if (config) {
      for (const field of ['heroImage', 'logoUrl', 'faviconUrl'] as const) {
        const val = (config as any)[field];
        if (val && typeof val === 'string' && val.startsWith('/uploads/')) {
          referencedUrls.add(val.replace('/uploads/', ''));
        }
      }
    }

    // Uploads table
    const uploads = await uploadRepo.findAll();
    for (const u of uploads) {
      if (u.filename) referencedUrls.add(u.filename);
    }

    // Cake stock images
    try {
      const { CakeStockRepository } = await import('../repositories/index.js');
      const stockRepo = new CakeStockRepository();
      const stockItems = await stockRepo.findAll();
      for (const s of stockItems) {
        if (s.image_url && s.image_url.startsWith('/uploads/')) {
          referencedUrls.add(s.image_url.replace('/uploads/', ''));
        }
      }
    } catch { /* ignore */ }

    // Orders voucher URLs & progress photos
    try {
      const { OrderRepository } = await import('../repositories/index.js');
      const orderRepo = new OrderRepository();
      const orders = await orderRepo.findAll();
      for (const o of orders) {
        if (o.voucher_url && o.voucher_url.startsWith('/uploads/')) {
          referencedUrls.add(o.voucher_url.replace('/uploads/', ''));
        }
        if (o.progress_photos) {
          const photos: any[] = JSON.parse(typeof o.progress_photos === 'string' ? o.progress_photos : '[]');
          for (const p of photos) {
            if (p.imageUrl && p.imageUrl.startsWith('/uploads/')) {
              referencedUrls.add(p.imageUrl.replace('/uploads/', ''));
            }
          }
        }
      }
    } catch { /* ignore */ }

    // 3. Build duplicate groups (only groups with 2+ files)
    const duplicateGroups: Array<{
      hash: string;
      totalSize: number;
      savedSpace: number;
      files: Array<{ filename: string; size: number; used: boolean; usage: string[] }>;
    }> = [];

    for (const [hash, group] of hashGroups.entries()) {
      if (group.length < 2) continue;

      const filesWithUsage = group.map(f => {
        const usage: string[] = [];
        const filename = f.filename;

        // Check all possible DB references
        if (referencedUrls.has(filename)) usage.push('uploads');

        // Check if referenced as product image
        for (const p of products) {
          const images: string[] = JSON.parse(typeof p.images === 'string' ? p.images : '[]');
          if (images.includes(`/uploads/${filename}`)) {
            usage.push(`producto:${p.name || p.id}`);
          }
        }

        for (const g of gallery) {
          if (g.image_url === `/uploads/${filename}`) {
            usage.push(`galería:${g.title || g.id}`);
          }
        }

        if (config) {
          for (const field of ['heroImage', 'logoUrl', 'faviconUrl'] as const) {
            if ((config as any)[field] === `/uploads/${filename}`) {
              usage.push(`config:${field}`);
            }
          }
        }

        return {
          filename: f.filename,
          size: f.size,
          used: usage.length > 0,
          usage,
        };
      });

      const usedFiles = filesWithUsage.filter(f => f.used);
      const unusedFiles = filesWithUsage.filter(f => !f.used);

      // Calculate space savings from removing duplicates
      const totalSize = group.reduce((sum, f) => sum + f.size, 0);
      const spaceIfKeepOne = group.length > 0 ? group[0].size : 0; // keep one copy
      const savedSpace = totalSize - spaceIfKeepOne;

      duplicateGroups.push({
        hash: hash.slice(0, 16) + '…',
        totalSize,
        savedSpace,
        files: filesWithUsage,
      });
    }

    // Sort by space saved (largest first)
    duplicateGroups.sort((a, b) => b.savedSpace - a.savedSpace);

    // Summary counts
    let totalDuplicates = 0;
    let totalRemovable = 0;
    let totalBytesRemovable = 0;
    for (const group of duplicateGroups) {
      const unused = group.files.filter(f => !f.used);
      totalDuplicates += group.files.length;
      totalRemovable += unused.length;
      totalBytesRemovable += unused.reduce((s, f) => s + f.size, 0);
    }

    res.json({
      success: true,
      totalFiles: diskFiles.length,
      duplicateGroups,
      groupsCount: duplicateGroups.length,
      totalDuplicateFiles: totalDuplicates,
      totalRemovable,
      totalBytesRemovable,
      totalSizeRemovableFormatted: formatBytes(totalBytesRemovable),
    });
  } catch (err: any) {
    console.error('[Find Duplicates Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

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

// ─── DIAGNOSTICS ───
router.get('/diagnostics', verifyAdminSession, async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { env } = await import('../config/env.js');
    const { getPool } = await import('../config/db.js');
    const { productService } = await import('../services/ProductService.js');
    const { galleryService } = await import('../services/GalleryService.js');
    const { configService } = await import('../services/ConfigService.js');

    const uploadsDir = path.resolve(env.UPLOAD_DIR);
    const db = getPool();

    // 1. DB Connection health
    let dbStatus = 'ok';
    let dbError: string | null = null;
    try {
      const conn = await db.getConnection();
      await conn.ping();
      conn.release();
    } catch (e: any) {
      dbStatus = 'error';
      dbError = e.message;
    }

    // 2. Files on disk in uploads dir
    let diskFiles: string[] = [];
    try {
      diskFiles = fs.readdirSync(uploadsDir).filter(f => f !== '.' && f !== '..');
    } catch { /* ignore */ }

    // 3. Collect all URLs referenced in DB
    const dbUrls: string[] = [];
    try {
      const products = await productService.getAll();
      for (const p of products) {
        const imgs: string[] = p.images || [];
        for (const img of imgs) {
          if (img.startsWith('/uploads/')) dbUrls.push(img);
        }
      }
    } catch { /* ignore */ }

    try {
      const galleryItems = await galleryService.getAll();
      for (const g of galleryItems) {
        if (g.imageUrl?.startsWith('/uploads/')) dbUrls.push(g.imageUrl);
      }
    } catch { /* ignore */ }

    try {
      const config = await configService.getAppConfig();
      for (const field of ['heroImage', 'logoUrl', 'faviconUrl'] as const) {
        const val = (config as any)[field];
        if (val && typeof val === 'string' && val.startsWith('/uploads/')) {
          dbUrls.push(val);
        }
      }
    } catch { /* ignore */ }

    // Include uploads table (registered files)
    try {
      const { UploadRepository } = await import('../repositories/index.js');
      const uploadRepo = new UploadRepository();
      const uploads = await uploadRepo.findAll();
      for (const u of uploads) {
        if (u.url && u.url.startsWith('/uploads/')) dbUrls.push(u.url);
      }
    } catch { /* ignore */ }

    // Cake stock images
    try {
      const { CakeStockRepository } = await import('../repositories/index.js');
      const stockRepo = new CakeStockRepository();
      const stockItems = await stockRepo.findAll();
      for (const s of stockItems) {
        if (s.image_url && s.image_url.startsWith('/uploads/')) {
          dbUrls.push(s.image_url);
        }
      }
    } catch { /* ignore */ }

    // Orders voucher URLs & progress photos
    try {
      const { OrderRepository } = await import('../repositories/index.js');
      const orderRepo = new OrderRepository();
      const orders = await orderRepo.findAll();
      for (const o of orders) {
        if (o.voucher_url && o.voucher_url.startsWith('/uploads/')) {
          dbUrls.push(o.voucher_url);
        }
        if (o.progress_photos) {
          const photos: any[] = JSON.parse(typeof o.progress_photos === 'string' ? o.progress_photos : '[]');
          for (const p of photos) {
            if (p.imageUrl && p.imageUrl.startsWith('/uploads/')) {
              dbUrls.push(p.imageUrl);
            }
          }
        }
      }
    } catch { /* ignore */ }

    // 4. Compare: orphaned files (on disk but not in DB)
    const urlSet = new Set(dbUrls.map(u => u.replace('/uploads/', '')));
    const orphanedFiles = diskFiles.filter(f => !urlSet.has(f) && f !== '.gitkeep');

    // 5. Missing files (in DB but not on disk)
    const diskSet = new Set(diskFiles);
    const missingFiles = dbUrls
      .map(u => u.replace('/uploads/', ''))
      .filter(f => !diskSet.has(f));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      db: {
        status: dbStatus,
        error: dbError,
        config: {
          host: env.DB_HOST,
          port: env.DB_PORT,
          database: env.DB_NAME,
          user: env.DB_USER,
        },
      },
      storage: {
        uploadDir: uploadsDir,
        totalFiles: diskFiles.length,
        totalSizeBytes: diskFiles.reduce((sum, f) => {
          try { return sum + fs.statSync(path.join(uploadsDir, f)).size; } catch { return sum; }
        }, 0),
      },
      integrity: {
        orphanedFiles,
        missingFiles,
        orphanedCount: orphanedFiles.length,
        missingCount: missingFiles.length,
      },
    });
  } catch (err: any) {
    console.error('[Diagnostics Error]', err);
    res.status(500).json({ success: false, error: err.message });
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
