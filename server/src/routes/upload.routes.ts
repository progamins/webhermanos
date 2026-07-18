import { Router } from 'express';
import { verifyAdminSession } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.post('/', verifyAdminSession, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió la imagen.' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    console.log(`[UPLOAD] Image saved: ${imageUrl} (${req.file.size} bytes)`);

    res.json({ success: true, imageUrl });
  } catch (err: any) {
    console.error('[UPLOAD Error]', err);
    res.status(500).json({ error: 'Error al subir la imagen.' });
  }
});

export default router;
