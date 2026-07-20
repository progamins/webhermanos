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
    customerAge: row.customer_age,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    message: row.message,
    selectedDecoration: row.selected_decoration,
    customColor: row.custom_color,
    totalPrice: Number(row.total_price),
    montoPagado: row.monto_pagado != null ? Number(row.monto_pagado) : null,
    status: row.status,
    date: row.created_at,
    deliveryDate: row.delivery_date,
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
    fechaPago: row.fecha_pago,
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

function safeParseJson(val: string, fallback: any = []) {
  try { return typeof val === 'string' ? JSON.parse(val) : val || fallback; }
  catch { return fallback; }
}

function generateTrackingCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export class OrderService {
  async getAll(): Promise<any[]> {
    const rows = await orderRepo.findAllOrdered();
    return rows.map(parseOrder);
  }

  async getById(id: string): Promise<any | null> {
    const row = await orderRepo.findById(id);
    return row ? parseOrder(row) : null;
  }

  async getByTrackingCode(code: string): Promise<any | null> {
    const row = await orderRepo.findByTrackingCode(code);
    return row ? parseOrder(row) : null;
  }

  async getByEmail(email: string): Promise<any[]> {
    const rows = await orderRepo.findByEmail(email);
    return rows.map(parseOrder);
  }

  async create(data: any): Promise<any> {
    const trackingCode = generateTrackingCode();
    const id = data.id || uuidv4();

    await orderRepo.create({
      id,
      tracking_code: trackingCode,
      customer_name: data.customerName,
      customer_email: data.customerEmail,
      customer_phone: data.customerPhone || null,
      customer_age: data.customerAge || null,
      product_name: data.productName,
      product_id: data.productId || null,
      size: data.size,
      flavor: data.flavor,
      selected_decoration: data.selectedDecoration || null,
      custom_color: data.customColor || null,
      theme: data.theme || null,
      message: data.message || null,
      celebrated_name: data.celebratedName || null,
      special_notes: data.specialNotes || null,
      total_price: data.totalPrice || 0,
      status: 'Pendiente',
      delivery_type: data.deliveryType || 'recojo',
      delivery_date: data.deliveryDate || null,
      delivery_time: data.deliveryTime || null,
      delivery_address: data.deliveryAddress || null,
      whatsapp_message: data.whatsappMessage || null,
      payment_status: 'pendiente',
      payment_method: 'Ninguno',
      monto_pagado: 0,
      progress_photos: '[]',
      fulfilled_from_stock: 0,
    } as any);

    // Log timeline
    await timelineRepo.create({
      id: uuidv4(),
      order_id: id,
      previous_status: null,
      new_status: 'Pendiente',
      changed_by: 'system',
    } as any);

    return { id, trackingCode };
  }

  async updateStatus(id: string, status: string, changedBy: string = 'admin', cancelReason?: string): Promise<boolean> {
    const order = await orderRepo.findById(id);
    if (!order) return false;

    await orderRepo.updateStatus(id, status, cancelReason);

    await timelineRepo.create({
      id: uuidv4(),
      order_id: id,
      previous_status: order.status,
      new_status: status,
      changed_by: changedBy,
      notes: cancelReason || null,
    } as any);

    await ActivityLogService.log(
      'Estado de pedido actualizado',
      `Pedido ${id}: ${order.status} → ${status}${cancelReason ? ` (Motivo: ${cancelReason})` : ''}`,
      changedBy
    );

    return true;
  }

  async update(id: string, data: any): Promise<boolean> {
    const updateData: any = {};
    const fieldMap: Record<string, string> = {
      productName: 'product_name', size: 'size', flavor: 'flavor',
      customerName: 'customer_name', customerEmail: 'customer_email',
      customerPhone: 'customer_phone', deliveryDate: 'delivery_date',
      deliveryTime: 'delivery_time', deliveryAddress: 'delivery_address',
      deliveryType: 'delivery_type', totalPrice: 'total_price',
      theme: 'theme', specialNotes: 'special_notes',
      selectedDecoration: 'selected_decoration', customColor: 'custom_color',
      message: 'message', celebratedName: 'celebrated_name',
      cancelReason: 'cancel_reason', customerAge: 'customer_age',
      paymentStatus: 'payment_status', paymentMethod: 'payment_method',
      montoPagado: 'monto_pagado', fechaPago: 'fecha_pago',
      confirmedByAdmin: 'confirmed_by_admin', voucherUrl: 'voucher_url',
      voucherName: 'voucher_name', fulfilledFromStock: 'fulfilled_from_stock',
      assignedStockId: 'assigned_stock_id',
    };

    for (const [clientKey, dbKey] of Object.entries(fieldMap)) {
      if (data[clientKey] !== undefined) {
        if (clientKey === 'fulfilledFromStock') {
          updateData[dbKey] = data[clientKey] ? 1 : 0;
        } else {
          updateData[dbKey] = data[clientKey];
        }
      }
    }

    if (data.progressPhotos !== undefined) {
      updateData.progress_photos = JSON.stringify(data.progressPhotos);
    }

    return orderRepo.update(id, updateData as any);
  }

  async delete(id: string): Promise<boolean> {
    return orderRepo.delete(id);
  }

  async getTimeline(orderId: string): Promise<any[]> {
    return timelineRepo.findByOrderId(orderId);
  }

  async getMonthlyStats(): Promise<any[]> {
    return orderRepo.getMonthlyStats();
  }

  async getRecent(limit: number = 10): Promise<any[]> {
    const rows = await orderRepo.getRecentOrders(limit);
    return rows.map(parseOrder);
  }
}

export const orderService = new OrderService();
