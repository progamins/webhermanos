import { ProductRepository, ProductRow } from '../repositories/index.js';

const productRepo = new ProductRepository();

function parseProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    basePrice: Number(row.base_price),
    category: row.category,
    preparationTime: row.preparation_time,
    active: !!row.active,
    stock: !!row.stock,
    images: safeParseJson(row.images, []),
    flavors: safeParseJson(row.flavors, []),
    decorations: safeParseJson(row.decorations, []),
    tags: safeParseJson(row.tags, []),
  };
}

function safeParseJson(val: string, fallback: any = []) {
  try { return typeof val === 'string' ? JSON.parse(val) : val || fallback; }
  catch { return fallback; }
}

export class ProductService {
  async getAll(): Promise<any[]> {
    const rows = await productRepo.findAll('created_at DESC');
    return rows.map(parseProduct);
  }

  async getActive(): Promise<any[]> {
    const rows = await productRepo.findActive();
    return rows.map(parseProduct);
  }

  async getById(id: string): Promise<any | null> {
    const row = await productRepo.findById(id);
    return row ? parseProduct(row) : null;
  }

  async create(data: any): Promise<any> {
    const row = await productRepo.create({
      id: data.id,
      name: data.name,
      description: data.description || null,
      base_price: data.basePrice || 0,
      category: data.category || 'Especiales',
      preparation_time: data.preparationTime || '48 horas',
      active: data.active !== false ? 1 : 0,
      stock: data.stock !== false ? 1 : 0,
      images: JSON.stringify(data.images || []),
      flavors: JSON.stringify(data.flavors || []),
      decorations: JSON.stringify(data.decorations || []),
      tags: JSON.stringify(data.tags || []),
    } as any);
    return parseProduct(row);
  }

  async update(id: string, data: any): Promise<boolean> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.basePrice !== undefined) updateData.base_price = data.basePrice;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.preparationTime !== undefined) updateData.preparation_time = data.preparationTime;
    if (data.active !== undefined) updateData.active = data.active ? 1 : 0;
    if (data.stock !== undefined) updateData.stock = data.stock ? 1 : 0;
    if (data.images !== undefined) updateData.images = JSON.stringify(data.images);
    if (data.flavors !== undefined) updateData.flavors = JSON.stringify(data.flavors);
    if (data.decorations !== undefined) updateData.decorations = JSON.stringify(data.decorations);
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    return productRepo.update(id, updateData as any);
  }

  async delete(id: string): Promise<boolean> {
    return productRepo.delete(id);
  }
}

export const productService = new ProductService();
