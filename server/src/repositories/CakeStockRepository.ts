import { BaseRepository } from './BaseRepository.js';

export interface CakeStockRow {
  id: string;
  name: string;
  product_id: string | null;
  flavor: string;
  size: string;
  decoration: string | null;
  quantity: number;
  notes: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export class CakeStockRepository extends BaseRepository<CakeStockRow> {
  protected tableName = 'cake_stock';

  async findAvailable(): Promise<CakeStockRow[]> {
    return this.queryRaw<CakeStockRow[]>(
      'SELECT * FROM cake_stock WHERE quantity > 0 ORDER BY created_at DESC'
    );
  }

  async decrementQuantity(id: string, amount: number = 1): Promise<boolean> {
    const result = await this.executeRaw(
      'UPDATE cake_stock SET quantity = quantity - ? WHERE id = ? AND quantity >= ?',
      [amount, id, amount]
    );
    return result.affectedRows > 0;
  }

  async incrementQuantity(id: string, amount: number = 1): Promise<boolean> {
    const result = await this.executeRaw(
      'UPDATE cake_stock SET quantity = quantity + ? WHERE id = ?',
      [amount, id]
    );
    return result.affectedRows > 0;
  }
}
