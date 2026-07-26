import logger from '../lib/logger.js';
import { uploadToRow } from '../lib/rowMapper.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { UploadRepository } from '../repositories/index.js';

const uploadRepo = new UploadRepository();
const isVercel = process.env.VERCEL === 'true';

// Lazy import Vercel Blob only when running on Vercel
let vercelBlob: typeof import('@vercel/blob') | null = null;
async function getVercelBlob() {
  if (!vercelBlob) {
    vercelBlob = await import('@vercel/blob');
  }
  return vercelBlob;
}

export interface FileInfo {
  name: string;
  fullPath: string;
  folder: string;
  size: number;
  contentType: string;
  timeCreated: string | null;
  updated: string | null;
  downloadUrl: string | null;
  localPath?: string;
}

export class StorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = env.UPLOAD_DIR;
    if (!isVercel) {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    }
  }

  async listFiles(): Promise<{ files: FileInfo[]; totalSize: number; totalFiles: number }> {
    // En Vercel, listar archivos desde la BD (el sistema de archivos no es persistente)
    if (isVercel) {
      return this.listFilesFromDB();
    }

    const files: FileInfo[] = [];
    let totalSize = 0;

    if (!fs.existsSync(this.uploadDir)) {
      return { files, totalSize, totalFiles: 0 };
    }

    const dirEntries = await fs.promises.readdir(this.uploadDir);

    for (const entry of dirEntries) {
      const fullPath = path.join(this.uploadDir, entry);
      try {
        const stat = await fs.promises.stat(fullPath);
        if (!stat.isFile()) continue;

        // Determine content type by extension
        const ext = path.extname(entry).toLowerCase();
        const mimeMap: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.avif': 'image/avif',
          '.pdf': 'application/pdf',
          '.mp4': 'video/mp4',
          '.webm': 'video/webm',
          '.lottie': 'application/json',
        };
        const contentType = mimeMap[ext] || 'application/octet-stream';

        const fileInfo: FileInfo = {
          name: entry,
          fullPath: `/uploads/${entry}`,
          folder: 'uploads',
          size: stat.size,
          contentType,
          timeCreated: stat.birthtime.toISOString(),
          updated: stat.mtime.toISOString(),
          downloadUrl: `/uploads/${entry}`,
          localPath: fullPath,
        };

        files.push(fileInfo);
        totalSize += stat.size;
      } catch {
        // skip files we can't read
        continue;
      }
    }

    // Sort by newest first
    files.sort((a, b) => {
      const dateA = a.timeCreated ? new Date(a.timeCreated).getTime() : 0;
      const dateB = b.timeCreated ? new Date(b.timeCreated).getTime() : 0;
      return dateB - dateA;
    });

    return { files, totalSize, totalFiles: files.length };
  }

  /**
   * Lista archivos desde la BD de MySQL (para Vercel, donde no hay FS persistente).
   */
  private async listFilesFromDB(): Promise<{ files: FileInfo[]; totalSize: number; totalFiles: number }> {
    const files: FileInfo[] = [];
    let totalSize = 0;

    try {
      const uploads = await uploadRepo.findAll();
      for (const u of uploads) {
        totalSize += u.size_bytes || 0;
        files.push({
          name: u.filename,
          fullPath: u.url || `/uploads/${u.filename}`,
          folder: 'uploads',
          size: u.size_bytes || 0,
          contentType: u.mime_type || 'application/octet-stream',
          timeCreated: u.created_at || null,
          updated: u.created_at || null,
          downloadUrl: u.url || `/uploads/${u.filename}`,
        });
      }
    } catch (err) {
      logger.error('Error listing files from DB', { service: 'StorageService', error: (err as Error)?.message });
    }

    return { files, totalSize, totalFiles: files.length };
  }

  /** Computa SHA256 hash de un buffer */
  computeHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async saveFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    uploadedBy: string = 'admin'
  ): Promise<{ url: string; filename: string; id: string; duplicateReused?: boolean }> {
    // ── Compute hash BEFORE writing — check if duplicate exists ──
    const contentHash = this.computeHash(buffer);

    try {
      const existing = await uploadRepo.findByHash(contentHash);
      if (existing) {
        // Return existing file — no need to write again
        logger.info('Duplicado evitado, reusando archivo existente', { service: 'StorageService', url: existing.url });
        return { url: existing.url, filename: existing.filename, id: existing.id, duplicateReused: true };
      }
    } catch (err) {
      logger.warn('Error al buscar duplicado por hash', { service: 'StorageService', error: (err as Error)?.message });
    }

    const ext = path.extname(originalName) || '.jpg';
    const filename = `${uuidv4()}${ext}`;

    // ═══════════════════════════════════════════════════════════════
    // 🌀 VERCEL: Guardar archivo
    // ═══════════════════════════════════════════════════════════════
    let url: string;
    if (isVercel) {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        // Usar Vercel Blob si hay token configurado
        try {
          const { put } = await getVercelBlob();
          const blobResult = await put(filename, buffer, {
            contentType: mimeType,
            access: 'public',
            addRandomSuffix: true,
          });
          url = blobResult.url;
          logger.info('Archivo subido a Vercel Blob', { service: 'StorageService', url, filename });
        } catch (blobErr) {
          logger.error('Error al subir a Vercel Blob, usando fallback /tmp', { service: 'StorageService', error: (blobErr as Error)?.message });
          // Fallback: guardar en /tmp
          const tmpPath = path.join('/tmp', filename);
          await fs.promises.writeFile(tmpPath, buffer);
          url = `/api/uploads/${filename}`;
        }
      } else {
        // Sin Blob: guardar en /tmp y servir por API
        const tmpPath = path.join('/tmp', filename);
        await fs.promises.writeFile(tmpPath, buffer);
        url = `/api/uploads/${filename}`;
      }
    } else {
      // ── LOCAL: Usar sistema de archivos local ──
      const filePath = path.join(this.uploadDir, filename);
      try { await fs.promises.chmod(this.uploadDir, 0o775); } catch { /* best-effort */ }
      await fs.promises.writeFile(filePath, buffer);
      try { await fs.promises.chmod(filePath, 0o644); } catch { /* best-effort */ }
      url = `/uploads/${filename}`;
    }

    // ── Registrar en la BD ──
    try {
      const upload = await uploadRepo.create(
        uploadToRow({
          filename,
          original_name: originalName,
          mime_type: mimeType,
          size_bytes: buffer.length,
          url,
          content_hash: contentHash,
          uploaded_by: uploadedBy,
        })
      );
      return { url, filename, id: upload.id };
    } catch (createErr: any) {
      // ER_DUP_ENTRY (1062) = UNIQUE INDEX violation — race condition
      if (createErr?.errno === 1062) {
        // En Vercel no podemos borrar el blob facilmente, pero el duplicado
        // está manejado por el find existente antes del write.
        try {
          const existing = await uploadRepo.findByHash(contentHash);
          if (existing) {
            logger.info('Race condition resuelta, reusando archivo existente', { service: 'StorageService', url: existing.url, filename });
            return { url: existing.url, filename: existing.filename, id: existing.id, duplicateReused: true };
          }
        } catch { /* fall through */ }
        throw new Error(`ER_DUP_ENTRY no recuperable: hash=${contentHash.slice(0, 12)}…`);
      }
      throw createErr;
    }
  }

  async saveFromPath(
    sourcePath: string,
    originalName: string,
    mimeType: string,
    uploadedBy: string = 'admin'
  ): Promise<{ url: string; filename: string; id: string }> {
    const buffer = await fs.promises.readFile(sourcePath);
    return this.saveFile(buffer, originalName, mimeType, uploadedBy);
  }

  async deleteFile(url: string): Promise<boolean> {
    if (isVercel) {
      // En Vercel, eliminar el blob
      try {
        const { del } = await getVercelBlob();
        await del(url);
        return true;
      } catch (err) {
        logger.error('Error al eliminar blob de Vercel', { service: 'StorageService', error: (err as Error)?.message });
        return false;
      }
    }

    const filename = path.basename(url);
    const filePath = path.join(this.uploadDir, filename);
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async deleteByFilename(filename: string): Promise<boolean> {
    // En Vercel, se necesita la URL completa; intentar construirla desde la BD
    if (isVercel) {
      try {
        const uploads = await uploadRepo.findAll();
        const upload = uploads.find((u: any) => u.filename === filename);
        if (upload?.url) {
          return this.deleteFile(upload.url);
        }
      } catch { /* ignore */ }
      return false;
    }

    const filePath = path.join(this.uploadDir, filename);
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileUrl(filename: string): Promise<string> {
    if (isVercel) {
      // En Vercel, obtener la URL real del blob desde la BD
      try {
        const uploads = await uploadRepo.findAll();
        const upload = uploads.find((u: any) => u.filename === filename);
        if (upload?.url) return upload.url;
      } catch { /* ignore */ }
    }
    return `/uploads/${filename}`;
  }
}

export const storageService = new StorageService();
