import logger from '../lib/logger.js';
import { productCreateToRow, productUpdateToRow } from '../lib/rowMapper.js';
import type { Product, ProductCreateInput, ProductUpdateInput } from '../lib/types.js';
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

function safeParseJson<T>(val: string, fallback: T[] = [] as T[]): T[] {
  try { return typeof val === 'string' ? JSON.parse(val) : val || fallback; }
  catch { return fallback; }
}

export class ProductService {
  async getAll(): Promise<Product[]> {
    const rows = await productRepo.findAll('created_at DESC');
    return rows.map(parseProduct);
  }

  async getActive(): Promise<Product[]> {
    const rows = await productRepo.findActive();
    return rows.map(parseProduct);
  }

  async getById(id: string): Promise<Product | null> {
    const row = await productRepo.findById(id);
    return row ? parseProduct(row) : null;
  }

  async create(data: ProductCreateInput): Promise<Product> {
    const row = await productRepo.create(productCreateToRow(data, data.id));
    return parseProduct(row);
  }

  async update(id: string, data: ProductUpdateInput): Promise<boolean> {
    return productRepo.update(id, productUpdateToRow(data));
  }

  async delete(id: string): Promise<boolean> {
    return productRepo.delete(id);
  }
}

export const productService = new ProductService();
