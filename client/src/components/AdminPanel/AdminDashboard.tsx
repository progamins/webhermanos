import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, Clock, Cake, Plus, Activity, UserCircle } from 'lucide-react';
import { dbService } from '../../dbService';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { Order, Product } from '../../types';
import { getMonthlyOrderData } from './helpers';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';

interface AdminDashboardProps {
  orders: Order[];
  products: Product[];
  onNavigate: (tab: string) => void;
}

interface ActivityLogEntry {
  id: string;
  action: string;
  details: string;
  role: string;
  timestamp: string;
}

const roleConfig: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-brand-500/20 text-brand-600' },
  analyst: { label: 'Analista', color: 'bg-blue-500/20 text-blue-600' },
  stock_manager: { label: 'Gestor', color: 'bg-emerald-500/20 text-emerald-600' },
};

export default function AdminDashboard({ orders, products, onNavigate }: AdminDashboardProps) {
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadLogs = async () => {
      try {
        const res = await dbService.getActivityLogs();
        if (mounted && res.success && res.logs) {
          setActivityLogs(res.logs.slice(0, 10));
        }
      } catch {}
      if (mounted) setLogsLoading(false);
    };
    loadLogs();
    return () => { mounted = false; };
  }, []);

  const totalOrders = orders.length;
  const acceptedOrders = orders.filter(o => o.status === 'Entregado');
  const totalSales = acceptedOrders.reduce((acc, o) => acc + o.totalPrice, 0);
  const pendingOrdersCount = orders.filter(o => o.status === 'Pendiente').length;
  const inPrepOrdersCount = orders.filter(o => o.status === 'Preparando').length;

  const cakeCountMap: Record<string, number> = {};
  orders.forEach(o => {
    if (o.status !== 'Cancelado') {
      cakeCountMap[o.productName] = (cakeCountMap[o.productName] || 0) + 1;
    }
  });
  const sortedCakes = Object.entries(cakeCountMap).sort((a, b) => b[1] - a[1]);

  const statsCards = [
    {
      label: 'Ventas',
      value: `S/. ${totalSales}`,
      sub: `${acceptedOrders.length} ${acceptedOrders.length === 1 ? 'pedido entregado' : 'pedidos entregados'}`,
      icon: DollarSign,
      color: 'emerald',
    },
    {
      label: 'Pedidos',
      value: totalOrders.toString(),
      sub: 'Registrados en la plataforma',
      icon: ShoppingBag,
      color: 'brand',
    },
    {
      label: 'Pendientes',
      value: pendingOrdersCount.toString(),
      sub: 'Requieren coordinar',
      icon: Clock,
      color: 'amber',
    },
    {
      label: 'En Horno',
      value: inPrepOrdersCount.toString(),
      sub: 'En el horno de Carol',
      icon: Cake,
      color: 'blue',
    },
  ] as const;

  const colorMap = {
    emerald: { bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', sub: 'text-emerald-500' },
    brand: { bg: 'bg-brand-500/10 text-brand-500 border-brand-500/20', sub: 'text-zinc-500 dark:text-zinc-400' },
    amber: { bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20', sub: 'text-amber-500' },
    blue: { bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20', sub: 'text-blue-500' },
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="dashboard-stats-grid">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          const colors = colorMap[stat.color];
          return (
            <Card key={stat.label} variant="liquid" padding="md" className="transition-all duration-300 hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-semibold text-zinc-400 dark:text-zinc-400 block uppercase">{stat.label}</span>
                  <span className="text-2xl font-serif font-bold mt-1 block" style={{ color: 'var(--theme-text)' }}>{stat.value}</span>
                  <span className={`text-[10px] font-medium flex items-center mt-1 ${colors.sub}`}>
                    <TrendingUp className="h-3 w-3 mr-1" aria-hidden="true" />{stat.sub}
                  </span>
                </div>
                <div className={`p-4 rounded-2xl border ${colors.bg}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card variant="liquid" padding="md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h3 className="text-lg font-serif font-bold flex items-center gap-2" style={{ color: 'var(--theme-text)' }}>
              <TrendingUp className="h-5 w-5 text-brand-500" aria-hidden="true" />
              Crecimiento de Ventas
            </h3>
            <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>Volumen mensual y facturación estimada (S/.)</p>
          </div>
          <div className="flex items-center space-x-4 text-[10px] font-mono font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5" style={{ color: 'var(--theme-text-secondary)' }}>
              <span className="w-2.5 h-2.5 bg-brand-500 rounded-full inline-block" aria-hidden="true" />
              Pedidos Recibidos
            </span>
            <span className="flex items-center gap-1.5" style={{ color: 'var(--theme-text-secondary)' }}>
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block" aria-hidden="true" />
              Ventas Entregadas (S/.)
            </span>
          </div>
        </div>
        <div className="h-64 w-full" style={{ minHeight: '260px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={getMonthlyOrderData(orders)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef728e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef728e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800/40" />
              <XAxis dataKey="month" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} dy={10} fontFamily="JetBrains Mono, ui-monospace, monospace" />
              <YAxis yAxisId="left" stroke="#ef728e" fontSize={9} tickLine={false} axisLine={false} dx={-5} fontFamily="JetBrains Mono, ui-monospace, monospace" />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={9} tickLine={false} axisLine={false} dx={5} fontFamily="JetBrains Mono, ui-monospace, monospace" tickFormatter={(v) => `S/.${v}`} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e4e4e7', borderRadius: '12px', fontSize: '11px', fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: '#18181b', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
              <Area yAxisId="left" type="monotone" dataKey="Pedidos" stroke="#ef728e" strokeWidth={2} fillOpacity={1} fill="url(#colorOrders)" name="Total Pedidos" />
              <Area yAxisId="right" type="monotone" dataKey="Ventas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" name="Ventas Entregadas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <Card variant="liquid" padding="md">
            <h3 className="text-lg font-serif font-bold mb-6" style={{ color: 'var(--theme-text)' }}>Modelos Más Pedidos</h3>
            {sortedCakes.length === 0 ? (
              <EmptyState
                size="sm"
                title="Aún no hay datos suficientes"
                description="Espera a recibir más pedidos para ver estadísticas."
              />
            ) : (
              <div className="space-y-4">
                {sortedCakes.map(([cakeName, count]) => {
                  const maxCount = Math.max(...sortedCakes.map(c => c[1]));
                  const percentage = (count / maxCount) * 100;
                  return (
                    <div key={cakeName} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-sans font-semibold" style={{ color: 'var(--theme-text)' }}>{cakeName}</span>
                        <span className="font-mono" style={{ color: 'var(--theme-text-muted)' }}>{count} pedidos</span>
                      </div>
                      <div className="w-full h-3 rounded-full overflow-hidden border" style={{ backgroundColor: 'var(--theme-bg-alt)', borderColor: 'var(--theme-border)' }}>
                        <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card variant="liquid" padding="md" className="flex flex-col justify-between h-full">
            <div>
              <h3 className="text-lg font-serif font-bold mb-2" style={{ color: 'var(--theme-text)' }}>Accesos Directos</h3>
              <p className="text-xs leading-relaxed mb-6" style={{ color: 'var(--theme-text-secondary)' }}>
                Utiliza estos accesos para gestionar tu negocio rápidamente.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => onNavigate('products')}
                className="p-4 rounded-2xl border text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 hover:border-brand-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                style={{ borderColor: 'var(--theme-border)' }}
              >
                <Plus className="h-5 w-5 text-brand-500 mb-2" aria-hidden="true" />
                <span className="text-xs font-mono font-bold uppercase block" style={{ color: 'var(--theme-text)' }}>Nuevo Pastel</span>
                <span className="text-[10px] mt-1 block" style={{ color: 'var(--theme-text-muted)' }}>Agregar al catálogo</span>
              </button>
              <button
                onClick={() => onNavigate('orders')}
                className="p-4 rounded-2xl border text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 hover:border-brand-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                style={{ borderColor: 'var(--theme-border)' }}
              >
                <ShoppingBag className="h-5 w-5 text-brand-500 mb-2" aria-hidden="true" />
                <span className="text-xs font-mono font-bold uppercase block" style={{ color: 'var(--theme-text)' }}>Pedidos ({pendingOrdersCount})</span>
                <span className="text-[10px] mt-1 block" style={{ color: 'var(--theme-text-muted)' }}>Pendientes de charla</span>
              </button>
            </div>
          </Card>
        </div>
      </div>

      <Card variant="liquid" padding="md">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-brand-500" aria-hidden="true" />
          <h3 className="text-lg font-serif font-bold" style={{ color: 'var(--theme-text)' }}>Registro de Actividades</h3>
          <span className="text-[9px] font-mono ml-auto" style={{ color: 'var(--theme-text-muted)' }}>Últimas 10 acciones</span>
        </div>

        {logsLoading ? (
          <Spinner size="md" label="Cargando registro..." />
        ) : activityLogs.length === 0 ? (
          <EmptyState size="sm" title="Aún no hay actividad registrada." />
        ) : (
          <div className="space-y-1.5">
            {activityLogs.map((log, idx) => {
              const role = roleConfig[log.role] || { label: log.role, color: 'bg-zinc-500/20 text-zinc-600' };
              return (
                <div
                  key={log.id || idx}
                  className="flex items-start gap-3 p-3 rounded-xl transition-colors"
                  style={{ backgroundColor: 'var(--theme-bg-alt)' }}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${role.color}`}>
                    <UserCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold" style={{ color: 'var(--theme-text)' }}>{log.action}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${role.color}`}>
                        {role.label}
                      </span>
                    </div>
                    <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: 'var(--theme-text-secondary)' }}>{log.details}</p>
                    <p className="text-[9px] font-mono mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                      {new Date(log.timestamp).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
