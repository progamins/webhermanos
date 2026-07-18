import { BaseRepository } from './BaseRepository.js';

export interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  category: string;
  preparation_time: string | null;
  active: number;
  stock: number;
  images: string;
  flavors: string;
  decorations: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

export class ProductRepository extends BaseRepository<ProductRow> {
  protected tableName = 'products';

  async findByCategory(category: string): Promise<ProductRow[]> {
    return this.queryRaw<ProductRow[]>(
      'SELECT * FROM products WHERE category = ? AND active = 1 ORDER BY created_at DESC',
      [category]
    );
  }

  async findActive(): Promise<ProductRow[]> {
    return this.queryRaw<ProductRow[]>(
      'SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC'
    );
  }

  async search(query_str: string): Promise<ProductRow[]> {
    return this.queryRaw<ProductRow[]>(
      'SELECT * FROM products WHERE active = 1 AND (name LIKE ? OR description LIKE ? OR category LIKE ?) ORDER BY created_at DESC',
      [`%${query_str}%`, `%${query_str}%`, `%${query_str}%`]
    );
  }
}
