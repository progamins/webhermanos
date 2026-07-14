import { TrendingUp, DollarSign, ShoppingBag, Clock, Cake, Plus } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Order, Product } from '../../types';
import { getMonthlyOrderData } from './helpers';

interface AdminDashboardProps {
  orders: Order[];
  products: Product[];
  onNavigate: (tab: string) => void;
}

export default function AdminDashboard({ orders, products, onNavigate }: AdminDashboardProps) {
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

  return (
    <div className="space-y-8">
      {/* Stats bento boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="dashboard-stats-grid">
        <div className="liquid-glass liquid-glass-sheen p-6 rounded-3xl border border-white/30 dark:border-zinc-800/40 shadow-md flex items-center justify-between transition-all duration-300 hover:scale-[1.01]">
          <div>
            <span className="text-xs font-mono font-semibold text-zinc-400 dark:text-zinc-400 block uppercase">Ventas de Pedidos</span>
            <span className="text-2xl font-serif font-bold text-zinc-900 dark:text-white mt-1 block">S/. {totalSales}</span>
            <span className="text-[10px] text-emerald-500 font-medium flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" /> {acceptedOrders.length} {acceptedOrders.length === 1 ? 'pedido entregado' : 'pedidos entregados'}
            </span>
          </div>
          <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="liquid-glass liquid-glass-sheen p-6 rounded-3xl border border-white/30 dark:border-zinc-800/40 shadow-md flex items-center justify-between transition-all duration-300 hover:scale-[1.01]">
          <div>
            <span className="text-xs font-mono font-semibold text-zinc-400 dark:text-zinc-400 block uppercase">Total Pedidos</span>
            <span className="text-2xl font-serif font-bold text-zinc-900 dark:text-white mt-1 block">{totalOrders}</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-1">Registrados en la plataforma</span>
          </div>
          <div className="p-4 bg-brand-500/10 text-brand-500 rounded-2xl border border-brand-500/20">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>

        <div className="liquid-glass liquid-glass-sheen p-6 rounded-3xl border border-white/30 dark:border-zinc-800/40 shadow-md flex items-center justify-between transition-all duration-300 hover:scale-[1.01]">
          <div>
            <span className="text-xs font-mono font-semibold text-zinc-400 dark:text-zinc-400 block uppercase">Pendientes de Charla</span>
            <span className="text-2xl font-serif font-bold text-zinc-900 dark:text-white mt-1 block">{pendingOrdersCount}</span>
            <span className="text-[10px] text-amber-500 block mt-1">Requieren coordinar</span>
          </div>
          <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="liquid-glass liquid-glass-sheen p-6 rounded-3xl border border-white/30 dark:border-zinc-800/40 shadow-md flex items-center justify-between transition-all duration-300 hover:scale-[1.01]">
          <div>
            <span className="text-xs font-mono font-semibold text-zinc-400 dark:text-zinc-400 block uppercase">En Preparación</span>
            <span className="text-2xl font-serif font-bold text-zinc-900 dark:text-white mt-1 block">{inPrepOrdersCount}</span>
            <span className="text-[10px] text-blue-500 block mt-1">En el horno de Carol</span>
          </div>
          <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/20">
            <Cake className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Monthly Orders Volume & Sales Chart */}
      <div className="liquid-glass liquid-glass-sheen p-6 rounded-3xl border border-white/30 dark:border-zinc-800/40 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-500 animate-pulse" />
              Crecimiento de Ventas & Volumen de Pedidos
            </h3>
            <p className="text-xs text-zinc-400">Volumen mensual total recibido y facturación estimada (S/.) para Maison Rosas</p>
          </div>
          <div className="flex items-center space-x-4 text-[10px] font-mono font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span className="w-2.5 h-2.5 bg-brand-500 rounded-full inline-block"></span>
              Pedidos Recibidos
            </span>
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
              Ventas Entregadas (S/.)
            </span>
          </div>
        </div>

        <div className="h-64 w-full" style={{ minHeight: '260px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={getMonthlyOrderData(orders)}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef728e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef728e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
      </div>

      {/* Popular cakes & Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 liquid-glass liquid-glass-sheen p-6 border border-white/30 dark:border-zinc-800/40 shadow-md">
          <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-white mb-6">
            Rendimiento de Modelos Más Pedidos
          </h3>

          {sortedCakes.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs font-mono">
              Aún no hay pedidos suficientes para calcular estadísticas.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedCakes.map(([cakeName, count]) => {
                const maxCount = Math.max(...sortedCakes.map(c => c[1]));
                const percentage = (count / maxCount) * 100;
                return (
                  <div key={cakeName} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-sans font-semibold text-zinc-800 dark:text-zinc-200">{cakeName}</span>
                      <span className="font-mono text-zinc-400">{count} pedidos</span>
                    </div>
                    <div className="w-full h-3 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-full overflow-hidden border border-white/10">
                      <div className="h-full bg-brand-500 rounded-full shadow-[0_0_8px_rgba(239,114,142,0.4)]" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions panel */}
        <div className="lg:col-span-5 liquid-glass liquid-glass-sheen p-6 border border-white/30 dark:border-zinc-800/40 shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-white mb-2">
              Accesos Rápidos
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-400 leading-relaxed font-sans mb-6">
              Maison Rosas funciona con sincronización en tiempo real. Utiliza estos accesos para gestionar los estados comerciales.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onNavigate('products')}
              className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-brand-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left transition-all cursor-pointer"
            >
              <Plus className="h-5 w-5 text-brand-500 mb-2" />
              <span className="text-xs font-mono font-bold uppercase block text-zinc-800 dark:text-zinc-200">Nuevo Pastel</span>
              <span className="text-[10px] text-zinc-400 mt-1 block">Agregar al catálogo</span>
            </button>

            <button
              onClick={() => onNavigate('orders')}
              className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-brand-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left transition-all cursor-pointer"
            >
              <ShoppingBag className="h-5 w-5 text-brand-500 mb-2" />
              <span className="text-xs font-mono font-bold uppercase block text-zinc-800 dark:text-zinc-200">Pedidos ({pendingOrdersCount})</span>
              <span className="text-[10px] text-zinc-400 mt-1 block">Pendientes de charla</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
