import React, { useState } from 'react';
import { X, Plus, Layers, Search, Check, Trash2 } from 'lucide-react';
import { Order } from '../../types';
import { dbService } from '../../dbService';
import { exportOrdersToExcel } from './helpers';

interface AdminOrdersProps {
  orders: Order[];
  setOrders?: React.Dispatch<React.SetStateAction<Order[]>>;
  onRefreshData: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
  onOpenPaymentModal?: (order: Order) => void;
}

type OrderStatus = Order['status'];

export default function AdminOrders({ orders, setOrders, onRefreshData, showToast, onOpenPaymentModal }: AdminOrdersProps) {
  const [ordersSortField, setOrdersSortField] = useState<keyof Order | ''>('');
  const [ordersSortDirection, setOrdersSortDirection] = useState<'asc' | 'desc'>('desc');
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('Todos');
  const [ordersSizeFilter, setOrdersSizeFilter] = useState('Todos');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingOrderData, setEditingOrderData] = useState<Partial<Order>>({});
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState<Partial<Order>>({
    customerName: '', productName: '', size: 'Mediano (20 porciones)', flavor: 'Vainilla',
    customColor: '', selectedDecoration: 'Ninguna', totalPrice: 150, status: 'Pendiente', message: ''
  });

  const filteredOrders = orders.filter(ord => {
    const searchLower = ordersSearch.toLowerCase();
    const matchesSearch = !ordersSearch ||
      ord.id.toLowerCase().includes(searchLower) ||
      (ord.customerName || '').toLowerCase().includes(searchLower) ||
      (ord.productName || '').toLowerCase().includes(searchLower) ||
      (ord.flavor || '').toLowerCase().includes(searchLower) ||
      (ord.customColor || '').toLowerCase().includes(searchLower) ||
      (ord.selectedDecoration || '').toLowerCase().includes(searchLower) ||
      (ord.message || '').toLowerCase().includes(searchLower);

    const matchesStatus = ordersStatusFilter === 'Todos' || ord.status === ordersStatusFilter;
    const matchesSize = ordersSizeFilter === 'Todos' || ord.size.includes(ordersSizeFilter);
    return matchesSearch && matchesStatus && matchesSize;
  });

  const sortedAndFilteredOrders = [...filteredOrders].sort((a, b) => {
    if (!ordersSortField) return 0;
    let aVal = a[ordersSortField] ?? '';
    let bVal = b[ordersSortField] ?? '';
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return ordersSortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return ordersSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalFilteredSales = filteredOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  const toggleSort = (field: keyof Order) => {
    if (ordersSortField === field) setOrdersSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setOrdersSortField(field); setOrdersSortDirection('desc'); }
  };

  const handleUpdateOrderStatus = async (id: string, status: OrderStatus) => {
    const previousOrders = [...orders];
    if (setOrders) setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    try {
      await dbService.updateOrderStatus(id, status);
      onRefreshData();
      showToast(`Pedido #${id.substring(0, 8)} actualizado a "${status}".`, 'success', 'Pedido de WhatsApp');
    } catch {
      if (setOrders) setOrders(previousOrders);
      showToast('Error al actualizar el estado de pedido.', 'error', 'Error');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('¿Eliminar el registro de este pedido?')) return;
    const previousOrders = [...orders];
    if (setOrders) setOrders(prev => prev.filter(o => o.id !== id));
    try {
      await dbService.deleteOrder(id);
      showToast(`Pedido #${id.substring(0, 8)} eliminado correctamente.`, 'info', 'Admin');
    } catch {
      if (setOrders) setOrders(previousOrders);
      showToast('Error al eliminar el pedido.', 'error', 'Error');
    }
  };

  const handleSaveInlineEdit = async (id: string) => {
    const originalOrder = orders.find(o => o.id === id);
    if (!originalOrder) return;
    const updatedOrder: Order = { ...originalOrder, ...editingOrderData, id };
    const previousOrders = [...orders];
    if (setOrders) setOrders(prev => prev.map(o => o.id === id ? updatedOrder : o));
    try {
      await dbService.updateOrder(updatedOrder);
      setEditingOrderId(null);
      setEditingOrderData({});
      showToast(`Pedido #${id.substring(0, 8)} actualizado con éxito.`, 'success', 'Planilla Excel');
    } catch {
      if (setOrders) setOrders(previousOrders);
      showToast('Error al actualizar el pedido.', 'error', 'Error Excel');
    }
  };

  const handleInsertManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRowData.customerName || !newRowData.productName) {
      showToast('Por favor, ingresa el nombre de cliente y el pastel elegido.', 'warning', 'Inserción inválida');
      return;
    }
    const manualId = 'ord-' + Date.now();
    const manualOrder: Order = {
      id: manualId, productName: newRowData.productName || '', productId: 'manual-cake',
      size: newRowData.size || 'Mediano (20 porciones)', flavor: newRowData.flavor || 'Vainilla',
      customerName: newRowData.customerName || '', customerEmail: newRowData.customerEmail || 'correo@simulado.com',
      customerPhone: newRowData.customerPhone || '999999999', deliveryDate: newRowData.deliveryDate || new Date().toISOString().split('T')[0],
      deliveryTime: newRowData.deliveryTime || '12:00', deliveryType: (newRowData.deliveryType as any) || 'recojo',
      deliveryAddress: newRowData.deliveryAddress || undefined,
      trackingCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      customerAge: newRowData.customerAge || '', message: newRowData.message || '',
      selectedDecoration: newRowData.selectedDecoration || 'Ninguna', customColor: newRowData.customColor || 'Estándar',
      totalPrice: Number(newRowData.totalPrice) || 150, status: (newRowData.status as any) || 'Pendiente',
      date: new Date().toISOString().split('T')[0],
    };
    if (setOrders) setOrders(prev => [manualOrder, ...prev]);
    try {
      await dbService.addOrder(manualOrder);
      setIsAddingRow(false);
      setNewRowData({ customerName: '', productName: '', size: 'Mediano (20 porciones)', flavor: 'Vainilla', customColor: '', selectedDecoration: 'Ninguna', totalPrice: 150, status: 'Pendiente', message: '' });
      showToast('Fila insertada correctamente en la planilla.', 'success', 'Excel Inserción');
    } catch { showToast('Error al insertar fila en la planilla.', 'error', 'Error'); }
  };

  const statusColors: Record<string, string> = {
    Pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
    Confirmado: 'bg-blue-50 text-blue-700 border-blue-200',
    Preparando: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Decoración': 'bg-pink-50 text-pink-700 border-pink-200',
    Listo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'En camino': 'bg-purple-50 text-purple-700 border-purple-200',
    Entregado: 'bg-green-50 text-green-700 border-green-200',
    Cancelado: 'bg-red-50 text-red-700 border-red-200'
  };

  return (
    <div className="space-y-6">
      {/* Excel Ribbon Control Panel */}
      <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h4 className="text-base font-serif font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <span className="bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase">EXCEL PRO</span>
              Planilla Inteligente de Pedidos (Maison Sheet)
            </h4>
            <p className="text-xs text-zinc-400 mt-1">Soporta ordenamiento, filtros avanzados, inserción rápida, exportación a Excel Profesional con diseño y edición directa inline.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button onClick={() => exportOrdersToExcel(filteredOrders)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer">
              <Layers className="h-3.5 w-3.5" />
              <span>Exportar Excel Pro</span>
            </button>
            <button onClick={() => setIsAddingRow(prev => !prev)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer ${isAddingRow ? 'bg-zinc-500 hover:bg-zinc-600 text-white' : 'bg-brand-500 hover:bg-brand-600 text-white'}`}>
              {isAddingRow ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{isAddingRow ? 'Cancelar Fila' : 'Nueva Fila'}</span>
            </button>
          </div>
        </div>

        {/* Search and Filters Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <div>
            <label className="block text-[9px] font-mono font-bold uppercase text-zinc-400 mb-1">Buscador General</label>
            <input type="text" value={ordersSearch} onChange={(e) => setOrdersSearch(e.target.value)}
              placeholder="Buscar por ID, Cliente, Pastel..."
              className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-[9px] font-mono font-bold uppercase text-zinc-400 mb-1">Filtrar por Estado</label>
            <select value={ordersStatusFilter} onChange={(e) => setOrdersStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white">
              <option value="Todos">Todos los Estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En conversación">Charlando</option>
              <option value="Aceptado">Aceptado</option>
              <option value="Preparando">Preparando</option>
              <option value="Listo">Listo</option>
              <option value="Entregado">Entregado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-mono font-bold uppercase text-zinc-400 mb-1">Filtrar por Tamaño</label>
            <select value={ordersSizeFilter} onChange={(e) => setOrdersSizeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white">
              <option value="Todos">Todos los Tamaños</option>
              <option value="Pequeño">Pequeño</option>
              <option value="Mediano">Mediano</option>
              <option value="Grande">Grande</option>
            </select>
          </div>
          <div className="flex items-center justify-around bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2">
            <div className="text-center">
              <span className="block text-[8px] font-mono uppercase text-zinc-400">Pedidos Filtrados</span>
              <span className="text-xs font-mono font-bold text-zinc-800 dark:text-white">{filteredOrders.length}</span>
            </div>
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800"></div>
            <div className="text-center">
              <span className="block text-[8px] font-mono uppercase text-zinc-400">Total S/. (Filtrado)</span>
              <span className="text-xs font-mono font-bold text-brand-500">S/. {totalFilteredSales}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Insertion Row */}
      {isAddingRow && (
        <form onSubmit={handleInsertManualOrder} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-dashed border-brand-300 space-y-3">
          <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-500 flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Insertar Fila Manual
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input type="text" placeholder="Cliente *" value={newRowData.customerName} onChange={(e) => setNewRowData(p => ({ ...p, customerName: e.target.value }))}
              className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800" />
            <input type="text" placeholder="Pastel *" value={newRowData.productName} onChange={(e) => setNewRowData(p => ({ ...p, productName: e.target.value }))}
              className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800" />
            <input type="number" placeholder="Precio S/." value={newRowData.totalPrice} onChange={(e) => setNewRowData(p => ({ ...p, totalPrice: Number(e.target.value) }))}
              className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800" />
            <button type="submit"
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase cursor-pointer">
              Insertar Fila
            </button>
          </div>
        </form>
      )}

      {/* Spreadsheet Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs table-fixed min-w-[1200px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-zinc-400">
                <th className="w-12 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">#</th>
                <th className="w-24 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">A (ID)</th>
                <th className="w-28 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">B (Fecha)</th>
                <th className="w-44 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">C (Cliente)</th>
                <th className="w-48 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">D (Pastel)</th>
                <th className="w-32 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">E (Tamaño)</th>
                <th className="w-32 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">F (Sabor)</th>
                <th className="w-36 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">G (Detalles)</th>
                <th className="w-48 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">H (Mensaje)</th>
                <th className="w-28 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">I (Precio)</th>
                <th className="w-36 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">J (Estado)</th>
                <th className="w-36 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">K (Pago)</th>
                <th className="w-24 p-1 text-center font-normal">L (Acción)</th>
              </tr>
              <tr className="bg-zinc-100/80 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 font-mono text-zinc-500 select-none">
                <th className="border-r border-zinc-200 dark:border-zinc-800/60 p-2 text-center text-[10px]">Row</th>
                {(['id', 'date', 'customerName', 'productName', 'size', 'flavor', null, null, 'totalPrice', 'status', 'paymentStatus'] as (keyof Order | null)[]).map((field, i) => (
                  <th key={i} className={`border-r border-zinc-200 dark:border-zinc-800/60 p-2 ${field === null ? 'text-left' : 'text-left cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-850'}`}
                    onClick={() => field && toggleSort(field)}>
                    {field === null ? 'Decor / Color / Msg' : `${String(field)} ${ordersSortField === field ? (ordersSortDirection === 'asc' ? '▲' : '▼') : ''}`}
                  </th>
                ))}
                <th className="p-2 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredOrders.map((ord, idx) => (
                <tr key={ord.id} className={`${idx % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-zinc-50/50 dark:bg-zinc-900/50'} hover:bg-brand-50/30 dark:hover:bg-brand-950/20 transition-colors border-b border-zinc-100 dark:border-zinc-800/50`}>
                  <td className="p-2 text-center text-zinc-400 font-mono text-[10px] border-r border-zinc-100 dark:border-zinc-800/50">{idx + 1}</td>
                  <td className="p-2 border-r border-zinc-100 dark:border-zinc-800/50">
                    {editingOrderId === ord.id ? (
                      <input value={editingOrderData.id || ord.id} onChange={(e) => setEditingOrderData(p => ({ ...p, id: e.target.value }))}
                        className="w-full px-1.5 py-1 bg-white border border-brand-500 rounded text-xs font-mono" />
                    ) : <span className="font-mono text-[10px]">{ord.id.substring(0, 12)}...</span>}
                  </td>
                  <td className="p-2 border-r border-zinc-100 dark:border-zinc-800/50 text-[10px]">{ord.date || '-'}</td>
                  <td className="p-2 border-r border-zinc-100 dark:border-zinc-800/50">
                    {editingOrderId === ord.id ? (
                      <input value={editingOrderData.customerName ?? ord.customerName} onChange={(e) => setEditingOrderData(p => ({ ...p, customerName: e.target.value }))}
                        className="w-full px-1.5 py-1 bg-white border border-brand-500 rounded text-xs" />
                    ) : <span className="font-semibold text-zinc-800 dark:text-zinc-200">{ord.customerName}</span>}
                  </td>
                  <td className="p-2 border-r border-zinc-100 dark:border-zinc-800/50">
                    {editingOrderId === ord.id ? (
                      <input value={editingOrderData.productName ?? ord.productName} onChange={(e) => setEditingOrderData(p => ({ ...p, productName: e.target.value }))}
                        className="w-full px-1.5 py-1 bg-white border border-brand-500 rounded text-xs" />
                    ) : <span className="text-brand-700">{ord.productName}</span>}
                  </td>
                  <td className="p-2 border-r border-zinc-100 dark:border-zinc-800/50 text-[10px]">{ord.size || '-'}</td>
                  <td className="p-2 border-r border-zinc-100 dark:border-zinc-800/50 text-[10px]">{ord.flavor || '-'}</td>
                  <td className="p-2 border-r border-zinc-100 dark:border-zinc-800/50 text-[10px]">{ord.customColor || ord.selectedDecoration || '-'}</td>
                  <td className="p-2 border-r border-zinc-100 dark:border-zinc-800/50 text-[10px] italic truncate max-w-[140px]">{ord.message ? `"${ord.message}"` : '-'}</td>
                  <td className="p-2 border-r border-zinc-100 dark:border-zinc-800/50 text-right font-mono font-bold">S/. {ord.totalPrice}</td>
                  <td className="p-2 border-r border-zinc-100 dark:border-zinc-800/50">
                    {editingOrderId === ord.id ? (
                      <select value={(editingOrderData.status as string) || ord.status} onChange={(e) => setEditingOrderData(p => ({ ...p, status: e.target.value as any }))}
                        className="w-full px-1 py-1 bg-white border border-brand-500 rounded text-xs">
                        {['Pendiente', 'Confirmado', 'Preparando', 'Decoración', 'Listo', 'En camino', 'Entregado', 'Cancelado'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusColors[ord.status] || 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}>
                        {ord.status}
                      </span>
                    )}
                  </td>
                  <td className="p-2 border-r border-zinc-100 dark:border-zinc-800/50">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${ord.paymentStatus === 'confirmado' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {ord.paymentStatus || 'pendiente'}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <div className="flex items-center space-x-1 justify-center">
                      {editingOrderId === ord.id ? (
                        <button onClick={() => handleSaveInlineEdit(ord.id)}
                          className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 cursor-pointer" title="Guardar">
                          <Check className="h-3 w-3" />
                        </button>
                      ) : (
                        <button onClick={() => { setEditingOrderId(ord.id); setEditingOrderData({}); }}
                          className="p-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-500 cursor-pointer" title="Editar inline">
                          ✏️
                        </button>
                      )}
                      <select value={ord.status} onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as OrderStatus)}
                        className="px-1.5 py-1 bg-white border border-zinc-200 rounded-lg text-[10px] cursor-pointer">
                        {['Pendiente', 'Confirmado', 'Preparando', 'Decoración', 'Listo', 'En camino', 'Entregado', 'Cancelado'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {onOpenPaymentModal && (
                        <button onClick={() => onOpenPaymentModal(ord)}
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 rounded-lg text-amber-600 cursor-pointer" title="Gestionar Pago">
                          💰
                        </button>
                      )}
                      <button onClick={() => handleDeleteOrder(ord.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500 cursor-pointer" title="Eliminar">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-zinc-400 text-xs font-mono">No se encontraron pedidos con los filtros actuales.</div>
        )}
      </div>
    </div>
  );
}
