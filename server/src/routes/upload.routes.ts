import { Router } from 'express';
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

    const imageUrl = `/uploads/${req.file.filename}`;
    console.log(`[UPLOAD] Image saved: ${imageUrl} (${req.file.size} bytes)`);

    // Register upload in DB for traceability
    try {
      await uploadRepo.create({
        filename: req.file.filename,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        url: imageUrl,
        uploaded_by: (req as any).adminRole || 'admin',
      } as any);
    } catch (regErr) {
      // Non-blocking: log but don't fail the upload
      console.warn('[UPLOAD] Failed to register in uploads table:', regErr);
    }

    res.json({ success: true, imageUrl });
  } catch (err: any) {
    console.error('[UPLOAD Error]', err);
    res.status(500).json({ error: 'Error al subir la imagen.' });
  }
});

export default router;
