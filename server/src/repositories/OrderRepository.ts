import { BaseRepository } from './BaseRepository.js';

export interface OrderRow {
  id: string;
  tracking_code: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_age: string | null;
  product_name: string;
  product_id: string | null;
  size: string;
  flavor: string;
  selected_decoration: string | null;
  custom_color: string | null;
  theme: string | null;
  message: string | null;
  celebrated_name: string | null;
  special_notes: string | null;
  total_price: number;
  status: string;
  cancel_reason: string | null;
  delivery_type: string;
  delivery_date: string | null;
  delivery_time: string | null;
  delivery_address: string | null;
  whatsapp_message: string | null;
  payment_status: string | null;
  payment_method: string | null;
  monto_pagado: number | null;
  fecha_pago: string | null;
  confirmed_by_admin: string | null;
  voucher_url: string | null;
  voucher_name: string | null;
  voucher_uploaded_at: string | null;
  fulfilled_from_stock: number;
  assigned_stock_id: string | null;
  progress_photos: string;
  created_at: string;
  updated_at: string;
}

export class OrderRepository extends BaseRepository<OrderRow> {
  protected tableName = 'orders';

  async findByTrackingCode(code: string): Promise<OrderRow | null> {
    const rows = await this.queryRaw<OrderRow[]>(
      'SELECT * FROM orders WHERE tracking_code = ?',
      [code]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async findByEmail(email: string): Promise<OrderRow[]> {
    return this.queryRaw<OrderRow[]>(
      'SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC',
      [email]
    );
  }

  async findByStatus(status: string): Promise<OrderRow[]> {
    return this.queryRaw<OrderRow[]>(
      'SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC',
      [status]
    );
  }

  async findAllOrdered(): Promise<OrderRow[]> {
    return this.queryRaw<OrderRow[]>(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );
  }

  async updateStatus(id: string, status: string, cancelReason?: string): Promise<boolean> {
    if (cancelReason) {
      return this.update(id, { status, cancel_reason: cancelReason } as Partial<OrderRow>);
    }
    return this.update(id, { status } as Partial<OrderRow>);
  }

  async getMonthlyStats(): Promise<any[]> {
    return this.queryRaw<any[]>(
      `SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'Entregado' THEN total_price ELSE 0 END) as total_sales,
        SUM(CASE WHEN status = 'Entregado' THEN 1 ELSE 0 END) as completed_orders
      FROM orders 
      GROUP BY DATE_FORMAT(created_at, '%Y-%m') 
      ORDER BY month DESC`
    );
  }

  async getRecentOrders(limit_num: number = 10): Promise<OrderRow[]> {
    return this.queryRaw<OrderRow[]>(
      'SELECT * FROM orders ORDER BY created_at DESC LIMIT ?',
      [limit_num]
    );
  }
}
