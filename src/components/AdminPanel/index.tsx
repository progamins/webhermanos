import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Cake, ShoppingBag, MessageSquare, Settings, RefreshCw,
  Image, Layers, CreditCard, Check, X, Sparkles, Clock
} from 'lucide-react';
import { Product, Order, Review, GalleryItem, AppConfig } from '../../types';
import { dbService } from '../../dbService';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import AdminProducts from './AdminProducts';
import AdminOrders from './AdminOrders';
import AdminPayments from './AdminPayments';
import AdminReviews from './AdminReviews';
import AdminGallery from './AdminGallery';
import AdminSettings from './AdminSettings';
import AdminStock from './AdminStock';
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
  onLoginSuccess: () => void;
  isLoggedIn: boolean;
}

type ActiveTab = 'dashboard' | 'products' | 'orders' | 'reviews' | 'settings' | 'images' | 'payments' | 'stock';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
}

export default function AdminPanel({
  products, orders, setOrders, reviews, galleryItems, config,
  onRefreshData, onLoginSuccess, isLoggedIn
}: AdminPanelProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [voucherModalOrder, setVoucherModalOrder] = useState<Order | null>(null);
  const [screenshotUrlToView, setScreenshotUrlToView] = useState<string | null>(null);
  const [screenshotTitleToView, setScreenshotTitleToView] = useState<string>('');
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success', title?: string) => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const handleRefresh = () => {
    onRefreshData();
    showToast('Datos sincronizados correctamente con Cloud Firestore.', 'info', 'Sincronizado');
  };

  if (!isLoggedIn) {
    return <AdminLogin onLoginSuccess={onLoginSuccess} />;
  }

  const tabs = [
    { id: 'dashboard' as const, label: 'Panel Principal', icon: LayoutDashboard },
    { id: 'products' as const, label: 'Modelos / Plantillas', icon: Cake },
    { id: 'stock' as const, label: 'Stock Físico', icon: Layers },
    { id: 'orders' as const, label: 'Pedidos', icon: ShoppingBag },
    { id: 'payments' as const, label: 'Pagos y Comprobantes', icon: CreditCard },
    { id: 'reviews' as const, label: 'Opiniones', icon: MessageSquare },
    { id: 'images' as const, label: 'Galería', icon: Image },
    { id: 'settings' as const, label: 'Configuración', icon: Settings },
  ];

  const toastIcons: Record<string, React.ReactNode> = {
    success: <Check className="h-3 w-3" />,
    error: <X className="h-3 w-3" />,
    info: <Sparkles className="h-3 w-3" />,
    warning: <Clock className="h-3 w-3" />,
  };

  const toastBg: Record<string, string> = {
    success: 'bg-emerald-500/20 text-emerald-500',
    error: 'bg-red-500/20 text-red-500',
    info: 'bg-blue-500/20 text-blue-500',
    warning: 'bg-amber-500/20 text-amber-500',
  };

  return (
    <section className="py-24 bg-brand-bg dark:bg-zinc-950 min-h-screen relative overflow-hidden">
      {/* Animated fluid background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-75">
        <div className="absolute top-[10%] left-[5%] w-[450px] h-[450px] rounded-full bg-brand-100/40 dark:bg-brand-950/15 blur-3xl animate-blob-1" />
        <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] rounded-full bg-brand-200/30 dark:bg-brand-900/10 blur-3xl animate-blob-2" />
        <div className="absolute top-[40%] right-[30%] w-[350px] h-[350px] rounded-full bg-rose-100/30 dark:bg-rose-950/10 blur-3xl animate-blob-3" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/20 dark:border-zinc-800 pb-6 mb-8 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1 bg-brand-500 text-white rounded-md text-[9px] font-mono uppercase font-bold tracking-wider shadow-sm">PRO</span>
              <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">Sesión Segura • Edwin Raúl Rosas Albines</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-zinc-950 dark:text-white mt-1">Panel de Administración</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={handleRefresh}
              className="p-2.5 border border-white/30 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/40 rounded-xl hover:bg-white/60 dark:hover:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 transition-all hover:scale-[1.03] shadow-sm flex items-center justify-center cursor-pointer"
              title="Sincronizar Firestore" id="admin-refresh-data">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap md:space-x-2 gap-2 p-2 mb-8 liquid-glass border border-white/35 dark:border-zinc-800/40 rounded-3xl shadow-sm" id="admin-panel-tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center md:justify-start space-x-2 px-3 py-3 md:px-5 md:py-3.5 rounded-2xl text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 scale-[1.02]'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white/40 dark:hover:bg-zinc-800/40'
                }`}
                id={`admin-tab-btn-${tab.id}`}>
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
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
              products={products}
              onRefreshData={onRefreshData}
              showToast={showToast}
            />
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
            <AdminReviews
              reviews={reviews}
              onRefreshData={onRefreshData}
              showToast={showToast}
            />
          )}

          {activeTab === 'images' && (
            <AdminGallery
              galleryItems={galleryItems}
              config={config}
              onRefreshData={onRefreshData}
              showToast={showToast}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettings
              config={config}
              onRefreshData={onRefreshData}
              showToast={showToast}
            />
          )}

          {activeTab === 'stock' && (
            <AdminStock
              products={products}
              orders={orders}
              onRefreshData={onRefreshData}
              showToast={showToast}
            />
          )}
        </div>
      </div>

      {/* Payment Management Modal */}
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

      {/* Voucher / Digital Receipt Modal */}
      <VoucherModal
        order={voucherModalOrder}
        isOpen={voucherModalOrder !== null}
        onClose={() => setVoucherModalOrder(null)}
      />

      {/* Screenshot Modal */}
      <ScreenshotModal
        imageUrl={screenshotUrlToView}
        title={screenshotTitleToView}
        isOpen={screenshotUrlToView !== null}
        onClose={() => {
          setScreenshotUrlToView(null);
          setScreenshotTitleToView('');
        }}
      />

      {/* Toast Notifications */}
      <div className="fixed top-6 right-6 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none" id="toasts-portal-admin">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9, rotate: -1 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              layout
              className="pointer-events-auto liquid-glass liquid-glass-sheen border border-white/40 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xl flex items-start space-x-3 backdrop-blur-xl"
              id={`toast-${toast.id}`}
            >
              <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${toastBg[toast.type]}`}>
                {toastIcons[toast.type]}
              </div>
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h5 className="text-[10px] font-mono font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    {toast.title}
                  </h5>
                )}
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 leading-relaxed font-sans">
                  {toast.message}
                </p>
              </div>
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors shrink-0 cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
