import logger from '../lib/logger.js';
import { galleryCreateToRow, galleryUpdateToRow } from '../lib/rowMapper.js';
import type { GalleryItem, GalleryCreateInput, GalleryUpdateInput } from '../lib/types.js';
import { GalleryRepository, GalleryRow } from '../repositories/index.js';

const galleryRepo = new GalleryRepository();

function formatDate(val: string | Date | null | undefined): string | null {
  if (!val) return null;
  return new Date(val).toISOString().substring(0, 10);
}

function parseGallery(row: GalleryRow) {
  return {
    id: row.id,
    imageUrl: row.image_url,
    title: row.title,
    category: row.category,
    description: row.description,
    date: formatDate(row.date),
  };
}

export class GalleryService {
  async getAll(): Promise<GalleryItem[]> {
    const rows = await galleryRepo.findAll('date DESC');
    return rows.map(parseGallery);
  }

  async getByCategory(category: string): Promise<GalleryItem[]> {
    const rows = await galleryRepo.findByCategory(category);
    return rows.map(parseGallery);
  }

  async getById(id: string): Promise<GalleryItem | null> {
    const row = await galleryRepo.findById(id);
    return row ? parseGallery(row) : null;
  }

  async create(data: GalleryCreateInput): Promise<GalleryItem> {
    const row = await galleryRepo.create(galleryCreateToRow(data));
    return parseGallery(row);
  }

  async update(id: string, data: GalleryUpdateInput): Promise<boolean> {
    return galleryRepo.update(id, galleryUpdateToRow(data));
  }

  async delete(id: string): Promise<boolean> {
    return galleryRepo.delete(id);
  }
}

export const galleryService = new GalleryService();
