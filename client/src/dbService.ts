import { compressImage } from './utils/images';
import { Product, Review, Order, GalleryItem, AppConfig, CakeStock } from './types';
import { api } from './api/client.js';

// Seed is handled server-side via MySQL seeder (npm run db:seed)
export async function seedDatabaseIfNeeded() {
  return Promise.resolve();
}

// Métodos de servicio para la App — delegates to the API client
export const dbService = {
  // ─── Productos ───
  async getProducts(): Promise<Product[]> {
    return api.getProducts();
  },

  async saveProduct(product: Product): Promise<void> {
    await api.admin.saveProduct(product);
  },

  async deleteProduct(id: string): Promise<void> {
    await api.admin.deleteProduct(id);
  },

  // ─── Opiniones (Reviews) ───
  async getReviews(): Promise<Review[]> {
    return api.getReviews();
  },

  async addReview(review: Review): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'x-admin-token': token } : {}) },
      body: JSON.stringify({ review })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al crear la opinión.');
    }
  },

  async updateReview(review: Review): Promise<void> {
    if (review.approved && !review.response) {
      await api.admin.approveReview(review.id);
    } else {
      await api.admin.replyToReview(review.id, review.response || '');
    }
  },

  async deleteReview(id: string): Promise<void> {
    await api.admin.deleteReview(id);
  },

  // ─── Pedidos (Orders) ───
  async getOrders(): Promise<Order[]> {
    const result = await api.admin.getOrders();
    return result.success ? result.orders : [];
  },

  async addOrder(order: Omit<Order, 'id' | 'trackingCode'>): Promise<{ success: boolean; id: string; trackingCode: string }> {
    return api.createOrder(order);
  },

  async updateOrderStatus(id: string, status: Order['status']): Promise<void> {
    await api.admin.updateOrderStatus(id, status);
  },

  async deleteOrder(id: string): Promise<void> {
    await api.admin.deleteOrder(id);
  },

  async updateOrder(order: Order): Promise<void> {
    await api.admin.updateOrder(order);
  },

  async uploadVoucher(orderId: string, file: File): Promise<any> {
    return api.admin.uploadVoucher(orderId, file);
  },

  async deleteVoucher(orderId: string, voucherPath?: string): Promise<void> {
    await api.admin.deleteVoucher(orderId, voucherPath);
  },

  async updateOrderPayment(orderId: string, paymentDetails: {
    paymentStatus: string;
    paymentMethod: string;
    montoPagado: number;
    fechaPago: string;
    confirmedByAdmin: string;
  }): Promise<void> {
    await api.admin.updateOrderPayment(orderId, paymentDetails);
  },

  // ─── Galería ───
  async getGallery(): Promise<GalleryItem[]> {
    return api.getGallery();
  },

  async saveGalleryItem(item: GalleryItem): Promise<void> {
    await api.admin.saveGalleryItem(item);
  },

  async deleteGalleryItem(id: string): Promise<void> {
    await api.admin.deleteGalleryItem(id);
  },

  // ─── Configuración de la App ───
  async getConfig(): Promise<AppConfig> {
    return api.getConfig();
  },

  async saveConfig(config: AppConfig): Promise<void> {
    await api.admin.saveConfig(config);
  },

  // ─── Admin Authentication ───
  async adminLogin(password: string, role?: string): Promise<{ success: boolean; token?: string; expiresAt?: string; error?: string }> {
    const result = await api.admin.login(password, role);
    if (result.success && result.token) {
      localStorage.setItem('maison_admin_token', result.token);
      localStorage.setItem('maison_admin_logged', 'true');
    }
    return result;
  },

  async adminVerifyToken(): Promise<boolean> {
    const token = localStorage.getItem('maison_admin_token');
    if (!token) return false;
    try {
      const result = await api.admin.verify();
      if (result.success && result.valid) return true;
      // Token inválido (expirado o revocado) — limpiar
      localStorage.removeItem('maison_admin_token');
      localStorage.removeItem('maison_admin_logged');
      return false;
    } catch {
      // Error de conexión o 401 — limpiar token vencido para evitar errores en cascada
      localStorage.removeItem('maison_admin_token');
      localStorage.removeItem('maison_admin_logged');
      return false;
    }
  },

  async adminLogout(): Promise<void> {
    await api.admin.logout().catch(() => {});
    localStorage.removeItem('maison_admin_token');
    localStorage.removeItem('maison_admin_logged');
  },

  // ── Role Passwords Management ──
  async getRolePasswordsStatus(): Promise<{ success: boolean; roles?: any; credentials_emailed?: boolean; error?: string }> {
    return api.admin.getRolePasswords().catch(() => ({
      success: false, error: 'Error al obtener estado de contraseñas de roles.'
    }));
  },

  async saveRolePasswords(analystPassword: string, stockManagerPassword: string): Promise<{ success: boolean; error?: string }> {
    return api.admin.saveRolePasswords(analystPassword, stockManagerPassword).catch(() => ({
      success: false, error: 'Error al guardar contraseñas de roles.'
    }));
  },

  // ── Activity Log ──
  async getActivityLogs(): Promise<{ success: boolean; logs?: any[]; error?: string }> {
    return api.admin.getActivityLogs().catch(() => ({
      success: false, error: 'Error al obtener registro de actividades.'
    }));
  },

  // ── Change Admin Master Password ──
  async changeAdminPassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await api.admin.changePassword(currentPassword, newPassword);
      return result.success
        ? { success: true }
        : { success: false, error: result.error || 'Error al cambiar la contraseña.' };
    } catch {
      return { success: false, error: 'Error de conexión con el servidor.' };
    }
  },

  // ── Send One-Time Credentials Email ──
  async sendCredentialsEmail(): Promise<{ success: boolean; alreadySent?: boolean; message?: string; error?: string }> {
    return api.admin.sendCredentials().catch(() => ({
      success: false, error: 'Error al enviar correo de credenciales.'
    }));
  },

  // ── Cake Stock ──
  async getCakeStock(): Promise<CakeStock[]> {
    try {
      const result = await api.admin.getStock();
      return result.success ? result.stock : [];
    } catch {
      console.error("Error fetching cake stock:");
      return [];
    }
  },

  async saveCakeStock(item: CakeStock): Promise<void> {
    await api.admin.saveStock(item);
  },

  async deleteCakeStock(id: string): Promise<void> {
    await api.admin.deleteStock(id);
  },

  async assignStockToOrder(orderId: string, stockId: string): Promise<any> {
    return api.admin.assignStockToOrder(orderId, stockId);
  },

  async addProgressPhoto(orderId: string, imageUrl: string, caption: string, stage: string): Promise<void> {
    await api.admin.addProgressPhoto(orderId, imageUrl, caption, stage);
  },

  async deleteProgressPhoto(orderId: string, photoId: string): Promise<void> {
    await api.admin.deleteProgressPhoto(orderId, photoId);
  },

  // Upload image through the server API
  async uploadImageToStorage(file: File): Promise<string> {
    let fileToUpload = file;
    try {
      const compressed = await compressImage(file, { maxWidth: 1200 });
      fileToUpload = new File([compressed], file.name.replace(/\.[^.]+$/, '.webp'), {
        type: compressed.type || 'image/webp'
      });
    } catch (e) {
      console.warn('[uploadImageToStorage] Error al comprimir, se usará el original:', e);
    }

    const result = await api.admin.uploadImage(fileToUpload);
    return result.imageUrl;
  }
};
