import { api } from './client.js';

// Replacement for dbService calls from App.tsx
// All Firebase → MySQL migration

export async function loadAllData() {
  const [products, reviews, gallery, config, orders] = await Promise.all([
    api.getProducts().catch(() => []),
    api.getReviews().catch(() => []),
    api.getGallery().catch(() => []),
    api.getConfig().catch(() => null),
    api.getOrders().catch(() => []),
  ]);

  return { products, reviews, gallery, config, orders };
}

// Seed is now handled by the MySQL seeder script (npm run db:seed)
// No need for client-side seeding anymore
export async function seedDatabaseIfNeeded() {
  // No-op: seeding is done server-side
  return Promise.resolve();
}

// Admin auth helpers
export async function adminLogin(password: string, role?: string) {
  const result = await api.admin.login(password, role);
  if (result.success && result.token) {
    localStorage.setItem('maison_admin_token', result.token);
    localStorage.setItem('maison_admin_logged', 'true');
    if (role) localStorage.setItem('maison_admin_role', role);
  }
  return result;
}

export async function adminVerifyToken(): Promise<boolean> {
  const token = localStorage.getItem('maison_admin_token');
  if (!token) return false;
  try {
    const result = await api.admin.verify();
    if (result.success && result.valid) return true;
    localStorage.removeItem('maison_admin_token');
    localStorage.removeItem('maison_admin_logged');
    return false;
  } catch {
    return false;
  }
}

export async function adminLogout() {
  await api.admin.logout().catch(() => {});
  localStorage.removeItem('maison_admin_token');
  localStorage.removeItem('maison_admin_logged');
  localStorage.removeItem('maison_admin_role');
}
