/**
 * Row Mappers — Convierte tipos de dominio (camelCase) a filas de BD (snake_case)
 *
 * Elimina la necesidad de `as any` en los servicios al construir objetos
 * que se pasan a los repositorios.
 */

import type { ProductRow } from '../repositories/index.js';
import type { OrderRow, OrderTimelineRow } from '../repositories/index.js';
import type { ReviewRow } from '../repositories/index.js';
import type { GalleryRow } from '../repositories/index.js';
import type { CakeStockRow } from '../repositories/index.js';
import type { ActivityLogRow } from '../repositories/index.js';
import type { AdminSessionRow } from '../repositories/index.js';
import type { OtpRow } from '../repositories/index.js';
import type { UploadRow } from '../repositories/index.js';
import type {
  ProductCreateInput,
  ProductUpdateInput,
  OrderCreateInput,
  OrderUpdateInput,
  ReviewCreateInput,
  ReviewUpdateInput,
  GalleryCreateInput,
  GalleryUpdateInput,
  CakeStockCreateInput,
  CakeStockUpdateInput,
} from './types.js';

// ─── Product ───

export function productCreateToRow(data: ProductCreateInput, id?: string): Partial<ProductRow> {
  return {
    id,
    name: data.name,
    description: data.description ?? null,
    base_price: data.basePrice ?? 0,
    category: data.category ?? 'Especiales',
    preparation_time: data.preparationTime ?? '48 horas',
    active: data.active !== false ? 1 : 0,
    stock: data.stock !== false ? 1 : 0,
    images: JSON.stringify(data.images ?? []),
    flavors: JSON.stringify(data.flavors ?? []),
    decorations: JSON.stringify(data.decorations ?? []),
    tags: JSON.stringify(data.tags ?? []),
  };
}

export function productUpdateToRow(data: ProductUpdateInput): Partial<ProductRow> {
  const row: Partial<ProductRow> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.description !== undefined) row.description = data.description;
  if (data.basePrice !== undefined) row.base_price = data.basePrice;
  if (data.category !== undefined) row.category = data.category;
  if (data.preparationTime !== undefined) row.preparation_time = data.preparationTime;
  if (data.active !== undefined) row.active = data.active ? 1 : 0;
  if (data.stock !== undefined) row.stock = data.stock ? 1 : 0;
  if (data.images !== undefined) row.images = JSON.stringify(data.images);
  if (data.flavors !== undefined) row.flavors = JSON.stringify(data.flavors);
  if (data.decorations !== undefined) row.decorations = JSON.stringify(data.decorations);
  if (data.tags !== undefined) row.tags = JSON.stringify(data.tags);
  return row;
}

// ─── Order ───

export function orderCreateToRow(data: OrderCreateInput, id: string, trackingCode: string): Partial<OrderRow> {
  return {
    id,
    tracking_code: trackingCode,
    customer_name: data.customerName,
    customer_email: data.customerEmail,
    customer_phone: data.customerPhone ?? null,
    customer_age: data.customerAge != null ? String(data.customerAge) : null,
    product_name: data.productName,
    product_id: data.productId ?? null,
    size: data.size,
    flavor: data.flavor,
    selected_decoration: data.selectedDecoration ?? null,
    custom_color: data.customColor ?? null,
    theme: data.theme ?? null,
    message: data.message ?? null,
    celebrated_name: data.celebratedName ?? null,
    special_notes: data.specialNotes ?? null,
    total_price: data.totalPrice ?? 0,
    status: 'Pendiente',
    delivery_type: data.deliveryType ?? 'recojo',
    delivery_date: data.deliveryDate ?? null,
    delivery_time: data.deliveryTime ?? null,
    delivery_address: data.deliveryAddress ?? null,
    whatsapp_message: data.whatsappMessage ?? null,
    payment_status: 'pendiente',
    payment_method: 'Ninguno',
    monto_pagado: 0,
    progress_photos: '[]',
    fulfilled_from_stock: 0,
  };
}

export function orderUpdateToRow(data: OrderUpdateInput): Partial<OrderRow> {
  const fieldMap: Array<[keyof OrderUpdateInput, keyof OrderRow]> = [
    ['productName', 'product_name'],
    ['size', 'size'],
    ['flavor', 'flavor'],
    ['customerName', 'customer_name'],
    ['customerEmail', 'customer_email'],
    ['customerPhone', 'customer_phone'],
    ['deliveryDate', 'delivery_date'],
    ['deliveryTime', 'delivery_time'],
    ['deliveryAddress', 'delivery_address'],
    ['deliveryType', 'delivery_type'],
    ['totalPrice', 'total_price'],
    ['theme', 'theme'],
    ['specialNotes', 'special_notes'],
    ['selectedDecoration', 'selected_decoration'],
    ['customColor', 'custom_color'],
    ['message', 'message'],
    ['celebratedName', 'celebrated_name'],
    ['cancelReason', 'cancel_reason'],
    ['paymentStatus', 'payment_status'],
    ['paymentMethod', 'payment_method'],
    ['montoPagado', 'monto_pagado'],
    ['fechaPago', 'fecha_pago'],
    ['confirmedByAdmin', 'confirmed_by_admin'],
    ['voucherUrl', 'voucher_url'],
    ['voucherName', 'voucher_name'],
    ['assignedStockId', 'assigned_stock_id'],
  ];

  const row: Partial<OrderRow> = {};
  for (const [domain, db] of fieldMap) {
    const val = data[domain as keyof OrderUpdateInput];
    if (val !== undefined) {
      (row as any)[db] = val;
    }
  }
  if (data.customerAge !== undefined) {
    row.customer_age = String(data.customerAge);
  }
  if (data.fulfilledFromStock !== undefined) {
    row.fulfilled_from_stock = data.fulfilledFromStock ? 1 : 0;
  }
  if (data.progressPhotos !== undefined) {
    row.progress_photos = JSON.stringify(data.progressPhotos);
  }
  if (data.status !== undefined) {
    row.status = data.status;
  }
  return row;
}

export function timelineCreateToRow(
  id: string,
  orderId: string,
  previousStatus: string | null,
  newStatus: string,
  changedBy: string,
  notes?: string | null
): Partial<OrderTimelineRow> {
  return {
    id,
    order_id: orderId,
    previous_status: previousStatus,
    new_status: newStatus,
    changed_by: changedBy,
    notes: notes ?? null,
  };
}

// ─── Review ───

export function reviewCreateToRow(data: ReviewCreateInput): Partial<ReviewRow> {
  return {
    id: data.id,
    author: data.author,
    role: data.role ?? null,
    rating: data.rating,
    comment: data.comment,
    cake_model: data.cakeModel ?? null,
    date: data.date ? new Date(data.date).toISOString().substring(0, 10) : new Date().toISOString().slice(0, 10),
    approved: data.approved ? 1 : 0,
    response: data.response ?? null,
  };
}

export function reviewUpdateToRow(data: ReviewUpdateInput): Partial<ReviewRow> {
  const row: Partial<ReviewRow> = {};
  if (data.approved !== undefined) row.approved = data.approved ? 1 : 0;
  if (data.response !== undefined) row.response = data.response;
  if (data.author !== undefined) row.author = data.author;
  if (data.rating !== undefined) row.rating = data.rating;
  if (data.comment !== undefined) row.comment = data.comment;
  if (data.date !== undefined) row.date = new Date(data.date).toISOString().substring(0, 10);
  return row;
}

// ─── Gallery ───

export function galleryCreateToRow(data: GalleryCreateInput): Partial<GalleryRow> {
  return {
    id: data.id,
    image_url: data.imageUrl,
    title: data.title ?? undefined,
    category: data.category ?? null,
    description: data.description ?? null,
    date: data.date ? new Date(data.date).toISOString().substring(0, 10) : new Date().toISOString().slice(0, 10),
  };
}

export function galleryUpdateToRow(data: GalleryUpdateInput): Partial<GalleryRow> {
  const row: Partial<GalleryRow> = {};
  if (data.imageUrl !== undefined) row.image_url = data.imageUrl;
  if (data.title !== undefined) row.title = data.title;
  if (data.category !== undefined) row.category = data.category;
  if (data.description !== undefined) row.description = data.description;
  if (data.date !== undefined) row.date = data.date ? new Date(data.date).toISOString().substring(0, 10) : null;
  return row;
}

// ─── Cake Stock ───

export function stockCreateToRow(data: CakeStockCreateInput): Partial<CakeStockRow> {
  return {
    id: data.id,
    name: data.name,
    product_id: data.productId ?? null,
    flavor: data.flavor,
    size: data.size,
    decoration: data.decoration ?? null,
    quantity: data.quantity ?? 1,
    notes: data.notes ?? null,
    image_url: data.imageUrl ?? null,
  };
}

export function stockUpdateToRow(data: CakeStockUpdateInput): Partial<CakeStockRow> {
  const row: Partial<CakeStockRow> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.flavor !== undefined) row.flavor = data.flavor;
  if (data.size !== undefined) row.size = data.size;
  if (data.decoration !== undefined) row.decoration = data.decoration;
  if (data.quantity !== undefined) row.quantity = data.quantity;
  if (data.notes !== undefined) row.notes = data.notes;
  if (data.imageUrl !== undefined) row.image_url = data.imageUrl;
  if (data.productId !== undefined) row.product_id = data.productId;
  return row;
}

// ─── Activity Log ───

export function activityLogToRow(
  id: string,
  action: string,
  details: string,
  role: string
): Partial<ActivityLogRow> {
  return { id, action, details, role };
}

// ─── OTP ───

export function otpToRow(
  id: string,
  email: string,
  code: string,
  expiresAt: string
): Partial<OtpRow> {
  return {
    id,
    email,
    code,
    expires_at: expiresAt,
    used: 0,
  };
}

// ─── Upload ───

export function uploadToRow(input: {
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  content_hash?: string | null;
  uploaded_by: string;
  id?: string;
}): Partial<UploadRow> {
  const row: Partial<UploadRow> = {};
  row.filename = input.filename;
  row.original_name = input.original_name;
  row.mime_type = input.mime_type;
  row.size_bytes = input.size_bytes;
  row.url = input.url;
  row.uploaded_by = input.uploaded_by;
  if (input.content_hash !== undefined) row.content_hash = input.content_hash;
  if (input.id !== undefined) row.id = input.id;
  return row;
}

// ─── Admin Session ───

export function sessionToRow(
  token: string,
  role: string,
  expiresAt: string
): Partial<AdminSessionRow> {
  return {
    token,
    role,
    expires_at: expiresAt,
  };
}
