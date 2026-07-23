import logger from '../lib/logger.js';
import { stockCreateToRow, stockUpdateToRow } from '../lib/rowMapper.js';
import type { CakeStock, CakeStockCreateInput, CakeStockUpdateInput } from '../lib/types.js';
import { CakeStockRepository, CakeStockRow } from '../repositories/index.js';

const stockRepo = new CakeStockRepository();

function parseStock(row: CakeStockRow) {
  return {
    id: row.id,
    name: row.name,
    productId: row.product_id,
    flavor: row.flavor,
    size: row.size,
    decoration: row.decoration,
    quantity: row.quantity,
    notes: row.notes,
    imageUrl: row.image_url,
    createdAt: row.created_at,
  };
}

export class StockService {
  async getAll(): Promise<CakeStock[]> {
    const rows = await stockRepo.findAll('created_at DESC');
    return rows.map(parseStock);
  }

  async getAvailable(): Promise<CakeStock[]> {
    const rows = await stockRepo.findAvailable();
    return rows.map(parseStock);
  }

  async getById(id: string): Promise<CakeStock | null> {
    const row = await stockRepo.findById(id);
    return row ? parseStock(row) : null;
  }

  async create(data: CakeStockCreateInput): Promise<CakeStock> {
    const row = await stockRepo.create(stockCreateToRow(data));
    return parseStock(row);
  }

  async update(id: string, data: CakeStockUpdateInput): Promise<boolean> {
    return stockRepo.update(id, stockUpdateToRow(data));
  }

  async delete(id: string): Promise<boolean> {
    return stockRepo.delete(id);
  }

  async assignToOrder(stockId: string, orderId: string): Promise<boolean> {
    const decremented = await stockRepo.decrementQuantity(stockId);
    if (decremented) {
      // order fulfillment handled by OrderService
      return true;
    }
    return false;
  }
}

export const stockService = new StockService();
