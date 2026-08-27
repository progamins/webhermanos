/**
 * 🧹 ImageMaintenanceService — detecta y elimina automáticamente imágenes
 * rotas o no reconocidas de la base de datos.
 *
 * Qué hace `sweep()`:
 * 1. Recorre todas las referencias de imagen en la BD (productos, galería,
 *    stock físico, config, pedidos).
 * 2. Valida cada una:
 *    - Uploads locales: el archivo existe en disco y su contenido es una
 *      imagen válida (magic bytes). Archivos con contenido no reconocido
 *      (ej. una página HTML guardada como .jpg) se consideran rotos.
 *    - URLs externas: responden 2xx con content-type de imagen.
 *    - En Vercel (sin FS persistente): valida contra la tabla `uploads`.
 * 3. Elimina las referencias rotas:
 *    - Productos: quita la URL del array `images`.
 *    - Galería: borra el ítem (su único propósito es la imagen).
 *    - Stock físico: limpia `image_url` (queda NULL).
 *    - Config: limpia heroImage/logoUrl/faviconUrl.
 *    - Pedidos: limpia el voucher y elimina fotos de progreso rotas.
 *
 * Se puede ejecutar con `dryRun: true` (solo reporta) o de forma programada
 * en el servidor local. Endpoint admin: POST /api/admin/images/cleanup-broken.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import logger from '../lib/logger.js';
import { ActivityLogService } from './ActivityService.js';
import { productService } from './ProductService.js';
import { galleryService } from './GalleryService.js';
import { stockService } from './StockService.js';
import { configService } from './ConfigService.js';
import { orderService } from './OrderService.js';
import {
  ProductRepository,
  GalleryRepository,
  CakeStockRepository,
  OrderRepository,
  UploadRepository,
  ConfigRepository,
} from '../repositories/index.js';

const productRepo = new ProductRepository();
const galleryRepo = new GalleryRepository();
const stockRepo = new CakeStockRepository();
const orderRepo = new OrderRepository();
const uploadRepo = new UploadRepository();
const configRepo = new ConfigRepository();

// Clave en la tabla `config` donde se acumulan los reportes de imágenes rotas
// enviados desde el navegador (ver reportBrokenImages).
const BROKEN_REPORTS_KEY = 'broken_image_reports';

// Extensiones de media NO-imagen que NUNCA deben marcarse como "imagen rota"
// (p.ej. cake.lottie, video_login.mp4, vouchers PDF). Se validan por contenido.
const MEDIA_EXTS = new Set(['.lottie', '.json', '.mp4', '.webm', '.mov', '.pdf']);

const isVercel = process.env.VERCEL === 'true';

// Directorios de assets estáticos del cliente (mismo patrón que app.ts)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');
const CLIENT_PUBLIC = path.resolve(__dirname, '../../client/public');// ─── Magic bytes de formatos de imagen conocidos ───
// "Imágenes que no se reconozcan" = archivos cuyo contenido no coincide con
// ningún formato de imagen válido (p.ej. un HTML de error salvado como .jpg).
const IMAGE_MAGIC: Array<{ name: string; match: (buf: Buffer) => boolean }> = [
  { name: 'JPEG', match: (b) => b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
  { name: 'PNG', match: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 },
  { name: 'GIF', match: (b) => b.length >= 6 && ['GIF87a', 'GIF89a'].includes(b.toString('ascii', 0, 6)) },
  { name: 'WebP', match: (b) => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { name: 'AVIF/HEIC', match: (b) => b.length >= 8 && b.toString('ascii', 4, 8) === 'ftyp' },
  { name: 'ICO', match: (b) => b.length >= 4 && b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00 },
  { name: 'BMP', match: (b) => b.length >= 2 && b[0] === 0x42 && b[1] === 0x4D },
  {
    name: 'SVG',
    match: (b) => {
      const s = b.toString('utf8', 0, 1024).trimStart();
      return s.startsWith('<svg') || s.startsWith('<?xml') || s.startsWith('<!DOCTYPE svg');
    },
  },
];

interface ImageRef {
  source: 'product' | 'gallery' | 'stock' | 'config' | 'order-voucher' | 'order-photo';
  id: string;
  field: string;
  url: string;
}

export interface ImageSweepReport {
  dryRun: boolean;
  checked: number;
  broken: number;
  removed: {
    products: number;
    gallery: number;
    stock: number;
    config: number;
    orders: number;
  };
  details: Array<{ source: string; id: string; field: string; url: string; reason: string }>;
}

function parseJsonArray(value: any, fallback: any[] = []): any[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/** Ejecuta tareas con concurrencia limitada (evita saturar el servidor). */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export class ImageMaintenanceService {
  // ═══════════════════════════════════════════════════════════════
  // 1. Recolección de referencias
  // ═══════════════════════════════════════════════════════════════
  private async collectRefs(): Promise<ImageRef[]> {
    const refs: ImageRef[] = [];

    // Productos (images es un array JSON)
    const products = await productRepo.findAll();
    for (const p of products) {
      const images = parseJsonArray(p.images, []);
      for (const img of images) {
        if (typeof img === 'string' && img.trim()) {
          refs.push({ source: 'product', id: p.id, field: 'images', url: img.trim() });
        }
      }
    }

    // Galería
    const gallery = await galleryRepo.findAll();
    for (const g of gallery) {
      if (g.image_url && g.image_url.trim()) {
        refs.push({ source: 'gallery', id: g.id, field: 'image_url', url: g.image_url.trim() });
      }
    }

    // Stock físico
    const stock = await stockRepo.findAll();
    for (const s of stock) {
      if (s.image_url && s.image_url.trim()) {
        refs.push({ source: 'stock', id: s.id, field: 'image_url', url: s.image_url.trim() });
      }
    }

    // Config (hero/logo/favicon)
    const config = await configService.getAppConfig();
    if (config) {
      for (const field of ['heroImage', 'aboutImage', 'logoUrl', 'faviconUrl'] as const) {
        const url = (config as any)[field];
        if (typeof url === 'string' && url.trim()) {
          refs.push({ source: 'config', id: 'app_config', field, url: url.trim() });
        }
      }
    }

    // Pedidos (voucher + fotos de progreso)
    const orders = await orderRepo.findAll();
    for (const o of orders) {
      if (o.voucher_url && o.voucher_url.trim()) {
        refs.push({ source: 'order-voucher', id: o.id, field: 'voucher_url', url: o.voucher_url.trim() });
      }
      const photos = parseJsonArray(o.progress_photos, []);
      for (const photo of photos) {
        if (photo && typeof photo.imageUrl === 'string' && photo.imageUrl.trim()) {
          refs.push({ source: 'order-photo', id: o.id, field: 'progress_photos', url: photo.imageUrl.trim() });
        }
      }
    }

    return refs;
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. Validación
  // ═══════════════════════════════════════════════════════════════
  /** Valida el contenido de media NO-imagen (lottie/json/video/pdf). */
  private isMediaContentValid(ext: string, head: Buffer): { valid: boolean; reason?: string } {
    const headStr = head.toString('utf8', 0, 64).trimStart();
    if (ext === '.lottie' || ext === '.json') {
      // .lottie puede ser un ZIP (formato comprimido) o JSON plano
      const isZip = head.toString('ascii', 0, 2) === 'PK';
      const isJson = headStr.startsWith('{') || headStr.startsWith('[') || headStr.startsWith('"');
      return isZip || isJson
        ? { valid: true }
        : { valid: false, reason: 'contenido no reconocido (Lottie/JSON inválido)' };
    }
    if (ext === '.pdf') {
      return headStr.startsWith('%PDF')
        ? { valid: true }
        : { valid: false, reason: 'PDF inválido' };
    }
    // Video/audio: contenedor MP4/MOV ('ftyp') o WebM/Matroska (EBML)
    const isMp4 = head.toString('ascii', 4, 8) === 'ftyp';
    const isEbml = head.length >= 4 && head[0] === 0x1A && head[1] === 0x45 && head[2] === 0xDF && head[3] === 0xA3;
    return isMp4 || isEbml
      ? { valid: true }
      : { valid: false, reason: 'contenido no reconocido (video/audio inválido)' };
  }

  /** PNG truncado: el marcador IEND debe estar en los últimos 12 bytes. */
  private async pngHasIend(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(filePath);
      if (stat.size < 12) return false;
      const fd = await fs.promises.open(filePath, 'r');
      try {
        const tail = Buffer.alloc(12);
        await fd.read(tail, 0, 12, stat.size - 12);
        return tail.toString('ascii', 4, 8) === 'IEND';
      } finally {
        await fd.close();
      }
    } catch {
      return false;
    }
  }

  private async isUploadValid(filename: string): Promise<{ valid: boolean; reason?: string }> {
    // En Vercel no hay FS persistente: validar contra la tabla uploads.
    if (isVercel) {
      try {
        const upload = await uploadRepo.findByFilename(filename);
        if (!upload) return { valid: false, reason: 'no registrado en uploads' };
        return { valid: true };
      } catch {
        return { valid: false, reason: 'error al consultar uploads' };
      }
    }

    const filePath = path.join(env.UPLOAD_DIR, filename);
    let stat;
    try {
      stat = await fs.promises.stat(filePath);
    } catch {
      return { valid: false, reason: 'archivo no encontrado en disco' };
    }
    if (!stat.isFile()) return { valid: false, reason: 'no es un archivo' };
    if (stat.size === 0) return { valid: false, reason: 'archivo vacío (0 bytes)' };

    let head: Buffer;
    try {
      const fd = await fs.promises.open(filePath, 'r');
      try {
        head = Buffer.alloc(64);
        await fd.read(head, 0, 64, 0);
      } finally {
        await fd.close();
      }
    } catch {
      return { valid: false, reason: 'no se pudo leer el archivo' };
    }

    const ext = path.extname(filename).toLowerCase();

    // 🎬 Media NO-imagen (lottie, video, voucher PDF): si su contenido es
    //    coherente con su tipo, es VÁLIDA — nunca se marca como imagen rota.
    //    (el usuario decide manualmente si quiere eliminarla).
    if (MEDIA_EXTS.has(ext)) {
      const media = this.isMediaContentValid(ext, head);
      if (!media.valid) return media;
      // Sin marca de contenido pero registrada como media → válida.
      try {
        const upload = await uploadRepo.findByFilename(filename);
        if (upload?.mime_type) return { valid: true };
      } catch { /* ignorar */ }
      return media;
    }

    // Imagen: debe coincidir con un formato de imagen conocido.
    const imageMatch = IMAGE_MAGIC.find((m) => m.match(head));
    if (imageMatch) {
      // PNG truncado (sin IEND al final) → el navegador no puede renderizarlo.
      if (ext === '.png' && !(await this.pngHasIend(filePath))) {
        return { valid: false, reason: 'PNG truncado (sin marcador IEND al final)' };
      }
      return { valid: true };
    }

    // Contenido no reconocido: si la tabla uploads lo registra con algún mime,
    // respetarlo (formato válido no listado). Sin registro y sin magic → roto.
    try {
      const upload = await uploadRepo.findByFilename(filename);
      if (upload?.mime_type) return { valid: true };
    } catch {
      /* ignorar */
    }
    return { valid: false, reason: 'contenido no reconocido (no es una imagen válida)' };
  }

  private async isStaticAssetValid(urlPath: string): Promise<boolean> {
    // Assets estáticos de la app (ej. /logo.png, /favicon.svg): en Vercel los
    // sirve la CDN; en local viven en client/dist o client/public.
    if (isVercel) return true;
    const relative = urlPath.replace(/^\//, '');
    for (const base of [CLIENT_DIST, CLIENT_PUBLIC]) {
      try {
        const full = path.join(base, relative);
        const stat = await fs.promises.stat(full);
        if (stat.isFile()) return true;
      } catch {
        /* siguiente */
      }
    }
    return false;
  }

  private async isExternalValid(url: string): Promise<boolean> {
    const attempt = async (method: 'HEAD' | 'GET') => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      try {
        const res = await fetch(url, {
          method,
          signal: controller.signal,
          redirect: 'follow',
          headers: { 'user-agent': 'MaisonRosas-ImageCheck/1.0' },
        });
        if (!res.ok) return false;
        const ct = res.headers.get('content-type') || '';
        // Content-type ausente → asumir válido (solo si responde 2xx)
        return !ct || ct.startsWith('image/');
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
      }
    };
    if (await attempt('HEAD')) return true;
    return attempt('GET');
  }

  private async validateRef(ref: ImageRef, reportedBroken: Set<string>): Promise<{ broken: boolean; reason?: string }> {
    const url = ref.url;
    if (url.startsWith('data:')) return { broken: false };

    // 📸 Reportada como rota desde el navegador (no carga en la web).
    if (reportedBroken.has(url)) {
      return { broken: true, reason: 'no carga en el navegador (reportada)' };
    }

    // URL externa (Unsplash, etc.) — verificar primero porque es más rápido
    // y evita que URLs externas caigan en la validación de uploads.
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const ok = await this.isExternalValid(url);
      return ok ? { broken: false } : { broken: true, reason: 'no responde o no es una imagen (HTTP)' };
    }

    // Upload local (/uploads/xxx o /api/uploads/xxx)
    const uploadMatch = url.match(/^\/(?:api\/)?uploads\/(.+)$/);
    if (uploadMatch) {
      const filename = uploadMatch[1];
      const result = await this.isUploadValid(filename);
      return result.valid ? { broken: false } : { broken: true, reason: result.reason };
    }

    // Ruta raíz relativa (asset estático)
    if (url.startsWith('/')) {
      const ok = await this.isStaticAssetValid(url);
      return ok ? { broken: false } : { broken: true, reason: 'asset estático no encontrado' };
    }

    return { broken: false };
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. Limpieza
  // ═══════════════════════════════════════════════════════════════
  private async applyRemovals(
    refs: ImageRef[],
    broken: Map<string, ImageRef[]>,
    report: ImageSweepReport
  ): Promise<void> {
    const bySource = (source: ImageRef['source']) => refs.filter((r) => broken.get(r.url)?.some((b) => b.source === source && b.id === r.id && b.field === r.field));

    // ── Productos: filtrar URLs rotas del array images ──
    const brokenProductUrls = new Set(
      [...broken.values()].flat().filter((r) => r.source === 'product').map((r) => r.url)
    );
    if (brokenProductUrls.size > 0) {
      const products = await productRepo.findAll();
      for (const p of products) {
        const images = parseJsonArray(p.images, []).filter((u: any) => !brokenProductUrls.has(u));
        if (images.length !== parseJsonArray(p.images, []).length) {
          if (!report.dryRun) await productService.update(p.id, { images });
          report.removed.products += parseJsonArray(p.images, []).length - images.length;
        }
      }
    }

    // ── Galería: borrar el ítem (su contenido es la imagen) ──
    const brokenGallery = [...broken.values()].flat().filter((r) => r.source === 'gallery');
    for (const r of brokenGallery) {
      if (!report.dryRun) await galleryService.delete(r.id);
      report.removed.gallery++;
    }

    // ── Stock físico: limpiar image_url → NULL ──
    const brokenStock = [...broken.values()].flat().filter((r) => r.source === 'stock');
    for (const r of brokenStock) {
      if (!report.dryRun) await stockRepo.update(r.id, { image_url: null });
      report.removed.stock++;
    }

    // ── Config: limpiar campos rotos ──
    const brokenConfig = [...broken.values()].flat().filter((r) => r.source === 'config');
    if (brokenConfig.length > 0) {
      const patch: Record<string, string> = {};
      for (const r of brokenConfig) patch[r.field] = '';
      if (!report.dryRun) await configService.updateAppConfig(patch);
      report.removed.config += brokenConfig.length;
    }

    // ── Pedidos: limpiar voucher y fotos de progreso rotas ──
    const brokenVouchers = [...broken.values()].flat().filter((r) => r.source === 'order-voucher');
    for (const r of brokenVouchers) {
      if (!report.dryRun) await orderService.update(r.id, { voucherUrl: '', voucherName: '' });
      report.removed.orders++;
    }

    const brokenPhotosByOrder = new Map<string, Set<string>>();
    for (const r of [...broken.values()].flat().filter((x) => x.source === 'order-photo')) {
      if (!brokenPhotosByOrder.has(r.id)) brokenPhotosByOrder.set(r.id, new Set());
      brokenPhotosByOrder.get(r.id)!.add(r.url);
    }
    if (brokenPhotosByOrder.size > 0) {
      const orders = await orderRepo.findAll();
      for (const o of orders) {
        const brokenUrls = brokenPhotosByOrder.get(o.id);
        if (!brokenUrls) continue;
        const photos = parseJsonArray(o.progress_photos, []);
        const filtered = photos.filter((p: any) => !brokenUrls.has(p?.imageUrl));
        if (filtered.length !== photos.length) {
          if (!report.dryRun) await orderService.update(o.id, { progressPhotos: filtered });
          report.removed.orders += photos.length - filtered.length;
        }
      }
    }
  }

  /** Carga las URLs reportadas como rotas desde el navegador (config). */
  private async loadReportedBroken(): Promise<Set<string>> {
    try {
      const row = await configRepo.findByKey(BROKEN_REPORTS_KEY);
      if (!row) return new Set();
      const parsed = JSON.parse(row.config_value);
      if (!Array.isArray(parsed)) return new Set();
      // Solo se consideran rotas las reportadas al menos 2 veces (evita
      // falsos positivos por errores de red transitorios).
      return new Set(parsed.filter((r: any) => Number(r?.count) >= 2).map((r: any) => r?.url).filter(Boolean));
    } catch {
      return new Set();
    }
  }

  /** Quita URLs de la lista de reportes (después de eliminarlas). */
  private async clearReportedBroken(urls: string[]): Promise<void> {
    try {
      const row = await configRepo.findByKey(BROKEN_REPORTS_KEY);
      if (!row) return;
      const parsed = JSON.parse(row.config_value);
      if (!Array.isArray(parsed)) return;
      const remove = new Set(urls);
      const remaining = parsed.filter((r: any) => !remove.has(r?.url));
      await configRepo.upsert(BROKEN_REPORTS_KEY, remaining);
    } catch {
      /* no crítico */
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Sweep principal
  // ═══════════════════════════════════════════════════════════════
  async sweep({ dryRun = false }: { dryRun?: boolean } = {}): Promise<ImageSweepReport> {
    const report: ImageSweepReport = {
      dryRun,
      checked: 0,
      broken: 0,
      removed: { products: 0, gallery: 0, stock: 0, config: 0, orders: 0 },
      details: [],
    };

    const refs = await this.collectRefs();
    report.checked = refs.length;

    // URLs reportadas como rotas desde el navegador
    const reportedBroken = await this.loadReportedBroken();

    // Validar cada URL única una sola vez
    const uniqueUrls = [...new Set(refs.map((r) => r.url))];
    const results = await mapWithConcurrency(uniqueUrls, 5, async (url) => {
      const sample = refs.find((r) => r.url === url)!;
      return { url, result: await this.validateRef(sample, reportedBroken) };
    });

    const brokenByUrl = new Map<string, { broken: boolean; reason?: string }>();
    for (const { url, result } of results) brokenByUrl.set(url, result);

    const brokenRefs = refs.filter((r) => brokenByUrl.get(r.url)?.broken);
    report.broken = brokenRefs.length;
    report.details = brokenRefs.map((r) => ({
      source: r.source,
      id: r.id,
      field: r.field,
      url: r.url,
      reason: brokenByUrl.get(r.url)?.reason || 'imagen rota',
    }));

    const brokenMap = new Map<string, ImageRef[]>();
    for (const r of brokenRefs) {
      if (!brokenMap.has(r.url)) brokenMap.set(r.url, []);
      brokenMap.get(r.url)!.push(r);
    }

    if (report.broken > 0) {
      await this.applyRemovals(refs, brokenMap, report);

      // Limpiar de la lista de reportes las URLs que sí se eliminaron
      if (!dryRun) {
        const removedReported = brokenRefs.map((r) => r.url).filter((u) => reportedBroken.has(u));
        if (removedReported.length > 0) {
          await this.clearReportedBroken(removedReported);
        }
      }
    }

    // Registrar en el log de actividad (solo cuando hay cambios reales)
    if (!dryRun && report.broken > 0) {
      const summary = [
        `📸 ${report.broken} imagen(es) rota(s)`,
        `productos: ${report.removed.products}`,
        `galería: ${report.removed.gallery}`,
        `stock: ${report.removed.stock}`,
        `config: ${report.removed.config}`,
        `pedidos: ${report.removed.orders}`,
      ].join(' | ');
      await ActivityLogService.log('Limpieza automática de imágenes rotas', summary, 'system');
    }

    logger.info('Image sweep completado', { service: 'ImageMaintenance', report: { checked: report.checked, broken: report.broken, removed: report.removed, dryRun } });
    return report;
  }
}

export const imageMaintenanceService = new ImageMaintenanceService();

/**
 * 📸 Registra URLs reportadas como rotas desde el navegador (onError de <img>).
 * Se acumulan en la tabla `config` con un contador; el sweep solo considera
 * rotas las reportadas ≥ 2 veces (evita falsos positivos por red transitoria).
 */
export async function reportBrokenImages(urls: string[]): Promise<void> {
  try {
    const row = await configRepo.findByKey(BROKEN_REPORTS_KEY);
    let reports: Array<{ url: string; count: number }> = [];
    if (row) {
      const parsed = JSON.parse(row.config_value);
      if (Array.isArray(parsed)) reports = parsed;
    }
    const byUrl = new Map(reports.map((r) => [r.url, r]));
    for (const url of urls) {
      if (!url || typeof url !== 'string') continue;
      const existing = byUrl.get(url);
      if (existing) {
        existing.count = Math.min((existing.count || 1) + 1, 10);
      } else {
        byUrl.set(url, { url, count: 1 });
      }
    }
    // Mantener la lista acotada (las más recientes primero)
    const merged = [...byUrl.values()].slice(-1000);
    await configRepo.upsert(BROKEN_REPORTS_KEY, merged);
  } catch (err) {
    logger.warn('Error guardando reporte de imagen rota', { service: 'ImageMaintenance', error: (err as Error)?.message });
  }
}
