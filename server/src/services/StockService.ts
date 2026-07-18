import { CakeStockRepository } from '../repositories/index.js';

const stockRepo = new CakeStockRepository();

function parseStock(row: any) {
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
  async getAll(): Promise<any[]> {
    const rows = await stockRepo.findAll('created_at DESC');
    return rows.map(parseStock);
  }

  async getAvailable(): Promise<any[]> {
    const rows = await stockRepo.findAvailable();
    return rows.map(parseStock);
  }

  async getById(id: string): Promise<any | null> {
    const row = await stockRepo.findById(id);
    return row ? parseStock(row) : null;
  }

  async create(data: any): Promise<any> {
    const row = await stockRepo.create({
      id: data.id,
      name: data.name,
      product_id: data.productId || null,
      flavor: data.flavor,
      size: data.size,
      decoration: data.decoration || null,
      quantity: data.quantity || 1,
      notes: data.notes || null,
      image_url: data.imageUrl || null,
    } as any);
    return parseStock(row);
  }

  async update(id: string, data: any): Promise<boolean> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.flavor !== undefined) updateData.flavor = data.flavor;
    if (data.size !== undefined) updateData.size = data.size;
    if (data.decoration !== undefined) updateData.decoration = data.decoration;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl;
    if (data.productId !== undefined) updateData.product_id = data.productId;
    return stockRepo.update(id, updateData as any);
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
