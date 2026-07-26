import logger from '../lib/logger.js';
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { verifyAdminSession } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { UploadRepository } from '../repositories/index.js';
import { storageService } from '../services/StorageService.js';

const router = Router();
const uploadRepo = new UploadRepository();
const isVercel = process.env.VERCEL === 'true';

router.post('/', verifyAdminSession, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió la imagen.' });
    }

    // ── Obtener buffer y nombre del archivo ──
    // En Vercel (memory storage): req.file.buffer está disponible
    // En local (disk storage): req.file.path apunta al archivo en disco
    const buffer: Buffer = req.file.buffer || fs.readFileSync(req.file.path);
    const filename = req.file.filename || `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;
    const filePath = req.file.path; // undefined en Vercel (memory storage)

    // ── Guardar archivo ──
    // En Vercel: StorageService.saveFile() maneja Vercel Blob + hash + duplicados + BD
    // En local: el archivo ya fue guardado por multer en disco
    let imageUrl: string;

    if (isVercel) {
      // StorageService.saveFile() ya computa hash, detecta duplicados y registra en BD
      const result = await storageService.saveFile(
        buffer,
        req.file.originalname,
        req.file.mimetype,
        (req as any).adminRole || 'admin'
      );
      imageUrl = result.url;
      logger.info('Image saved to Vercel Blob', { service: 'Upload', url: imageUrl, size: buffer.length });
    } else {
      // ── Local: computar hash y detectar duplicados ──
      let contentHash: string | null = null;
      try {
        contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
        const existing = contentHash ? await uploadRepo.findByHash(contentHash) : null;
        if (existing) {
          // Duplicado: borrar archivo que multer ya escribió en disco
          try { fs.unlinkSync(filePath!); } catch { /* best-effort */ }
          logger.info('Duplicate detected, reusing existing file', { service: 'Upload', url: existing.url, filename });
          return res.json({ success: true, imageUrl: existing.url, duplicateReused: true });
        }
      } catch (hashErr) {
        logger.warn('Error computing hash', { service: 'Upload', error: (hashErr as Error)?.message });
      }

      // Local: el archivo ya está en disco por multer, solo registrar en BD
      imageUrl = `/uploads/${filename}`;

      try {
        await uploadRepo.create({
          filename,
          original_name: req.file.originalname,
          mime_type: req.file.mimetype,
          size_bytes: req.file.size,
          url: imageUrl,
          content_hash: contentHash,
          uploaded_by: (req as any).adminRole || 'admin',
        } as any);
      } catch (regErr: any) {
        // ER_DUP_ENTRY (1062) = another upload registered the same hash first (race condition)
        if (regErr?.errno === 1062 && contentHash && filePath) {
          try { fs.unlinkSync(filePath); } catch { /* best-effort */ }
          try {
            const existing = await uploadRepo.findByHash(contentHash);
            if (existing) {
              logger.info('Race condition: reusing existing', { service: 'Upload', url: existing.url, filename });
              return res.json({ success: true, imageUrl: existing.url, duplicateReused: true });
            }
          } catch { /* fall through */ }
          return res.status(409).json({ error: 'Conflicto: la imagen ya existe pero no se pudo recuperar.' });
        }
        logger.warn('Failed to register in uploads table', { service: 'Upload', error: (regErr as Error)?.message });
      }
    }

    res.json({ success: true, imageUrl });
  } catch (err: any) {
    logger.error('Upload error', { service: 'Upload', error: (err as Error)?.message });
    res.status(500).json({ error: 'Error al subir la imagen.' });
  }
});

export default router;
