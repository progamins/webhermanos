import { GalleryRepository, GalleryRow } from '../repositories/index.js';

const galleryRepo = new GalleryRepository();

function formatDate(val: any): string | null {
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
  async getAll(): Promise<any[]> {
    const rows = await galleryRepo.findAll('date DESC');
    return rows.map(parseGallery);
  }

  async getByCategory(category: string): Promise<any[]> {
    const rows = await galleryRepo.findByCategory(category);
    return rows.map(parseGallery);
  }

  async getById(id: string): Promise<any | null> {
    const row = await galleryRepo.findById(id);
    return row ? parseGallery(row) : null;
  }

  async create(data: any): Promise<any> {
    const row = await galleryRepo.create({
      id: data.id,
      image_url: data.imageUrl,
      title: data.title,
      category: data.category || null,
      description: data.description || null,
      date: formatDate(data.date) || new Date().toISOString().slice(0, 10),
    } as any);
    return parseGallery(row);
  }

  async update(id: string, data: any): Promise<boolean> {
    const updateData: any = {};
    if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.date !== undefined) updateData.date = formatDate(data.date);
    return galleryRepo.update(id, updateData as any);
  }

  async delete(id: string): Promise<boolean> {
    return galleryRepo.delete(id);
  }
}

export const galleryService = new GalleryService();
