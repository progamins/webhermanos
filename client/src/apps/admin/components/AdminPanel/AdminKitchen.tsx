import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock, ChefHat, CheckCircle2, AlertCircle, Timer, Utensils, Sparkles,
  CookingPot, Loader2, ChefHatIcon, ChevronRight, RefreshCw,
  MessageSquare, Plus, X, BellRing, BellOff
} from 'lucide-react';
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

const KITCHEN_DISPLAY_ORDER = ['Listo', 'Decoración', 'Preparando', 'Confirmado', 'Pendiente'];

// ─── Sound notification hook ───
function useNewOrderSound() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('maison_kitchen_sound');
    return saved !== 'off';
  });
  const [lastCount, setLastCount] = useState(0);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('maison_kitchen_sound', next ? 'on' : 'off');
  };

  const playNotification = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      // Second ding
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1108;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.45);
    } catch {}
  }, [soundEnabled]);

  return { soundEnabled, toggleSound, lastCount, setLastCount, playNotification };
}

// ─── Confetti effect ───
function ConfettiEffect({ show }: { show: boolean }) {
  if (!show) return null;
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444'][Math.floor(Math.random() * 6)],
    size: Math.random() * 8 + 4,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: -10,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: window.innerHeight + 20, opacity: 0, rotate: 720 }}
          transition={{ duration: 1.5 + p.delay, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

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

// ─── Timer Badge ───
function TimerBadge({ statusEnteredAt, createdAt, isReady }: { statusEnteredAt: string | null; createdAt: string; isReady?: boolean }) {
  const elapsed = useElapsedTime(statusEnteredAt, createdAt);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    const start = statusEnteredAt ? new Date(statusEnteredAt).getTime() : new Date(createdAt).getTime();
    setMinutes(Math.floor((Date.now() - start) / 60000));
  }, [statusEnteredAt, createdAt]);

  const isUrgent = minutes > 30 && !isReady;
  const isWarning = minutes > 15 && minutes <= 30 && !isReady;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition-all ${
      isReady
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : isUrgent
          ? 'bg-red-50 border-red-200 text-red-700 animate-pulse shadow-sm shadow-red-200'
          : isWarning
            ? 'bg-amber-50 border-amber-200 text-amber-700'
            : 'bg-zinc-50 border-zinc-200 text-zinc-600'
    }`}>
      <Timer className={`h-3 w-3 ${isUrgent ? 'text-red-500' : isReady ? 'text-emerald-500' : isWarning ? 'text-amber-500' : 'text-zinc-400'}`} />
      <span>{elapsed}</span>
    </div>
  );
}

// ─── Estimated Time Helper ───
function getEstimatedTime(order: Order): { eta: string; minutes: number } | null {
  if (order.status === 'Listo' || order.status === 'Entregado' || order.status === 'Cancelado') return null;
  if (order.status === 'Pendiente' || order.status === 'Confirmado') return { eta: '~30-45 min', minutes: 30 };
  if (order.status === 'Preparando') return { eta: '~20-30 min', minutes: 20 };
  if (order.status === 'Decoración') return { eta: '~10-15 min', minutes: 10 };
  return null;
}

// ─── Kitchen Card ───
function KitchenCard({ order, onUpdateStatus, isNew }: {
  order: Order;
  onUpdateStatus: (id: string, status: string) => void;
  isNew: boolean;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG['Pendiente'];
  const Icon = config.icon;
  const isReady = order.status === 'Listo';
  const eta = getEstimatedTime(order);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    if (newStatus === 'Listo') setShowConfetti(true);
    try {
      await onUpdateStatus(order.id, newStatus);
    } finally {
      setIsUpdating(false);
      if (newStatus === 'Listo') setTimeout(() => setShowConfetti(false), 2500);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await dbService.updateKitchenNotes(order.id, noteText.trim());
      setNoteText('');
      setShowNoteInput(false);
    } catch {}
  };

  const getNextStatuses = (): { status: string; label: string; icon: React.ElementType; color: string }[] => {
    switch (order.status) {
      case 'Pendiente':
      case 'Confirmado':
        return [
          { status: 'Preparando', label: 'Iniciar Preparación', icon: CookingPot, color: '#EF4444' },
          { status: 'Cancelado', label: 'Cancelar', icon: AlertCircle, color: '#6B7280' },
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
    <>
      <ConfettiEffect show={showConfetti} />
      <motion.div
        layout
        initial={isNew ? { opacity: 0, scale: 0.9, y: -20 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
          isReady
            ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-lg shadow-emerald-100/50'
            : isNew
              ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-white shadow-lg shadow-amber-100/50 animate-pulse'
              : 'border-zinc-200 bg-white hover:shadow-md hover:border-zinc-300'
        }`}
      >
        {/* Top strip */}
        <div className={`h-1.5 w-full`} style={{ backgroundColor: config.color }} />
        {isNew && (
          <div className="absolute top-2 right-2 bg-amber-500 text-white text-[7px] font-mono font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
            Nuevo
          </div>
        )}

        <div className="p-4">
          {/* Header */}
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

          {/* Customer + Product */}
          <div className="mb-3">
            <h3 className="font-bold text-sm text-zinc-900">{order.customerName}</h3>
            <p className="text-xs text-zinc-600 mt-0.5">
              {order.productName}
              <span className="text-zinc-400 mx-1">·</span>
              {order.flavor}
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-400 flex-wrap">
              {order.size && (
                <span className="inline-flex items-center gap-1">
                  <Utensils className="h-3 w-3" /> {order.size}
                </span>
              )}
              {order.totalPrice && (
                <span className="inline-flex items-center gap-1 font-mono font-bold text-brand-500">
                  S/.{order.totalPrice}
                </span>
              )}
              {eta && !isReady && (
                <span className="inline-flex items-center gap-1 text-zinc-400">
                  ⏱️ {eta.eta}
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-1.5">
            {nextStatuses.map((action) => (
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

          {/* Notes section */}
          <div className={`mt-3 ${((order as any).kitchenNotes || showNoteInput) ? 'pt-3 border-t border-dashed border-zinc-100' : ''}`}>
            {(order as any).kitchenNotes && (
              <div className="bg-zinc-50 rounded-lg px-2.5 py-2 mb-2 text-[10px] text-zinc-600 leading-relaxed">
                📝 {(order as any).kitchenNotes}
              </div>
            )}
            {showNoteInput ? (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Nota para cocina..."
                  className="flex-1 px-2 py-1.5 bg-white border border-zinc-200 rounded-lg text-[10px] text-zinc-700 placeholder-zinc-400 focus:outline-none focus:border-orange-300"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  autoFocus
                />
                <button onClick={handleAddNote} className="p-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors cursor-pointer">
                  <Plus className="h-3 w-3" />
                </button>
                <button onClick={() => { setShowNoteInput(false); setNoteText(''); }} className="p-1.5 bg-zinc-100 text-zinc-500 rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowNoteInput(true)} className="flex items-center gap-1 text-[9px] text-zinc-400 hover:text-orange-500 transition-colors cursor-pointer">
                <MessageSquare className="h-3 w-3" />
                <span>{((order as any).kitchenNotes) ? 'Editar nota' : 'Agregar nota'}</span>
              </button>
            )}
          </div>

          {/* Extra info */}
          {(order.customerPhone || order.message) && !showNoteInput && !(order as any).kitchenNotes && (
            <div className="mt-3 pt-3 border-t border-dashed border-zinc-100">
              {order.customerPhone && <p className="text-[9px] text-zinc-400 font-mono">📞 {order.customerPhone}</p>}
              {order.message && <p className="text-[9px] text-zinc-500 mt-0.5 italic line-clamp-2">"{order.message}"</p>}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Kitchen Component ───
export default function AdminKitchen({ showToast }: AdminKitchenProps) {
  const [kitchenOrders, setKitchenOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const lastLoadedAtRef = useRef(Date.now());
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const { soundEnabled, toggleSound, playNotification } = useNewOrderSound();

  const loadKitchenOrders = useCallback(async () => {
    try {
      const data = await dbService.getKitchenOrders();
      const newIds = new Set(data.map(o => o.id));
      const prevIds = prevOrderIdsRef.current;

      // Detect new orders
      for (const order of data) {
        if (!prevIds.has(order.id) && prevIds.size > 0) {
          playNotification();
          showToast(`¡Nuevo pedido de ${order.customerName}!`, 'info', '🍳 Nuevo en Cocina');
          break;
        }
      }
      prevOrderIdsRef.current = newIds;
      setKitchenOrders(data);
      lastLoadedAtRef.current = Date.now();
    } catch {
      showToast('Error al cargar pedidos de cocina', 'error', 'Cocina');
    } finally {
      setLoading(false);
    }
  }, [showToast, playNotification]);

  useEffect(() => {
    loadKitchenOrders();
    const interval = setInterval(loadKitchenOrders, 10000); // Refresh each 10s
    return () => clearInterval(interval);
  }, [loadKitchenOrders]);

  // Reloj en vivo: anima la cuenta regresiva de la próxima actualización
  // y mantiene la hora / alertas de retraso sincronizadas.
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const secondsToRefresh = Math.max(0, Math.ceil(10 - (nowTick - lastLoadedAtRef.current) / 1000));

  // Pedidos que llevan más de 30 min en su estado actual (posible retraso)
  const urgentCount = useMemo(() => kitchenOrders.filter((o) => {
    if (o.status === 'Listo' || o.status === 'Entregado' || o.status === 'Cancelado') return false;
    const start = (o as any).statusEnteredAt ? new Date((o as any).statusEnteredAt).getTime() : new Date(o.date).getTime();
    return (nowTick - start) / 60000 > 30;
  }).length, [kitchenOrders, nowTick]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadKitchenOrders();
    } finally {
      setRefreshing(false);
    }
  }, [loadKitchenOrders]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await dbService.updateKitchenStatus(orderId, status);
      showToast(`Pedido actualizado a ${STATUS_CONFIG[status]?.label || status}`, 'success', '🍳 Cocina');
      await loadKitchenOrders();
    } catch {
      showToast('Error al actualizar estado', 'error', 'Error');
    }
  };

  // Group + filter
  const groupedOrders = KITCHEN_DISPLAY_ORDER.reduce((acc, status) => {
    const filtered = kitchenOrders.filter(o => o.status === status);
    if (filtered.length > 0) acc[status] = filtered;
    return acc;
  }, {} as Record<string, Order[]>);

  const filteredGrouped = filterStatus === 'all'
    ? groupedOrders
    : { [filterStatus]: groupedOrders[filterStatus] || [] };

  const counts = KITCHEN_DISPLAY_ORDER.reduce((acc, status) => {
    acc[status] = kitchenOrders.filter(o => o.status === status).length;
    return acc;
  }, {} as Record<string, number>);

  // New order detection (for highlight)
  const isOrderNew = (orderId: string) => {
    return !prevOrderIdsRef.current.has(orderId) && prevOrderIdsRef.current.size > 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-orange-500" />
          <p className="text-sm text-zinc-400">Cargando cocina...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50/60 to-white dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 border border-orange-100 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        {/* Ambiente decorativo */}
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-orange-200/40 dark:bg-orange-500/10 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-24 -left-16 w-48 h-48 rounded-full bg-amber-200/30 dark:bg-amber-500/5 blur-3xl pointer-events-none" aria-hidden="true" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            {/* Badge EN VIVO + alerta de retraso */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border bg-orange-50/80 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <ChefHatIcon className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-orange-700 dark:text-orange-300">
                  Cocina en vivo
                </span>
              </span>

              {urgentCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500 text-white text-[10px] font-mono font-bold uppercase tracking-wider shadow-sm shadow-red-200 animate-pulse">
                  <AlertCircle className="h-3 w-3" />
                  {urgentCount} con retraso
                </span>
              )}
            </div>

            <h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">
              Panel de Cocina
            </h2>

            <div className="flex items-center gap-2.5 mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 flex-wrap">
              <span className="font-medium">{kitchenOrders.length} pedidos en flujo</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" aria-hidden="true" />
              <span className="inline-flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                {refreshing ? 'Actualizando...' : `Actualización en ${secondsToRefresh}s`}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-zinc-400 font-mono">
                🕐 {new Date(nowTick).toLocaleTimeString('es-PE')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-300'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700'
              }`}
              title={soundEnabled ? 'Desactivar sonido' : 'Activar sonido'}
            >
              {soundEnabled ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-mono font-bold tracking-wider text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 disabled:opacity-60 transition-all cursor-pointer"
            >
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refrescar
            </button>
          </div>
        </div>

        {/* Resumen por estado — clic para filtrar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-5">
          {KITCHEN_DISPLAY_ORDER.map(status => {
            const config = STATUS_CONFIG[status];
            const count = counts[status] || 0;
            const Icon = config.icon;
            const isActive = filterStatus === status;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus((s) => (s === status ? 'all' : status))}
                className={`group text-center p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isActive ? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 scale-[1.03]' : 'hover:-translate-y-0.5 hover:shadow-md'
                }`}
                style={{
                  backgroundColor: config.bg + '90',
                  borderColor: isActive ? config.color : config.border,
                }}
                title={`Filtrar por ${config.label}`}
                aria-pressed={isActive}
              >
                <Icon className="h-3.5 w-3.5 mx-auto mb-1 group-hover:scale-110 transition-transform" style={{ color: config.color }} />
                <span className="block text-lg font-bold leading-none tabular-nums" style={{ color: config.color }}>{count}</span>
                <span className="block text-[7px] font-mono uppercase tracking-wider mt-1" style={{ color: config.textColor }}>{config.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Filtros por estado */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold font-mono transition-all border cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
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
                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
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
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: config?.bg }}>
                    {config && <config.icon className="h-4 w-4" style={{ color: config?.color }} />}
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: config?.color }}>
                    {config?.label} ({ordersInStatus.length})
                  </span>
                </div>
                <div className="space-y-3">
                  {ordersInStatus.map(order => (
                    <AnimatePresence key={order.id}>
                      <KitchenCard
                        order={order}
                        onUpdateStatus={handleUpdateStatus}
                        isNew={isOrderNew(order.id)}
                      />
                    </AnimatePresence>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Stats Bar ─── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 text-[10px] font-mono text-zinc-400 flex items-center justify-between flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
          {new Date(nowTick).toLocaleTimeString('es-PE')} · en vivo
        </span>
        <span className="text-zinc-500">⏱️ Tiempos desde que entró al estado actual</span>
        <span className="text-orange-500 font-semibold">
          {Object.values(counts).reduce((a, b) => a + b, 0)} pedidos activos
        </span>
      </div>
    </div>
  );
}
