import { useState, useEffect, useCallback } from 'react';
import { dbService } from '../../shared/services/dbService';
import AdminPanel from './components/AdminPanel';
import type { Product, Order, Review, GalleryItem, AppConfig, AdminRole } from '../../shared/types';

export default function AdminApp() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRole>('admin');
  const [loading, setLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    try {
      const [fetchedProducts, fetchedReviews, fetchedGallery, fetchedConfig] = await Promise.all([
        dbService.getProducts().catch(() => []),
        dbService.getReviews().catch(() => []),
        dbService.getGallery().catch(() => []),
        dbService.getConfig().catch(() => null),
      ]);

      setProducts(fetchedProducts);
      setReviews(fetchedReviews);
      setGalleryItems(fetchedGallery);
      setConfig(fetchedConfig as AppConfig | null);
    } catch {
      // Silently fail on initial load
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('maison_admin_token');
      if (!token) return;
      const fetchedOrders = await dbService.getOrders();
      setOrders(fetchedOrders);
    } catch {
      // fail silently
    }
  }, []);

  // Check auth on mount and load data
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const valid = await dbService.adminVerifyToken();
      setIsLoggedIn(valid);
      if (valid) {
        const savedRole = localStorage.getItem('maison_admin_role') as AdminRole | null;
        if (savedRole) setAdminRole(savedRole);
      }
      await loadAllData();
      if (valid) await loadOrders();
      setLoading(false);
    };
    init();
  }, [loadAllData, loadOrders]);

  const handleLoginSuccess = async (role: AdminRole) => {
    setIsLoggedIn(true);
    setAdminRole(role);
    await loadOrders();
    localStorage.setItem('maison_admin_role', role);
  };

  const handleLogout = async () => {
    await dbService.adminLogout();
    localStorage.removeItem('maison_admin_role');
    setIsLoggedIn(false);
    setAdminRole('admin');
  };

  const handleRefreshData = async () => {
    await loadAllData();
    await loadOrders();
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-inner">
          <div className="admin-loading-spinner" />
          <p className="admin-loading-text">Cargando panel...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminPanel
      products={products}
      orders={orders}
      setOrders={setOrders}
      reviews={reviews}
      galleryItems={galleryItems}
      config={config || {
        whatsappNumber: '51902568187',
        facebookUrl: '',
        instagramUrl: '',
        email: 'edwinraulrosasalbines@gmail.com',
        address: 'Av. Ricardo Palma 213, Sullana',
        openingHours: 'Lun-Sab 9:00-19:00',
        seoTitle: 'Maison Rosas',
        seoDescription: 'Pastelería fina',
        maintenanceMode: false,
      }}
      onRefreshData={handleRefreshData}
      onLoginSuccess={handleLoginSuccess}
      isLoggedIn={isLoggedIn}
      adminRole={adminRole}
      onLogout={handleLogout}
    />
  );
}
