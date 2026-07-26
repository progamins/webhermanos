import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ChefHat, CheckCircle2, AlertCircle, Timer, TimerReset, Utensils, Sparkles, Pizza, CookingPot, Loader2, ChefHatIcon, ScrollText, ChevronRight } from 'lucide-react';
import { Order } from '../../../../shared/types';
import { dbService } from '../../../../shared/services/dbService';

interface AdminKitchenProps {
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
}

// ─── Color palette for kitchen statuses ───
const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string; textColor: string }> = {
  Pendiente: { label: 'En Espera', icon: Clock, color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', textColor: '#92400E' },
  Confirmado: { label: 'Confirmado', icon: ChefHat, color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', textColor: '#1E40AF' },
  Preparando: { label: 'En Horno 🍞', icon: CookingPot, color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', textColor: '#991B1B' },
  'Decoración': { label: 'Decorando 🎨', icon: Sparkles, color: '#EC4899', bg: '#FDF2F8', border: '#FBCFE8', textColor: '#9D174D' },
  Listo: { label: '¡Listo! ✅', icon: CheckCircle2, color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', textColor: '#065F46' },
};

// Order of display in kitchen
const KITCHEN_DISPLAY_ORDER = ['Listo', 'Decoración', 'Preparando', 'Confirmado', 'Pendiente'];

// ─── Elapsed Time Hook ───
function useElapsedTime(statusEnteredAt: string | null, createdAt: string): string {
  const getElapsed = useCallback(() => {
    const start = statusEnteredAt ? new Date(statusEnteredAt).getTime() : new Date(createdAt).getTime();
    const now = Date.now();
    const diff = now - start;
    if (diff < 0) return '0s';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return `${hrs}h ${remainMins}m`;
    }
    return `${mins}m ${secs}s`;
  }, [statusEnteredAt, createdAt]);

  const [elapsed, setElapsed] = useState(getElapsed());

  useEffect(() => {
    setElapsed(getElapsed());
    const interval = setInterval(() => setElapsed(getElapsed()), 1000);
    return () => clearInterval(interval);
  }, [getElapsed]);

  return elapsed;
}

// ─── Timer Badge Component ───
function TimerBadge({ statusEnteredAt, createdAt, isReady }: { statusEnteredAt: string | null; createdAt: string; isReady?: boolean }) {
  const elapsed = useElapsedTime(statusEnteredAt, createdAt);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    const start = statusEnteredAt ? new Date(statusEnteredAt).getTime() : new Date(createdAt).getTime();
    setMinutes(Math.floor((Date.now() - start) / 60000));
  }, [statusEnteredAt, createdAt]);

  const isUrgent = minutes > 30 && !isReady;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition-all ${
      isReady
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : isUrgent
          ? 'bg-red-50 border-red-200 text-red-700 animate-pulse'
          : 'bg-zinc-50 border-zinc-200 text-zinc-600'
    }`}>
      <Timer className={`h-3 w-3 ${isUrgent ? 'text-red-500' : isReady ? 'text-emerald-500' : 'text-zinc-400'}`} />
      <span>{elapsed}</span>
    </div>
  );
}

// ─── Kitchen Card Component ───
function KitchenCard({ order, onUpdateStatus, onRefresh }: {
  order: Order;
  onUpdateStatus: (id: string, status: string) => void;
  onRefresh: () => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG['Pendiente'];
  const Icon = config.icon;
  const isReady = order.status === 'Listo';
  const isPending = order.status === 'Pendiente';

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(order.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  // Get suggested next statuses
  const getNextStatuses = (): { status: string; label: string; icon: React.ElementType; color: string }[] => {
    switch (order.status) {
      case 'Pendiente':
      case 'Confirmado':
        return [
          { status: 'Preparando', label: 'Iniciar Preparación', icon: CookingPot, color: '#EF4444' },
          { status: 'Cancelado', label: 'Cancelar Pedido', icon: AlertCircle, color: '#6B7280' },
        ];
      case 'Preparando':
        return [
          { status: 'Decoración', label: 'Pasar a Decoración', icon: Sparkles, color: '#EC4899' },
          { status: 'Pendiente', label: 'Volver a Espera', icon: Clock, color: '#F59E0B' },
        ];
      case 'Decoración':
        return [
          { status: 'Listo', label: '¡Marcar como Listo!', icon: CheckCircle2, color: '#10B981' },
          { status: 'Preparando', label: 'Volver a Horno', icon: CookingPot, color: '#EF4444' },
        ];
      case 'Listo':
        return [
          { status: 'En camino', label: 'En Camino', icon: ChefHat, color: '#8B5CF6' },
          { status: 'Decoración', label: 'Volver a Decoración', icon: Sparkles, color: '#EC4899' },
        ];
      default:
        return [];
    }
  };

  const nextStatuses = getNextStatuses();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
        isReady
          ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-lg shadow-emerald-100/50'
          : 'border-zinc-200 bg-white hover:shadow-md hover:border-zinc-300'
      }`}
    >
      {/* Status strip on top */}
      <div className={`h-1.5 w-full`} style={{ backgroundColor: config.color }} />

      <div className="p-4">
        {/* Header: Status + Timer */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl`} style={{ backgroundColor: config.bg }}>
              <Icon className="h-5 w-5" style={{ color: config.color }} />
            </div>
            <div>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border"
                style={{ backgroundColor: config.bg, borderColor: config.border, color: config.textColor }}
              >
                {config.label}
              </span>
              <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                #{order.trackingCode || order.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <TimerBadge statusEnteredAt={(order as any).statusEnteredAt} createdAt={order.date} isReady={isReady} />
        </div>

        {/* Customer + Product Info */}
        <div className="mb-3">
          <h3 className="font-bold text-sm text-zinc-900">{order.customerName}</h3>
          <p className="text-xs text-zinc-600 mt-0.5">
            {order.productName}
            <span className="text-zinc-400 mx-1">·</span>
            {order.flavor}
          </p>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-400">
            {order.size && (
              <span className="inline-flex items-center gap-1">
                <Utensils className="h-3 w-3" />
                {order.size}
              </span>
            )}
            {order.totalPrice && (
              <span className="inline-flex items-center gap-1 font-mono font-bold text-brand-500">
                S/.{order.totalPrice}
              </span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-1.5">
          {nextStatuses.slice(0, 2).map((action) => (
            <button
              key={action.status}
              onClick={() => handleStatusChange(action.status)}
              disabled={isUpdating}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-150 active:scale-[0.98] disabled:opacity-50 cursor-pointer border hover:shadow-sm"
              style={{
                backgroundColor: action.color + '10',
                borderColor: action.color + '30',
                color: action.color,
              }}
            >
              <span className="flex items-center gap-2">
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </span>
              {isUpdating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          ))}
        </div>

        {/* Customer extra info */}
        {(order.customerPhone || order.message) && (
          <div className="mt-3 pt-3 border-t border-dashed border-zinc-100">
            {order.customerPhone && (
              <p className="text-[9px] text-zinc-400 font-mono">
                📞 {order.customerPhone}
              </p>
            )}
            {order.message && (
              <p className="text-[9px] text-zinc-500 mt-0.5 italic line-clamp-2">
                "{order.message}"
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Kitchen Component ───
export default function AdminKitchen({ showToast }: AdminKitchenProps) {
  const [kitchenOrders, setKitchenOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadKitchenOrders = useCallback(async () => {
    try {
      const data = await dbService.getKitchenOrders();
      setKitchenOrders(data);
    } catch {
      showToast('Error al cargar pedidos de cocina', 'error', 'Cocina');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadKitchenOrders();
    const interval = setInterval(loadKitchenOrders, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [loadKitchenOrders]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await dbService.updateKitchenStatus(orderId, status);
      showToast(`Pedido actualizado a ${STATUS_CONFIG[status]?.label || status}`, 'success', '🍳 Cocina');
      loadKitchenOrders();
    } catch {
      showToast('Error al actualizar estado', 'error', 'Error');
    }
  };

  // Group orders by status in kitchen display order
  const groupedOrders = KITCHEN_DISPLAY_ORDER.reduce((acc, status) => {
    const filtered = kitchenOrders.filter(o => o.status === status);
    if (filtered.length > 0) {
      acc[status] = filtered;
    }
    return acc;
  }, {} as Record<string, Order[]>);

  // Filter by selected status
  const filteredGrouped = filterStatus === 'all'
    ? groupedOrders
    : { [filterStatus]: groupedOrders[filterStatus] || [] };

  const counts = KITCHEN_DISPLAY_ORDER.reduce((acc, status) => {
    acc[status] = kitchenOrders.filter(o => o.status === status).length;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-brand-500" />
          <p className="text-sm text-zinc-400">Cargando cocina...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50/50 dark:from-zinc-900 dark:to-zinc-950 border border-orange-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <ChefHatIcon className="h-5 w-5" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em]">Cocina · Live</span>
            </div>
            <h2 className="text-xl font-serif font-bold text-zinc-900 dark:text-white">
              Panel de Cocina
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {kitchenOrders.length} pedidos en flujo · Actualizado en tiempo real
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); loadKitchenOrders(); }}
            className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-mono font-bold tracking-wider text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 transition-all cursor-pointer"
          >
            ↻ Refrescar
          </button>
        </div>

        {/* Status filter chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold font-mono transition-all border cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
            }`}
          >
            Todos ({kitchenOrders.length})
          </button>
          {KITCHEN_DISPLAY_ORDER.map(status => {
            const config = STATUS_CONFIG[status];
            if (!config || !counts[status]) return null;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold font-mono transition-all border cursor-pointer ${
                  filterStatus === status
                    ? 'text-white border-transparent'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                }`}
                style={filterStatus === status ? {
                  backgroundColor: config.color,
                  borderColor: config.color,
                } : {}}
              >
                {counts[status]} {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Kitchen Columns ─── */}
      {Object.keys(filteredGrouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <ChefHatIcon className="h-12 w-12 mb-4 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-500">No hay pedidos en esta sección</p>
          <p className="text-[10px] text-zinc-400 mt-1">Los pedidos aparecerán aquí cuando los clientes hagan sus reservas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {KITCHEN_DISPLAY_ORDER.map(status => {
            const ordersInStatus = filteredGrouped[status];
            if (!ordersInStatus || ordersInStatus.length === 0) return null;
            const config = STATUS_CONFIG[status];

            return (
              <div key={status}>
                {/* Status column header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: config?.bg }}>
                    {config && <config.icon className="h-4 w-4" style={{ color: config?.color }} />}
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: config?.color }}>
                    {config?.label} ({ordersInStatus.length})
                  </span>
                </div>
                <AnimatePresence>
                  <div className="space-y-3">
                    {ordersInStatus.map(order => (
                      <KitchenCard
                        key={order.id}
                        order={order}
                        onUpdateStatus={handleUpdateStatus}
                        onRefresh={loadKitchenOrders}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Stats Bar ─── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
        <span>
          🕐 Actualizado: {new Date().toLocaleTimeString('es-PE')}
        </span>
        <span className="text-zinc-500">
          ⏱️ Tiempos desde que entró al estado actual
        </span>
      </div>
    </div>
  );
}
