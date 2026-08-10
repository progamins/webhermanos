// API Client — Express → MySQL
// En desarrollo: Vite proxy redirige /api → localhost:3000 (rutas relativas)
// En producción: build + Express sirve todo en el mismo puerto (APP_URL)
// Para apuntar a otro backend: VITE_API_URL=https://dominio.com/api

import { requestPool } from './requestPool';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api';

// Rutas públicas que se cachean por TTL (datos que cambian poco)
const CACHEABLE_PATHS = ['/products', '/reviews', '/gallery', '/config'];

function buildKey(path: string, options: RequestInit): string {
  const method = (options.method || 'GET').toUpperCase();
  return `${method} ${path}`;
}

function getCacheTtl(path: string, method: string): number {
  // Solo GET públicos se cachean (10s). Admin NO cachea (datos frescos).
  if (method !== 'GET') return 0;
  if (path.startsWith('/admin/')) return 0;
  if (CACHEABLE_PATHS.some(p => path.startsWith(p))) return 10_000;
  return 0;
}

async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const token = localStorage.getItem('maison_admin_token') || '';

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Don't set Content-Type for FormData (let browser set it)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['x-admin-token'] = token;
  }

  const doFetch = async (): Promise<T> => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMsg = `Error ${res.status}`;
      try {
        const data = await res.json();
        errorMsg = data.error || data.message || errorMsg;
      } catch { /* ignore */ }
      throw new Error(errorMsg);
    }

    return res.json();
  };

  const key = buildKey(path, options);
  const cacheTtl = getCacheTtl(path, method);

  // 🔄 Pasar por el request pool: concurrencia limitada + dedupe + cache + retry
  return requestPool.run(key, doFetch, {
    mutating: method !== 'GET',
    cacheTtlMs: cacheTtl,
    maxAttempts: method === 'GET' ? 3 : 1, // no reintentar mutaciones (evita duplicados)
  });
}

export const api = {
  // ─── Products ───
  getProducts: () => request<any[]>('/products'),
  
  // ─── Reviews ───
  getReviews: () => request<any[]>('/reviews'),
  
  // ─── Gallery ───
  getGallery: () => request<any[]>('/gallery'),
  
  // ─── Config ───
  getConfig: () => request<any>('/config'),
  
  // ─── Orders ───
  getOrders: (params?: { trackingCode?: string; email?: string }) => {
    const query = params?.trackingCode 
      ? `?trackingCode=${encodeURIComponent(params.trackingCode)}`
      : params?.email 
        ? `?email=${encodeURIComponent(params.email)}`
        : '';
    return request<any>(`/orders${query}`);
  },
  
  createOrder: (order: any) =>
    request<{ success: boolean; id: string; trackingCode: string }>('/orders', {
      method: 'POST',
      body: JSON.stringify({ order }),
    }),

  // ─── OTP ───
  sendOTP: (email: string, customerName: string) =>
    request<{ success: boolean; error?: string }>('/otp/send', {
      method: 'POST',
      body: JSON.stringify({ email, customerName }),
    }),

  verifyOTP: (email: string, code: string) =>
    request<{ success: boolean; error?: string }>('/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  // ─── Contact ───
  sendContact: (name: string, email: string | undefined, message: string) =>
    request<{ success: boolean }>('/contact', {
      method: 'POST',
      body: JSON.stringify({ name, email, message }),
    }),

  // ─── Image Proxy ───
  getImageProxyUrl: (url: string) => `/api/image-proxy?url=${encodeURIComponent(url)}`,

  // ─── Admin Auth ───
  admin: {
    login: (password: string, role?: string) =>
      request<{ success: boolean; token?: string; expiresAt?: string; error?: string }>('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password, role: role || 'admin' }),
      }),

    verify: () =>
      request<{ success: boolean; valid: boolean; role?: string }>('/admin/verify', {
        method: 'POST',
      }),

    logout: () =>
      request<{ success: boolean }>('/admin/logout', {
        method: 'POST',
      }),

    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ success: boolean; error?: string }>('/admin/change-admin-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),

    getRolePasswords: () =>
      request<{ success: boolean; roles?: any[]; credentials_emailed?: boolean }>('/admin/role-passwords'),

    saveRolePasswords: (analystPassword: string, stockManagerPassword: string) =>
      request<{ success: boolean; error?: string }>('/admin/role-passwords', {
        method: 'POST',
        body: JSON.stringify({ analystPassword, stockManagerPassword }),
      }),

    sendCredentials: () =>
      request<{ success: boolean; alreadySent?: boolean; message?: string }>('/admin/send-credentials', {
        method: 'POST',
      }),

    getActivityLogs: () =>
      request<{ success: boolean; logs?: any[] }>('/admin/activity-log'),

    // Products
    getProducts: () =>
      request<{ success: boolean; products: any[] }>('/admin/products'),

    saveProduct: (product: any) =>
      request<{ success: boolean; product?: any }>('/admin/products', {
        method: 'POST',
        body: JSON.stringify({ product }),
      }),

    deleteProduct: (id: string) =>
      request<{ success: boolean }>(`/admin/products/${id}`, {
        method: 'DELETE',
      }),

    // Orders
    getOrders: () =>
      request<{ success: boolean; orders: any[] }>('/admin/orders'),

    updateOrderStatus: (orderId: string, status: string, cancelReason?: string) =>
      request<{ success: boolean }>('/admin/orders/status', {
        method: 'POST',
        body: JSON.stringify({ orderId, status, cancelReason }),
      }),

    deleteOrder: (id: string) =>
      request<{ success: boolean }>(`/admin/orders/${id}`, {
        method: 'DELETE',
      }),

    updateOrder: (order: any) =>
      request<{ success: boolean }>('/admin/orders/update-full', {
        method: 'POST',
        body: JSON.stringify({ order }),
      }),

    uploadVoucher: (orderId: string, file: File) => {
      const formData = new FormData();
      formData.append('orderId', orderId);
      formData.append('voucher', file);
      return request<{ success: boolean; voucherUrl?: string }>('/admin/orders/upload-voucher', {
        method: 'POST',
        body: formData,
      });
    },

    deleteVoucher: (orderId: string, voucherPath?: string) =>
      request<{ success: boolean }>('/admin/orders/delete-voucher', {
        method: 'POST',
        body: JSON.stringify({ orderId, voucherPath }),
      }),

    updateOrderPayment: (orderId: string, details: any) =>
      request<{ success: boolean }>('/admin/orders/update-payment', {
        method: 'POST',
        body: JSON.stringify({ orderId, ...details }),
      }),

    assignStockToOrder: (orderId: string, stockId: string) =>
      request<{ success: boolean; message?: string }>('/admin/orders/assign-stock', {
        method: 'POST',
        body: JSON.stringify({ orderId, stockId }),
      }),

    addProgressPhoto: (orderId: string, imageUrl: string, caption: string, stage: string) =>
      request<{ success: boolean }>('/admin/orders/progress-photo', {
        method: 'POST',
        body: JSON.stringify({ orderId, imageUrl, caption, stage }),
      }),

    deleteProgressPhoto: (orderId: string, photoId: string) =>
      request<{ success: boolean }>('/admin/orders/delete-progress-photo', {
        method: 'POST',
        body: JSON.stringify({ orderId, photoId }),
      }),

    // Gallery
    saveGalleryItem: (item: any) =>
      request<{ success: boolean; item?: any }>('/admin/gallery', {
        method: 'POST',
        body: JSON.stringify({ item }),
      }),

    deleteGalleryItem: (id: string) =>
      request<{ success: boolean }>(`/admin/gallery/${id}`, {
        method: 'DELETE',
      }),

    // Reviews
    approveReview: (reviewId: string) =>
      request<{ success: boolean }>('/admin/reviews/approve', {
        method: 'POST',
        body: JSON.stringify({ reviewId }),
      }),

    replyToReview: (reviewId: string, replyText: string) =>
      request<{ success: boolean }>('/admin/reviews/reply', {
        method: 'POST',
        body: JSON.stringify({ reviewId, replyText }),
      }),

    deleteReview: (id: string) =>
      request<{ success: boolean }>(`/admin/reviews/${id}`, {
        method: 'DELETE',
      }),

    // Config
    saveConfig: (config: any) =>
      request<{ success: boolean; config?: any }>('/admin/config', {
        method: 'POST',
        body: JSON.stringify({ config }),
      }),

    // Stock
    getStock: () =>
      request<{ success: boolean; stock: any[] }>('/admin/stock'),

    saveStock: (item: any) =>
      request<{ success: boolean; stock?: any[] }>('/admin/stock', {
        method: 'POST',
        body: JSON.stringify({ item }),
      }),

    deleteStock: (id: string) =>
      request<{ success: boolean }>(`/admin/stock/${id}`, {
        method: 'DELETE',
      }),

    // Upload
    uploadImage: (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      return request<{ success: boolean; imageUrl: string }>('/upload', {
        method: 'POST',
        body: formData,
      });
    },

    // ─── Kitchen ───
    getKitchenOrders: () =>
      request<{ success: boolean; orders: any[] }>('/admin/kitchen/orders'),

    updateKitchenStatus: (orderId: string, status: string) =>
      request<{ success: boolean }>('/admin/kitchen/update-status', {
        method: 'POST',
        body: JSON.stringify({ orderId, status }),
      }),

    updateKitchenNotes: (orderId: string, notes: string) =>
      request<{ success: boolean }>('/admin/kitchen/notes', {
        method: 'POST',
        body: JSON.stringify({ orderId, notes }),
      }),

    resetOrderTimer: (orderId: string) =>
      request<{ success: boolean }>('/admin/orders/reset-timer', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      }),

    // ─── Inline Voucher desde Planilla ───
    inlineUploadVoucher: (orderId: string, file: File) => {
      const formData = new FormData();
      formData.append('orderId', orderId);
      formData.append('voucher', file);
      return request<{ success: boolean; voucherUrl?: string; voucherName?: string }>('/admin/orders/inline-voucher', {
        method: 'POST',
        body: formData,
      });
    },
  },
};
