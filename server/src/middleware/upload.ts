import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';

const isVercel = process.env.VERCEL === 'true';

// 🌀 VERCEL: No podemos usar diskStorage porque el filesystem es de solo lectura.
//    Usamos memoryStorage y luego StorageService.saveFile() se encarga de
//    subir a Vercel Blob o al sistema de archivos local según corresponda.

// Disk storage for local development (escribe archivos al disco)
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

// Ensure upload directory exists (only needed for local disk storage)
if (!isVercel && !fs.existsSync(env.UPLOAD_DIR)) {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
}

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

// Memory storage for Vercel (serverless, no filesystem writes)
// Disk storage for local development
export const upload = multer({
  storage: isVercel ? multer.memoryStorage() : diskStorage,
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter,
});

// Memory storage for voucher uploads — avoids EACCES permission errors
export const uploadVoucher = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter,
});
