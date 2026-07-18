import { BaseRepository } from './BaseRepository.js';

export interface GalleryRow {
  id: string;
  image_url: string;
  title: string;
  category: string | null;
  description: string | null;
  date: string | null;
  created_at: string;
}

export class GalleryRepository extends BaseRepository<GalleryRow> {
  protected tableName = 'gallery';

  async findByCategory(category: string): Promise<GalleryRow[]> {
    return this.queryRaw<GalleryRow[]>(
      'SELECT * FROM gallery WHERE category = ? ORDER BY date DESC',
      [category]
    );
  }
}
