import logger from '../lib/logger.js';
import { orderCreateToRow, orderUpdateToRow, timelineCreateToRow } from '../lib/rowMapper.js';
import type { Order, OrderCreateInput, OrderUpdateInput, ProgressPhoto } from '../lib/types.js';
import { OrderRepository, OrderRow, OrderTimelineRepository } from '../repositories/index.js';
import { ActivityLogService } from './ActivityService.js';
import { v4 as uuidv4 } from 'uuid';

const orderRepo = new OrderRepository();
const timelineRepo = new OrderTimelineRepository();

function parseOrder(row: OrderRow) {
  return {
    id: row.id,
    productName: row.product_name,
    productId: row.product_id,
    size: row.size,
    flavor: row.flavor,
    customerName: row.customer_name,
    customerAge: row.customer_age ? Number(row.customer_age) : null,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    message: row.message,
    selectedDecoration: row.selected_decoration,
    customColor: row.custom_color,
    totalPrice: Number(row.total_price),
    montoPagado: row.monto_pagado != null ? Number(row.monto_pagado) : null,
    status: row.status,
    date: row.created_at,
    deliveryDate: row.delivery_date ? new Date(row.delivery_date).toISOString().substring(0, 10) : null,
    deliveryTime: row.delivery_time,
    deliveryAddress: row.delivery_address,
    deliveryType: row.delivery_type,
    theme: row.theme,
    specialNotes: row.special_notes,
    trackingCode: row.tracking_code,
    celebratedName: row.celebrated_name,
    cancelReason: row.cancel_reason,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    fechaPago: row.fecha_pago ? new Date(row.fecha_pago).toISOString().substring(0, 10) : null,
    confirmedByAdmin: row.confirmed_by_admin,
    voucherUrl: row.voucher_url,
    voucherName: row.voucher_name,
    voucherUploadedAt: row.voucher_uploaded_at,
    fulfilledFromStock: !!row.fulfilled_from_stock,
    assignedStockId: row.assigned_stock_id,
    progressPhotos: safeParseJson(row.progress_photos, []),
    whatsappMessage: row.whatsapp_message,
  };
}

function safeParseJson<T>(val: string, fallback: T[] = [] as T[]): T[] {
  try { return typeof val === 'string' ? JSON.parse(val) : val || fallback; }
  catch { return fallback; }
}

function generateTrackingCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export class OrderService {
  async getAll(): Promise<Order[]> {
    const rows = await orderRepo.findAllOrdered();
    return rows.map(parseOrder);
  }

  async getById(id: string): Promise<Order | null> {
    const row = await orderRepo.findById(id);
    return row ? parseOrder(row) : null;
  }

  async getByTrackingCode(code: string): Promise<Order | null> {
    const row = await orderRepo.findByTrackingCode(code);
    return row ? parseOrder(row) : null;
  }

  async getByEmail(email: string): Promise<Order[]> {
    const rows = await orderRepo.findByEmail(email);
    return rows.map(parseOrder);
  }

  async create(data: OrderCreateInput): Promise<{ id: string; trackingCode: string }> {
    const trackingCode = generateTrackingCode();
    const id = data.id || uuidv4();

    await orderRepo.create(orderCreateToRow(data, id, trackingCode));

    // Log timeline
    await timelineRepo.create(timelineCreateToRow(uuidv4(), id, null, 'Pendiente', 'system'));

    return { id, trackingCode };
  }

  async updateStatus(id: string, status: string, changedBy: string = 'admin', cancelReason?: string): Promise<boolean> {
    const order = await orderRepo.findById(id);
    if (!order) return false;

    await orderRepo.updateStatus(id, status, cancelReason);

    await timelineRepo.create(timelineCreateToRow(uuidv4(), id, order.status, status, changedBy, cancelReason));

    await ActivityLogService.log(
      'Estado de pedido actualizado',
      `Pedido ${id}: ${order.status} → ${status}${cancelReason ? ` (Motivo: ${cancelReason})` : ''}`,
      changedBy
    );

    return true;
  }

  async update(id: string, data: OrderUpdateInput): Promise<boolean> {
    return orderRepo.update(id, orderUpdateToRow(data));
  }

  async delete(id: string): Promise<boolean> {
    return orderRepo.delete(id);
  }

  async getTimeline(orderId: string): Promise<{ id: string; previous_status: string | null; new_status: string; changed_by: string | null; notes: string | null; created_at: string }[]> {
    return timelineRepo.findByOrderId(orderId);
  }

  async getMonthlyStats(): Promise<{ month: string; total: number; count: number }[]> {
    return orderRepo.getMonthlyStats();
  }

  async getRecent(limit: number = 10): Promise<Order[]> {
    const rows = await orderRepo.getRecentOrders(limit);
    return rows.map(parseOrder);
  }
}

export const orderService = new OrderService();
