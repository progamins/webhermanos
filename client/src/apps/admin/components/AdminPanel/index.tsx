import React, { useState, useCallback } from 'react';
import { Toaster } from '../../../../shared/components/ui';
import {
  LayoutDashboard, Cake, ShoppingBag, MessageSquare, Settings, RefreshCw,
  Image, Layers, CreditCard, LogOut, Trash2, HardDrive, Search, X
} from 'lucide-react';
import type { Product, Order, Review, GalleryItem, AppConfig, AdminRole } from '../../../../shared/types';
import { dbService } from '../../../../shared/services/dbService';
import { showToast } from '../../../../shared/utils/toast';
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
import VoucherModal from '../../../../shared/components/VoucherModal';
import ScreenshotModal from '../../../../shared/components/ScreenshotModal';

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

const SIDEBAR_SECTIONS: { title: string; tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] }[] = [
  {
    title: 'Negocio',
    tabs: [
      { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
      { id: 'products', label: 'Modelos', icon: Cake },
      { id: 'stock', label: 'Stock Físico', icon: Layers },
      { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
      { id: 'payments', label: 'Pagos', icon: CreditCard },
    ],
  },
  {
    title: 'Contenido',
    tabs: [
      { id: 'reviews', label: 'Opiniones', icon: MessageSquare },
      { id: 'images', label: 'Galería', icon: Image },
      { id: 'storage', label: 'Archivos', icon: HardDrive },
    ],
  },
  {
    title: 'Sistema',
    tabs: [
      { id: 'settings', label: 'Configuración', icon: Settings },
    ],
  },
];

const ROLE_TABS: Record<AdminRole, ActiveTab[]> = {
  admin: ['dashboard', 'products', 'stock', 'orders', 'payments', 'reviews', 'images', 'storage', 'settings'],
  analyst: ['dashboard', 'orders', 'payments', 'reviews'],
  stock_manager: ['dashboard', 'stock', 'images'],
};

const ROLE_CONFIG: Record<AdminRole, { label: string; color: string }> = {
  admin: { label: 'Administrador', color: 'bg-indigo-500' },
  analyst: { label: 'Analista', color: 'bg-blue-500' },
  stock_manager: { label: 'Gestor de Stock', color: 'bg-emerald-500' },
};

export default function AdminPanel({
  products, orders, setOrders, reviews, galleryItems, config,
  onRefreshData, onLoginSuccess, isLoggedIn, adminRole = 'admin',
  onLogout
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
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
  const allowedTabs = ROLE_TABS[adminRole] || ROLE_TABS.admin;

  // Filtrar secciones del sidebar según el rol
  const filteredSections = SIDEBAR_SECTIONS.map(section => ({
    ...section,
    tabs: section.tabs.filter(tab => allowedTabs.includes(tab.id)),
  })).filter(section => section.tabs.length > 0);

  // Búsqueda global
  const filteredData = searchQuery.toLowerCase();
  const searchResults = filteredData ? {
    products: products.filter(p => p.name.toLowerCase().includes(filteredData)),
    orders: orders.filter(o => o.customerName.toLowerCase().includes(filteredData) || o.trackingCode.toLowerCase().includes(filteredData)),
  } : null;

  return (
    <div className="admin-layout">
      {/* ═══ SIDEBAR ═══ */}
      <aside className="admin-sidenav">
        <div className="admin-sidenav-header">
          <div className="admin-sidenav-brand">Maison Rosas</div>
          <div className="admin-sidenav-brand-sub">Panel de Administración</div>
        </div>

        <nav className="admin-sidenav-nav">
          {filteredSections.map(section => (
            <div key={section.title} className="admin-sidenav-section">
              <div className="admin-sidenav-section-title">{section.title}</div>
              {section.tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`admin-sidenav-item ${isActive ? 'active' : ''}`}
                    role="tab"
                    aria-selected={isActive}
                  >
                    <Icon aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="admin-sidenav-footer">
          <div className="flex items-center gap-2 px-3 py-2 mb-2">
            <span className={`w-1.5 h-1.5 rounded-full ${roleInfo.color}`} />
            <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--admin-sidenav-text)', opacity: 0.6 }}>
              {roleInfo.label}
            </span>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="admin-sidenav-item"
              style={{ color: 'var(--admin-sidenav-text)', opacity: 0.5 }}
            >
              <LogOut aria-hidden="true" />
              <span>Cerrar Sesión</span>
            </button>
          )}
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="admin-main">
        {/* ─── Header ─── */}
        <header className="admin-header">
          <div className="admin-header-left">
            <h1 className="admin-header-title">
              {filteredSections.flatMap(s => s.tabs).find(t => t.id === activeTab)?.label || 'Panel'}
            </h1>
          </div>
          <div className="admin-header-right">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--admin-text-muted)' }} aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar productos o pedidos..."
                className="pl-9 pr-3 py-2 text-xs rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                style={{ backgroundColor: 'var(--admin-bg-alt)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)', width: '220px' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700">
                  <X className="h-3 w-3" style={{ color: 'var(--admin-text-muted)' }} />
                </button>
              )}
            </div>

            <button
              onClick={handleRefresh}
              className="admin-btn admin-btn-ghost admin-btn-icon"
              title="Sincronizar datos"
              aria-label="Sincronizar datos"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleClearCache}
              className="admin-btn admin-btn-ghost admin-btn-icon"
              title="Limpiar caché"
              aria-label="Limpiar caché"
            >
              <Trash2 className="h-4 w-4" style={{ color: 'var(--admin-warning)' }} />
            </button>
          </div>
        </header>

        {/* ─── Content ─── */}
        <div className="admin-content">
          {/* Search Results Overlay */}
          {searchResults && (
            <div className="mb-6 p-4 rounded-xl border" style={{ backgroundColor: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                  Resultados para "{searchQuery}"
                </h3>
                <button onClick={() => setSearchQuery('')} className="text-xs font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                  Limpiar búsqueda
                </button>
              </div>
              <div className="flex gap-4 text-xs flex-wrap">
                <span style={{ color: 'var(--admin-text-secondary)' }}>
                  🎂 {searchResults.products.length} {searchResults.products.length === 1 ? 'modelo' : 'modelos'} encontrados
                </span>
                <span style={{ color: 'var(--admin-text-secondary)' }}>
                  📦 {searchResults.orders.length} {searchResults.orders.length === 1 ? 'pedido' : 'pedidos'} encontrados
                </span>
              </div>
            </div>
          )}

          <div id="admin-tab-content">
            {activeTab === 'dashboard' && (
              <AdminDashboard
                orders={orders}
                products={products}
                onNavigate={(tab) => setActiveTab(tab as ActiveTab)}
              />
            )}
            {activeTab === 'products' && (
              <AdminProducts
                products={searchResults ? searchResults.products : products}
                onRefreshData={onRefreshData}
                showToast={showToast}
              />
            )}
            {activeTab === 'orders' && (
              <AdminOrders
                orders={searchResults ? searchResults.orders : orders}
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
      </main>

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
        }}
      />
    </div>
  );
}
