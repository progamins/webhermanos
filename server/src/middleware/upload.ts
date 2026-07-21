import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';

// Ensure upload directory exists
if (!fs.existsSync(env.UPLOAD_DIR)) {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'image/x-icon', 'image/svg+xml', 'image/vnd.microsoft.icon',
    'application/pdf',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Formato "${file.mimetype}" no soportado. Sube JPEG, PNG, WEBP, GIF, SVG, ICO o PDF.`));
  }
};

// Disk storage for general image uploads (products, gallery, etc.)
export const upload = multer({
  storage: diskStorage,
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter,
});

// Memory storage for voucher uploads — avoids EACCES permission errors
// caused by diskStorage + saveFromPath (read/write cycle on the same file).
export const uploadVoucher = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter,
});
