import React, { useState, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard, Cake, ShoppingBag, MessageSquare, Settings, RefreshCw,
  Image, Layers, CreditCard, LogOut, Trash2, HardDrive
} from 'lucide-react';
import type { Product, Order, Review, GalleryItem, AppConfig, AdminRole } from '../../types';
import { dbService } from '../../dbService';
import { showToast } from '../../utils/toast';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import AdminProducts from './AdminProducts';
import AdminOrders from './AdminOrders';
import AdminPayments from './AdminPayments';
import AdminReviews from './AdminReviews';
import AdminGallery from './AdminGallery';
import AdminSettings from './AdminSettings';
import AdminStock from './AdminStock';
import AdminImageManager from './AdminImageManager';
import AdminPaymentModal from './AdminPaymentModal';
import VoucherModal from '../VoucherModal';
import ScreenshotModal from '../ScreenshotModal';

export interface AdminPanelProps {
  products: Product[];
  orders: Order[];
  setOrders?: React.Dispatch<React.SetStateAction<Order[]>>;
  reviews: Review[];
  galleryItems: GalleryItem[];
  config: AppConfig;
  onRefreshData: () => void;
  onLoginSuccess: (role: AdminRole) => void;
  isLoggedIn: boolean;
  adminRole?: AdminRole;
  onLogout?: () => void;
}

type ActiveTab = 'dashboard' | 'products' | 'orders' | 'reviews' | 'settings' | 'images' | 'payments' | 'stock' | 'storage';

const ROLE_TABS: Record<AdminRole, { id: ActiveTab; label: string; icon: React.ElementType }[]> = {
  admin: [
    { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
    { id: 'products', label: 'Modelos / Plantillas', icon: Cake },
    { id: 'stock', label: 'Stock Físico', icon: Layers },
    { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
    { id: 'payments', label: 'Pagos y Comprobantes', icon: CreditCard },
    { id: 'reviews', label: 'Opiniones', icon: MessageSquare },
    { id: 'images', label: 'Galería', icon: Image },
    { id: 'storage', label: 'Almacenamiento', icon: HardDrive },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ],
  analyst: [
    { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
    { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
    { id: 'payments', label: 'Pagos y Comprobantes', icon: CreditCard },
    { id: 'reviews', label: 'Opiniones', icon: MessageSquare },
  ],
  stock_manager: [
    { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
    { id: 'stock', label: 'Stock Físico', icon: Layers },
    { id: 'images', label: 'Galería', icon: Image },
  ],
};

const ROLE_CONFIG: Record<AdminRole, { label: string; color: string }> = {
  admin: { label: 'Administrador', color: 'bg-brand-500' },
  analyst: { label: 'Analista', color: 'bg-blue-500' },
  stock_manager: { label: 'Gestor de Stock', color: 'bg-emerald-500' },
};

export default function AdminPanel({
  products, orders, setOrders, reviews, galleryItems, config,
  onRefreshData, onLoginSuccess, isLoggedIn, adminRole = 'admin',
  onLogout
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [voucherModalOrder, setVoucherModalOrder] = useState<Order | null>(null);
  const [screenshotUrlToView, setScreenshotUrlToView] = useState<string | null>(null);
  const [screenshotTitleToView, setScreenshotTitleToView] = useState<string>('');
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);

  const handleRefresh = useCallback(() => {
    onRefreshData();
    showToast('Datos sincronizados correctamente.', 'success', 'Sincronizado');
  }, [onRefreshData]);

  const handleClearCache = useCallback(async () => {
    if (!('caches' in window)) {
      showToast('El API de caché no está disponible.', 'warning', 'No soportado');
      return;
    }
    try {
      const keys = await caches.keys();
      const maisonCaches = keys.filter(k => k.startsWith('maison-'));
      if (maisonCaches.length === 0) {
        showToast('No hay caché para limpiar.', 'info', 'Cache vacío');
        return;
      }
      await Promise.all(maisonCaches.map(k => caches.delete(k)));
      showToast(`Cache limpiado (${maisonCaches.length} almacén${maisonCaches.length > 1 ? 'es' : ''}).`, 'success', '🧹 Cache eliminado');
    } catch {
      showToast('Error al limpiar el caché.', 'error', 'Error');
    }
  }, []);

  if (!isLoggedIn) {
    return <AdminLogin onLoginSuccess={(role) => onLoginSuccess(role)} />;
  }

  const roleInfo = ROLE_CONFIG[adminRole] || ROLE_CONFIG.admin;
  const tabs = ROLE_TABS[adminRole] || ROLE_TABS.admin;

  return (
    <section className="py-24 min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--theme-bg)' }}>
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-75" aria-hidden="true">
        <div className="absolute top-[10%] left-[5%] w-[450px] h-[450px] rounded-full bg-brand-100/40 dark:bg-brand-950/15 blur-3xl animate-blob-1" />
        <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] rounded-full bg-brand-200/30 dark:bg-brand-900/10 blur-3xl animate-blob-2" />
        <div className="absolute top-[40%] right-[30%] w-[350px] h-[350px] rounded-full bg-rose-100/30 dark:bg-rose-950/10 blur-3xl animate-blob-3" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 mb-8 gap-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`${roleInfo.color} text-white px-2 py-0.5 rounded-md text-[9px] font-mono uppercase font-bold tracking-wider shadow-sm`}>
                {roleInfo.label}
              </span>
              <span className="text-xs font-mono font-bold" style={{ color: 'var(--theme-text-muted)' }}>Sesión Segura</span>
            </div>
            <h1 className="text-3xl font-serif font-bold mt-1" style={{ color: 'var(--theme-text)' }}>Panel de Administración</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className="p-2.5 border rounded-xl hover:bg-white/60 dark:hover:bg-zinc-800/60 transition-all hover:scale-[1.03] shadow-sm flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}
              title="Sincronizar datos"
              aria-label="Sincronizar datos"
              id="admin-refresh-data"
            >
              <RefreshCw className="h-4 w-4" style={{ color: 'var(--theme-text-secondary)' }} aria-hidden="true" />
            </button>
            <button
              onClick={handleClearCache}
              className="p-2.5 border rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all hover:scale-[1.03] shadow-sm flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}
              title="Limpiar caché del Service Worker"
              aria-label="Limpiar caché"
              id="admin-clear-cache-btn"
            >
              <Trash2 className="h-4 w-4 text-amber-500" aria-hidden="true" />
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2.5 border rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-all hover:scale-[1.03] shadow-sm flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}
                title="Cerrar Sesión"
                aria-label="Cerrar sesión"
                id="admin-logout-btn"
              >
                <LogOut className="h-4 w-4 text-red-400" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap md:space-x-2 gap-2 p-2 mb-8 rounded-3xl shadow-sm border"
          style={{ backgroundColor: 'var(--theme-surface-glass)', borderColor: 'var(--theme-border)' }}
          id="admin-panel-tabs"
          role="tablist"
          aria-label="Secciones del panel"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center md:justify-start space-x-2 px-3 py-3 md:px-5 md:py-3.5 rounded-2xl text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  activeTab === tab.id
                    ? 'bg-brand-500 text-white shadow-md scale-[1.02]'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400'
                }`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`admin-panel-content-${tab.id}`}
                id={`admin-tab-btn-${tab.id}`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div id="admin-tab-content">
          {activeTab === 'dashboard' && (
            <AdminDashboard
              orders={orders}
              products={products}
              onNavigate={(tab) => setActiveTab(tab as ActiveTab)}
            />
          )}
          {activeTab === 'products' && (
            <AdminProducts products={products} onRefreshData={onRefreshData} showToast={showToast} />
          )}
          {activeTab === 'orders' && (
            <AdminOrders
              orders={orders}
              setOrders={setOrders}
              onRefreshData={onRefreshData}
              showToast={showToast}
              onOpenPaymentModal={(ord) => setPaymentModalOrder(ord)}
            />
          )}
          {activeTab === 'payments' && (
            <AdminPayments
              orders={orders}
              setOrders={setOrders}
              onRefreshData={onRefreshData}
              showToast={showToast}
              onViewScreenshot={(url, title) => {
                setScreenshotUrlToView(url);
                setScreenshotTitleToView(title);
              }}
            />
          )}
          {activeTab === 'reviews' && (
            <AdminReviews reviews={reviews} onRefreshData={onRefreshData} showToast={showToast} />
          )}
          {activeTab === 'images' && (
            <AdminGallery galleryItems={galleryItems} config={config} onRefreshData={onRefreshData} showToast={showToast} />
          )}
          {activeTab === 'settings' && (
            <AdminSettings config={config} onRefreshData={onRefreshData} showToast={showToast} />
          )}
          {activeTab === 'stock' && (
            <AdminStock products={products} orders={orders} onRefreshData={onRefreshData} showToast={showToast} />
          )}
          {activeTab === 'storage' && <AdminImageManager />}
        </div>
      </div>

      <AdminPaymentModal
        order={paymentModalOrder}
        isOpen={paymentModalOrder !== null}
        onClose={() => setPaymentModalOrder(null)}
        onSave={onRefreshData}
        showToast={showToast}
        setOrders={setOrders}
        onViewScreenshot={(url, title) => {
          setScreenshotUrlToView(url);
          setScreenshotTitleToView(title);
        }}
        onViewVoucher={(ord) => setVoucherModalOrder(ord)}
      />

      <VoucherModal
        order={voucherModalOrder}
        isOpen={voucherModalOrder !== null}
        onClose={() => setVoucherModalOrder(null)}
      />

      <ScreenshotModal
        imageUrl={screenshotUrlToView}
        title={screenshotTitleToView}
        isOpen={screenshotUrlToView !== null}
        onClose={() => { setScreenshotUrlToView(null); setScreenshotTitleToView(''); }}
      />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4500,
          style: { padding: 0, margin: 0, background: 'transparent', boxShadow: 'none' },
        }}
        containerStyle={{ top: 24, right: 24 }}
      />
    </section>
  );
}
