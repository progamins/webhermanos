import logger from '../lib/logger.js';
import { Router } from 'express';
import fs from 'fs';
import crypto from 'crypto';
import { verifyAdminSession } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { UploadRepository } from '../repositories/index.js';

const router = Router();
const uploadRepo = new UploadRepository();

router.post('/', verifyAdminSession, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió la imagen.' });
    }

    const filePath = req.file.path;
    const filename = req.file.filename;

    // ── Compute SHA256 hash to detect duplicates ──
    let contentHash: string | null = null;
    try {
      const buffer = fs.readFileSync(filePath);
      contentHash = crypto.createHash('sha256').update(buffer).digest('hex');

      // Check if a file with the same hash already exists
      const existing = contentHash ? await uploadRepo.findByHash(contentHash) : null;
      if (existing) {
        // Duplicate found! Delete the newly saved file and return the existing URL
        try { fs.unlinkSync(filePath); } catch { /* best-effort */ }
        logger.info('Duplicate detected, reusing existing file', { service: 'Upload', url: existing.url, filename });

        return res.json({ success: true, imageUrl: existing.url, duplicateReused: true });
      }
    } catch (hashErr) {
      // Non-blocking: hash computation failure shouldn't break the upload
      logger.warn('Error computing hash', { service: 'Upload', error: (hashErr as Error)?.message });
    }

    const imageUrl = `/uploads/${filename}`;
    logger.info('Image saved', { service: 'Upload', url: imageUrl, size: req.file.size, hash: contentHash?.slice(0, 12) });

    // Register upload in DB for traceability
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
      // Delete the new file and return the existing one
      if (regErr?.errno === 1062 && contentHash) {
        try { fs.unlinkSync(filePath); } catch { /* best-effort */ }
        try {
          const existing = await uploadRepo.findByHash(contentHash);
          if (existing) {
            logger.info('Race condition: reusing existing', { service: 'Upload', url: existing.url, filename });
            return res.json({ success: true, imageUrl: existing.url, duplicateReused: true });
          }
        } catch { /* fall through */ }
        // Could not recover — file was deleted but existing record not found
        return res.status(409).json({ error: 'Conflicto: la imagen ya existe pero no se pudo recuperar.' });
      }
      // Non-blocking: log but don't fail the upload
      logger.warn('Failed to register in uploads table', { service: 'Upload', error: (regErr as Error)?.message });
    }

    res.json({ success: true, imageUrl });
  } catch (err: any) {
    logger.error('Upload error', { service: 'Upload', error: (err as Error)?.message });
    res.status(500).json({ error: 'Error al subir la imagen.' });
  }
});

export default router;
