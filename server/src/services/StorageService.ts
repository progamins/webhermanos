import fs from 'fs';
import path from 'path';
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

  async saveFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    uploadedBy: string = 'admin'
  ): Promise<{ url: string; filename: string; id: string }> {
    const ext = path.extname(originalName) || '.jpg';
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    await fs.promises.writeFile(filePath, buffer);
    const url = `/uploads/${filename}`;

    const upload = await uploadRepo.create({
      id: uuidv4(),
      filename,
      original_name: originalName,
      mime_type: mimeType,
      size_bytes: buffer.length,
      url,
      uploaded_by: uploadedBy,
    } as any);

    return { url, filename, id: upload.id };
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
