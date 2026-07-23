import logger from '../lib/logger.js';
import { uploadToRow } from '../lib/rowMapper.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { UploadRepository } from '../repositories/index.js';

const uploadRepo = new UploadRepository();

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
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async listFiles(): Promise<{ files: FileInfo[]; totalSize: number; totalFiles: number }> {
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
    const filePath = path.join(this.uploadDir, filename);

    // Attempt to make the directory group-writable before writing.
    // In production the dir may be owned by www-data while PM2 runs as edwin.
    // This is best-effort — if chmod fails, writeFile will also fail with EACCES.
    try { await fs.promises.chmod(this.uploadDir, 0o775); } catch { /* best-effort */ }

    await fs.promises.writeFile(filePath, buffer);

    // Ensure the file is world-readable so Express static middleware can serve it
    // regardless of the process umask.
    try { await fs.promises.chmod(filePath, 0o644); } catch { /* best-effort */ }

    const url = `/uploads/${filename}`;

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
      // Delete the file we just wrote and return the existing record
      if (createErr?.errno === 1062) {
        try { await fs.promises.unlink(filePath); } catch { /* best-effort */ }
        try {
          const existing = await uploadRepo.findByHash(contentHash);
          if (existing) {
            logger.info('Race condition resuelta, reusando archivo existente', { service: 'StorageService', url: existing.url, filename });
            return { url: existing.url, filename: existing.filename, id: existing.id, duplicateReused: true };
          }
        } catch { /* fall through */ }
        // Could not recover — file was deleted but existing record not found.
        // Throw with a clearer message.
        throw new Error(`ER_DUP_ENTRY no recuperable: hash=${contentHash.slice(0, 12)}…, archivo=${filename} eliminado`);
      }
      // Re-throw if we couldn't recover
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
    const filePath = path.join(this.uploadDir, filename);
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileUrl(filename: string): Promise<string> {
    return `/uploads/${filename}`;
  }
}

export const storageService = new StorageService();
