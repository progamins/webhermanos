import React, { useState, useEffect } from 'react';
import { X, Plus, Search, Check, Trash2, Pencil, ChevronUp, ChevronDown, ChevronsUpDown, Eye, Download, FilterX, Ban, Save, Camera, Loader2, Upload } from 'lucide-react';
import { Order } from '../../types';
import { dbService } from '../../dbService';
import { exportOrdersToExcel } from './helpers';
import Barcode from '../Barcode';

interface AdminOrdersProps {
  orders: Order[];
  setOrders?: React.Dispatch<React.SetStateAction<Order[]>>;
  onRefreshData: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
  onOpenPaymentModal?: (order: Order) => void;
}

type OrderStatus = Order['status'];

const STATUS_STYLES: Record<string, { label: string; bg: string; dot: string }> = {
  Pendiente: { label: 'Pendiente', bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-400' },
  Confirmado: { label: 'Confirmado', bg: 'bg-sky-50 text-sky-800 border-sky-200', dot: 'bg-sky-500' },
  Preparando: { label: 'Preparando', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200', dot: 'bg-indigo-500' },
  'Decoración': { label: 'Decoración', bg: 'bg-pink-50 text-pink-800 border-pink-200', dot: 'bg-pink-500' },
  Listo: { label: 'Listo', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  'En camino': { label: 'En Camino', bg: 'bg-purple-50 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
  Entregado: { label: 'Entregado', bg: 'bg-green-50 text-green-800 border-green-200', dot: 'bg-green-500' },
  Cancelado: { label: 'Cancelado', bg: 'bg-red-50 text-red-800 border-red-200', dot: 'bg-red-500' },
};

const ALL_STATUSES = ['Pendiente', 'Confirmado', 'Preparando', 'Decoración', 'Listo', 'En camino', 'Entregado', 'Cancelado'];

export default function AdminOrders({ orders, setOrders, onRefreshData, showToast, onOpenPaymentModal }: AdminOrdersProps) {
  const [sortField, setSortField] = useState<keyof Order | ''>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Order>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    customerName: '', productName: '', size: 'Estándar (20-25 Porciones)', flavor: 'Vainilla Francesa',
    customColor: '', selectedDecoration: 'Ninguna', totalPrice: 150, status: 'Pendiente', message: ''
  });
  // Filter
  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      o.id.toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.productName || '').toLowerCase().includes(q) ||
      (o.flavor || '').toLowerCase().includes(q) ||
      (o.customColor || '').toLowerCase().includes(q) ||
      (o.selectedDecoration || '').toLowerCase().includes(q) ||
      (o.message || '').toLowerCase().includes(q) ||
      (o.trackingCode || '').toLowerCase().includes(q);

    const matchStatus = statusFilter === 'Todos' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (!sortField) return 0;
    let aVal = a[sortField] ?? '';
    let bVal = b[sortField] ?? '';
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalSales = filtered.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const pendingCount = filtered.filter(o => o.status === 'Pendiente').length;

  const toggleSort = (field: keyof Order) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };

  const SortIcon = ({ field }: { field: keyof Order }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 inline ml-1 opacity-30" />;
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3 inline ml-1 text-brand-500" />
      : <ChevronDown className="h-3 w-3 inline ml-1 text-brand-500" />;
  };

  const handleUpdateStatus = async (id: string, status: OrderStatus) => {
    const prev = [...orders];
    if (setOrders) setOrders(o => o.map(o => o.id === id ? { ...o, status } : o));
    try {
      await dbService.updateOrderStatus(id, status);
      onRefreshData();
      showToast(`Pedido #${id.slice(0, 8)} → ${status}`, 'success', 'Estado Actualizado');
    } catch {
      if (setOrders) setOrders(prev);
      showToast('Error al actualizar estado', 'error', 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este pedido definitivamente?')) return;
    const prev = [...orders];
    if (setOrders) setOrders(o => o.filter(o => o.id !== id));
    try {
      await dbService.deleteOrder(id);
      showToast(`Pedido #${id.slice(0, 8)} eliminado`, 'info', 'Eliminado');
    } catch {
      if (setOrders) setOrders(prev);
      showToast('Error al eliminar', 'error', 'Error');
    }
  };

  // ── Progress Photos State ──
  const [photoUploadingId, setPhotoUploadingId] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoStage, setPhotoStage] = useState<'bizcocho' | 'decoracion' | 'final'>('bizcocho');

  // Reset photo form when editing a different order
  useEffect(() => {
    setPhotoCaption('');
    setPhotoStage('bizcocho');
  }, [editingId]);

  const handleUploadProgressPhoto = async (orderId: string) => {
    const input = document.getElementById(`photo-input-${orderId}`) as HTMLInputElement;
    if (!input || !input.files || !input.files[0]) {
      showToast('Selecciona una foto primero.', 'warning', 'Foto requerida');
      return;
    }
    if (!photoCaption) {
      showToast('Agrega un pie de foto descriptivo.', 'warning', 'Caption requerido');
      return;
    }
    const file = input.files[0];
    setPhotoUploadingId(orderId);
    try {
      const imageUrl = await dbService.uploadImageToStorage(file);
      await dbService.addProgressPhoto(orderId, imageUrl, photoCaption, photoStage);
      showToast('Foto de progreso agregada al pedido.', 'success', '📸 Progreso');
      onRefreshData();
      setPhotoCaption('');
      const input = document.getElementById(`photo-input-${orderId}`) as HTMLInputElement;
      if (input) input.value = '';
    } catch {
      showToast('Error al subir la foto.', 'error', 'Error');
    } finally {
      setPhotoUploadingId(null);
    }
  };

  const handleDeleteProgressPhoto = async (orderId: string, photoId: string) => {
    try {
      await dbService.deleteProgressPhoto(orderId, photoId);
      showToast('Foto de progreso eliminada.', 'info', 'Eliminada');
      onRefreshData();
    } catch {
      showToast('Error al eliminar la foto.', 'error', 'Error');
    }
  };

  const handleSaveInline = async (id: string) => {
    const original = orders.find(o => o.id === id);
    if (!original) return;
    const updated: Order = { ...original, ...editData, id };
    const prev = [...orders];
    if (setOrders) setOrders(o => o.map(o => o.id === id ? updated : o));
    try {
      await dbService.updateOrder(updated);
      setEditingId(null);
      setEditData({});
      showToast(`Pedido #${id.slice(0, 8)} actualizado`, 'success', 'Guardado');
    } catch {
      if (setOrders) setOrders(prev);
      showToast('Error al guardar cambios', 'error', 'Error');
    }
  };

  const handleInsertOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.customerName || !newOrder.productName) {
      showToast('Cliente y Pastel son obligatorios', 'warning', 'Campos requeridos');
      return;
    }
    const id = 'ord-' + Date.now();
    const order: Order = {
      id, productName: newOrder.productName || '', productId: 'manual',
      size: newOrder.size || 'Estándar', flavor: newOrder.flavor || 'Vainilla',
      customerName: newOrder.customerName || '', customerEmail: newOrder.customerEmail || 'manual@pedido.com',
      customerPhone: newOrder.customerPhone || '999999999',
      deliveryDate: newOrder.deliveryDate || new Date().toISOString().split('T')[0],
      deliveryTime: newOrder.deliveryTime || '12:00',
      deliveryType: (newOrder.deliveryType as any) || 'recojo',
      deliveryAddress: newOrder.deliveryAddress || undefined,
      trackingCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      customerAge: newOrder.customerAge || '', message: newOrder.message || '',
      selectedDecoration: newOrder.selectedDecoration || 'Ninguna',
      customColor: newOrder.customColor || 'Estándar',
      totalPrice: Number(newOrder.totalPrice) || 150,
      status: (newOrder.status as any) || 'Pendiente',
      date: new Date().toISOString().split('T')[0],
    };
    if (setOrders) setOrders(p => [order, ...p]);
    try {
      await dbService.addOrder(order);
      setShowAddForm(false);
      setNewOrder({ customerName: '', productName: '', size: 'Estándar (20-25 Porciones)', flavor: 'Vainilla Francesa', customColor: '', selectedDecoration: 'Ninguna', totalPrice: 150, status: 'Pendiente', message: '' });
      showToast('Pedido insertado correctamente', 'success', 'Nuevo Pedido');
    } catch {
      showToast('Error al insertar pedido', 'error', 'Error');
    }
  };

  const clearFilters = () => { setSearch(''); setStatusFilter('Todos'); };

  const hasActiveFilters = search || statusFilter !== 'Todos';

  return (
    <div className="space-y-6">
      {/* ── TOP BAR ── */}
      <div className="bg-white dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold tracking-[0.15em] uppercase shadow-sm">Excel Pro</span>
              <h4 className="text-base font-serif font-bold text-zinc-900 dark:text-white">
                Planilla de Pedidos
              </h4>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                {orders.length} registros
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1.5 font-sans">
              Ordena, filtra, edita y exporta a Excel
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={() => exportOrdersToExcel(filtered)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all duration-200 active:scale-[0.97] cursor-pointer">
              <Download className="h-3.5 w-3.5" />
              <span>Exportar Excel</span>
            </button>
            <button onClick={() => setShowAddForm(p => !p)}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all duration-200 active:scale-[0.97] cursor-pointer ${
                showAddForm ? 'bg-zinc-500 hover:bg-zinc-600 text-white' : 'bg-brand-500 hover:bg-brand-600 text-white'
              }`}>
              {showAddForm ? <Ban className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{showAddForm ? 'Cancelar' : 'Nuevo Pedido'}</span>
            </button>
          </div>
        </div>

        {/* ── FILTERS + STATS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-[9px] font-mono font-bold uppercase text-zinc-400 mb-1.5 tracking-wider">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ID, cliente, pastel, sabor, código..."
                className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-zinc-800 dark:text-white transition-all" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-mono font-bold uppercase text-zinc-400 mb-1.5 tracking-wider">Estado</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer">
              <option value="Todos">Todos los estados</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-mono font-bold uppercase text-zinc-400 mb-1.5 tracking-wider">Acción</label>
            {hasActiveFilters ? (
              <button onClick={clearFilters}
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                <FilterX className="h-3 w-3" />
                <span>Limpiar filtros</span>
              </button>
            ) : (
              <div className="w-full py-2.5 bg-zinc-50/50 dark:bg-zinc-950/50 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center gap-4 text-[10px] font-mono text-zinc-400">
                <span>{filtered.length} pedidos</span>
                <span className="w-px h-3 bg-zinc-200 dark:bg-zinc-800" />
                <span className="text-emerald-600 font-bold">S/. {totalSales}</span>
              </div>
            )}
          </div>
          <div className="hidden lg:flex items-center gap-3 bg-gradient-to-br from-amber-50 to-amber-50/50 dark:from-zinc-800 dark:to-zinc-900 border border-amber-100 dark:border-zinc-700 rounded-xl px-4 py-2.5">
            <div className="text-center flex-1">
              <span className="block text-[8px] font-mono uppercase tracking-wider text-zinc-400">Pendientes</span>
              <span className="text-lg font-bold text-amber-600">{pendingCount}</span>
            </div>
            <div className="w-px h-8 bg-amber-200 dark:bg-zinc-700" />
            <div className="text-center flex-1">
              <span className="block text-[8px] font-mono uppercase tracking-wider text-zinc-400">Total S/.</span>
              <span className="text-lg font-bold text-brand-500">S/.{totalSales}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ADD FORM ── */}
      {showAddForm && (
        <form onSubmit={handleInsertOrder} className="bg-white dark:bg-zinc-900/80 border border-dashed border-brand-300 dark:border-brand-700 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center gap-2 text-brand-600">
            <Plus className="h-4 w-4" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">Insertar Pedido Manual</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input type="text" placeholder="Cliente *" value={newOrder.customerName} onChange={e => setNewOrder(p => ({ ...p, customerName: e.target.value }))}
              className="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-zinc-800 dark:text-white" />
            <input type="text" placeholder="Pastel *" value={newOrder.productName} onChange={e => setNewOrder(p => ({ ...p, productName: e.target.value }))}
              className="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-zinc-800 dark:text-white" />
            <input type="text" placeholder="Sabor" value={newOrder.flavor} onChange={e => setNewOrder(p => ({ ...p, flavor: e.target.value }))}
              className="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-zinc-800 dark:text-white" />
            <div className="flex gap-2">
              <input type="number" placeholder="S/. Precio" value={newOrder.totalPrice} onChange={e => setNewOrder(p => ({ ...p, totalPrice: Number(e.target.value) }))}
                className="flex-1 px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-zinc-800 dark:text-white" />
              <button type="submit"
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] shadow-sm cursor-pointer">
                <Save className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── TABLE ── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs min-w-[1100px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 z-10">
                <th className="w-10 px-3 py-3 text-center text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50 dark:bg-zinc-950 sticky left-0 z-20 border-r border-zinc-100 dark:border-zinc-800">#</th>
                <th className="px-3 py-3 text-left text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 select-none border-r border-zinc-100 dark:border-zinc-800"
                  onClick={() => toggleSort('customerName')}>
                  Cliente <SortIcon field="customerName" />
                </th>
                <th className="px-3 py-3 text-left text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 select-none border-r border-zinc-100 dark:border-zinc-800"
                  onClick={() => toggleSort('productName')}>
                  Pastel <SortIcon field="productName" />
                </th>
                <th className="px-3 py-3 text-center text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider border-r border-zinc-100 dark:border-zinc-800 w-24">
                  Código
                </th>
                <th className="px-3 py-3 text-left text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider border-r border-zinc-100 dark:border-zinc-800">
                  Sabor / Detalles
                </th>
                <th className="px-3 py-3 text-left text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 select-none border-r border-zinc-100 dark:border-zinc-800 w-20"
                  onClick={() => toggleSort('totalPrice')}>
                  Total <SortIcon field="totalPrice" />
                </th>
                <th className="px-3 py-3 text-left text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider border-r border-zinc-100 dark:border-zinc-800 w-28">
                  Estado
                </th>
                <th className="px-3 py-3 text-left text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider border-r border-zinc-100 dark:border-zinc-800 w-20">
                  Pago
                </th>
                <th className="px-3 py-3 text-center text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider w-36">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((ord, idx) => {
                const isEditing = editingId === ord.id;
                const statusStyle = STATUS_STYLES[ord.status] || STATUS_STYLES['Pendiente'];

                return (
                  <tr key={ord.id}
                    className={`group transition-all duration-150 border-b border-zinc-50 dark:border-zinc-800/30 ${
                      idx % 2 === 0 ? 'bg-white dark:bg-zinc-950/40' : 'bg-zinc-50/30 dark:bg-zinc-900/20'
                    } hover:bg-brand-50/40 dark:hover:bg-brand-950/10`}>
                    
                    {/* Row number - sticky */}
                    <td className="px-3 py-3 text-center text-[10px] font-mono text-zinc-400 border-r border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky left-0 z-10 group-hover:bg-brand-50/40 dark:group-hover:bg-brand-950/10 transition-all">
                      {idx + 1}
                    </td>

                    {/* Cliente */}
                    <td className="px-3 py-3 border-r border-zinc-100 dark:border-zinc-800/50">
                      {isEditing ? (
                        <input value={editData.customerName ?? ord.customerName} onChange={e => setEditData(p => ({ ...p, customerName: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-white border-2 border-brand-400 rounded-lg text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30 shadow-sm" autoFocus />
                      ) : (
                        <div>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">{ord.customerName}</span>
                          <span className="block text-[9px] font-mono text-zinc-400 mt-0.5">{ord.customerPhone || ''}</span>
                        </div>
                      )}
                    </td>

                    {/* Pastel */}
                    <td className="px-3 py-3 border-r border-zinc-100 dark:border-zinc-800/50">
                      {isEditing ? (
                        <input value={editData.productName ?? ord.productName} onChange={e => setEditData(p => ({ ...p, productName: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-white border-2 border-brand-400 rounded-lg text-xs text-zinc-800 focus:outline-none" />
                      ) : (
                        <div>
                          <span className="text-brand-700 dark:text-brand-300 font-medium text-xs">{ord.productName}</span>
                          <span className="block text-[9px] font-mono text-zinc-400 mt-0.5">#{ord.trackingCode || ord.id.slice(0, 8)}</span>
                        </div>
                      )}
                    </td>

                    {/* Código de Barras */}
                    <td className="px-3 py-3 border-r border-zinc-100 dark:border-zinc-800/50 text-center align-middle">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Barcode
                          value={`MR-${ord.trackingCode || ord.id.slice(-6)}`}
                          width={1.5}
                          height={28}
                          fontSize={8}
                          lineColor="#52525b"
                          margin={0}
                        />
                        <span className="text-[7px] font-mono text-zinc-400 tracking-wider">{ord.trackingCode || ord.id.slice(-6)}</span>
                      </div>
                    </td>

                    {/* Sabor / Detalles */}
                    <td className="px-3 py-3 border-r border-zinc-100 dark:border-zinc-800/50">
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <input value={editData.flavor ?? ord.flavor} onChange={e => setEditData(p => ({ ...p, flavor: e.target.value }))}
                            placeholder="Sabor" className="w-full px-2 py-1 bg-white border border-zinc-300 rounded text-[10px] focus:outline-none focus:border-brand-400" />
                          <input value={editData.size ?? ord.size} onChange={e => setEditData(p => ({ ...p, size: e.target.value }))}
                            placeholder="Tamaño" className="w-full px-2 py-1 bg-white border border-zinc-300 rounded text-[10px] focus:outline-none focus:border-brand-400" />
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">{ord.flavor || '—'}</span>
                          {ord.size && <span className="block text-zinc-400">{ord.size}</span>}
                          {(ord.customColor || ord.selectedDecoration) && (
                            <span className="block text-zinc-400 truncate max-w-[160px]" title={`${ord.customColor || ''} · ${ord.selectedDecoration || ''}`}>
                              🎨 {ord.customColor || ''}{ord.customColor && ord.selectedDecoration ? ' · ' : ''}{ord.selectedDecoration || ''}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Total */}
                    <td className="px-3 py-3 border-r border-zinc-100 dark:border-zinc-800/50 text-right">
                      {isEditing ? (
                        <input type="number" value={editData.totalPrice ?? ord.totalPrice} onChange={e => setEditData(p => ({ ...p, totalPrice: Number(e.target.value) }))}
                          className="w-full px-2 py-1.5 bg-white border-2 border-brand-400 rounded-lg text-xs font-mono text-right focus:outline-none" />
                      ) : (
                        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs">S/.{ord.totalPrice}</span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-3 py-3 border-r border-zinc-100 dark:border-zinc-800/50">
                      {isEditing ? (
                        <select value={(editData.status as string) || ord.status} onChange={e => setEditData(p => ({ ...p, status: e.target.value as any }))}
                          className="w-full px-2 py-1.5 bg-white border-2 border-brand-400 rounded-lg text-[10px] focus:outline-none cursor-pointer">
                          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border ${statusStyle.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                            {statusStyle.label}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Pago */}
                    <td className="px-3 py-3 border-r border-zinc-100 dark:border-zinc-800/50">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border ${
                        ord.paymentStatus === 'confirmado'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : ord.paymentStatus === 'rechazado'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          ord.paymentStatus === 'confirmado' ? 'bg-emerald-500' :
                          ord.paymentStatus === 'rechazado' ? 'bg-red-500' : 'bg-amber-400'
                        }`} />
                        {ord.paymentStatus === 'confirmado' ? 'Pagado' : ord.paymentStatus === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSaveInline(ord.id)}
                              className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all shadow-sm active:scale-90 cursor-pointer" title="Guardar cambios">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => { setEditingId(null); setEditData({}); }}
                              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 rounded-lg transition-all active:scale-90 cursor-pointer" title="Cancelar edición">
                              <X className="h-3.5 w-3.5" />
                            </button>
                            {/* Progress Photos Button */}
                            <button
                              onClick={() => {
                                setEditingId(ord.id);
                                const input = document.getElementById(`photo-input-${ord.id}`) as HTMLInputElement;
                                if (input) input.click();
                              }}
                              className={`p-1.5 rounded-lg transition-all active:scale-90 cursor-pointer ${photoUploadingId === ord.id ? 'bg-brand-100 text-brand-500' : 'bg-purple-50 hover:bg-purple-100 text-purple-600'}`}
                              title="Subir foto del progreso">
                              {photoUploadingId === ord.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                            </button>
                          </>
                        ) : (
                          <button onClick={() => { setEditingId(ord.id); setEditData({}); }}
                            className="p-1.5 bg-zinc-100 hover:bg-brand-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 hover:text-brand-600 rounded-lg transition-all active:scale-90 opacity-0 group-hover:opacity-100 cursor-pointer" title="Editar inline">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <select value={ord.status} onChange={e => handleUpdateStatus(ord.id, e.target.value as OrderStatus)}
                          className="px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[9px] font-mono cursor-pointer hover:border-brand-300 transition-colors focus:outline-none focus:ring-1 focus:ring-brand-500"
                          title="Cambiar estado">
                          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        {onOpenPaymentModal && (
                          <button onClick={() => onOpenPaymentModal(ord)}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 text-amber-600 rounded-lg transition-all active:scale-90 cursor-pointer" title="Gestionar pago">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button onClick={() => handleDelete(ord.id)}
                          className="p-1.5 bg-zinc-100 hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-950/30 text-zinc-400 hover:text-red-500 rounded-lg transition-all active:scale-90 opacity-0 group-hover:opacity-100 cursor-pointer" title="Eliminar pedido">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Progress Photos Section (visible when editing) */}
                      {isEditing && (
                        <div className="mt-3 pt-3 border-t border-dashed border-purple-200 dark:border-purple-900/30">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Camera className="h-3 w-3 text-purple-500" />
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-purple-600">Fotos del Progreso</span>
                          </div>

                          {/* Existing photos */}
                          {ord.progressPhotos && ord.progressPhotos.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {ord.progressPhotos.map((photo) => (
                                <div key={photo.id} className="relative group/photo">
                                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                    <img src={photo.imageUrl} alt={photo.caption} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover/photo:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleDeleteProgressPhoto(ord.id, photo.id)}
                                      className="p-0.5 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-600 cursor-pointer"
                                      title="Eliminar foto">
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                  <span className="block text-[6px] font-mono text-zinc-400 text-center mt-0.5 truncate max-w-14">{photo.stage}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Upload form */}
                          <div className="flex items-center gap-1.5">
                            <input
                              id={`photo-input-${ord.id}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  setPhotoCaption(`Progreso: ${photoStage}`);
                                  handleUploadProgressPhoto(ord.id);
                                }
                              }}
                            />
                            <input
                              type="text"
                              placeholder="¿Qué se muestra?"
                              value={photoCaption}
                              onChange={(e) => setPhotoCaption(e.target.value)}
                              className="flex-1 px-2 py-1 bg-purple-50/50 border border-purple-200 rounded-md text-[9px] placeholder-zinc-400 focus:outline-none focus:border-purple-400"
                            />
                            <select
                              value={photoStage}
                              onChange={(e) => setPhotoStage(e.target.value as any)}
                              className="px-1.5 py-1 bg-purple-50/50 border border-purple-200 rounded-md text-[8px] font-mono text-zinc-600 focus:outline-none cursor-pointer">
                              <option value="bizcocho">Bizcocho</option>
                              <option value="decoracion">Decoración</option>
                              <option value="final">Final</option>
                            </select>
                            <button
                              onClick={() => {
                                const input = document.getElementById(`photo-input-${ord.id}`) as HTMLInputElement;
                                if (input) input.click();
                              }}
                              disabled={photoUploadingId === ord.id}
                              className="p-1.5 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-md transition-colors cursor-pointer"
                              title="Subir foto">
                              {photoUploadingId === ord.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <span className="text-3xl mb-3">📋</span>
            <p className="text-sm font-medium text-zinc-500">No hay pedidos con estos filtros</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 transition-all cursor-pointer">
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* Bottom bar */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 text-[10px] font-mono text-zinc-400">
            <span>
              Mostrando <strong className="text-zinc-600 dark:text-zinc-300">{filtered.length}</strong> de <strong className="text-zinc-600 dark:text-zinc-300">{orders.length}</strong> pedidos
            </span>
            <span className="text-emerald-600 font-bold">
              Total S/.{totalSales}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
