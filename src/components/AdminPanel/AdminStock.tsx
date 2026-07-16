import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Layers, Edit3, Trash2, Package, Check, AlertTriangle } from 'lucide-react';
import { Product, Order } from '../../types';
import { dbService } from '../../dbService';
import Barcode from '../Barcode';
import { optimizeImageUrl } from '../../utils/images';

interface AdminStockProps {
  products: Product[];
  orders: Order[];
  onRefreshData: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
}

export default function AdminStock({ products, orders, onRefreshData, showToast }: AdminStockProps) {
  const [stockList, setStockList] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState<boolean>(false);
  const [isCreatingStock, setIsCreatingStock] = useState<boolean>(false);
  const [editingStockItem, setEditingStockItem] = useState<any | null>(null);

  const [stockName, setStockName] = useState<string>('');
  const [stockProductId, setStockProductId] = useState<string>('custom');
  const [stockFlavor, setStockFlavor] = useState<string>('Vainilla');
  const [stockSize, setStockSize] = useState<string>('Mediano (20 porciones)');
  const [stockDecoration, setStockDecoration] = useState<string>('Estándar de la Casa');
  const [stockQuantity, setStockQuantity] = useState<number>(1);
  const [stockNotes, setStockNotes] = useState<string>('');
  const [stockImageUrl, setStockImageUrl] = useState<string>('');

  // Stock Assignment (the stock item being assigned, not an Order)
  const [orderToAssignStock, setOrderToAssignStock] = useState<any | null>(null);
  const [isAssigningStock, setIsAssigningStock] = useState<boolean>(false);

  const handleFetchStock = async () => {
    try {
      setLoadingStock(true);
      const data = await dbService.getCakeStock();
      setStockList(data);
    } catch {
      showToast('Error al cargar el stock.', 'error', 'Error');
    } finally {
      setLoadingStock(false);
    }
  };

  useEffect(() => {
    handleFetchStock();
  }, []);

  const clearStockForm = () => {
    setStockName('');
    setStockProductId('custom');
    setStockFlavor('Vainilla');
    setStockSize('Mediano (20 porciones)');
    setStockDecoration('Estándar de la Casa');
    setStockQuantity(1);
    setStockNotes('');
    setStockImageUrl('');
  };

  const handleSaveStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockName) {
      showToast('Por favor, ingresa el nombre identificador.', 'warning', 'Formulario incompleto');
      return;
    }
    try {
      const targetId = editingStockItem ? editingStockItem.id : `stock-${Date.now()}`;
      const defaultImg = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80';
      const newItem = {
        id: targetId,
        name: stockName,
        productId: stockProductId,
        flavor: stockFlavor,
        size: stockSize,
        decoration: stockDecoration,
        quantity: Number(stockQuantity) || 0,
        createdAt: editingStockItem ? editingStockItem.createdAt : new Date().toISOString(),
        notes: stockNotes,
        imageUrl: stockImageUrl || defaultImg
      };

      await dbService.saveCakeStock(newItem);
      showToast(
        editingStockItem ? `El pastel en stock "${stockName}" ha sido actualizado.` : `Se ha agregado "${stockName}" al stock físico.`,
        'success', 'Stock Físico'
      );
      setEditingStockItem(null);
      setIsCreatingStock(false);
      clearStockForm();
      handleFetchStock();
    } catch {
      showToast('Error al guardar el pastel en stock.', 'error', 'Error');
    }
  };

  const handleStartEditStock = (item: any) => {
    setEditingStockItem(item);
    setStockName(item.name);
    setStockProductId(item.productId || 'custom');
    setStockFlavor(item.flavor);
    setStockSize(item.size);
    setStockDecoration(item.decoration);
    setStockQuantity(item.quantity);
    setStockNotes(item.notes || '');
    setStockImageUrl(item.imageUrl || '');
    setIsCreatingStock(true);
  };

  const handleDeleteStock = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas retirar este pastel del stock físico?')) return;
    try {
      await dbService.deleteCakeStock(id);
      showToast('Pastel eliminado del stock físico.', 'info', 'Inventario');
      handleFetchStock();
    } catch {
      showToast('Error al intentar eliminar del stock.', 'error', 'Error');
    }
  };

  const handleConfirmAssignStock = async (stockId: string) => {
    if (!orderToAssignStock) return;
    try {
      setIsAssigningStock(true);
      const res = await dbService.assignStockToOrder(orderToAssignStock.id, stockId);
      showToast(res.message || 'Pedido completado con éxito desde stock físico.', 'success', 'Despacho Expreso');
      setOrderToAssignStock(null);
      onRefreshData();
      handleFetchStock();
    } catch (err: any) {
      showToast(err.message || 'Ocurrió un error al asignar el stock.', 'error', 'Error de asignación');
    } finally {
      setIsAssigningStock(false);
    }
  };

  // Pending orders eligible for stock assignment (not cancelled, not delivered)
  const pendingOrders = orders.filter(o => !['Entregado', 'Cancelado'].includes(o.status));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-serif font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand-500" />
            Stock Físico (Pasteles Listos para Entrega)
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Gestiona pasteles ya preparados físicamente que puedes asignar directamente a pedidos de clientes para entrega inmediata, saltando la etapa de horneado y decoración.
          </p>
        </div>
        {!isCreatingStock && (
          <button onClick={() => { clearStockForm(); setIsCreatingStock(true); }}
            className="flex items-center justify-center space-x-1.5 px-5 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-xs font-mono font-bold uppercase tracking-wider shadow-md hover:scale-[1.01] transition-all cursor-pointer">
            <Plus className="h-4 w-4" />
            <span>Agregar Pastel</span>
          </button>
        )}
      </div>

      {/* Stock Form */}
      {isCreatingStock && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-500">
              {editingStockItem ? 'Editar Pastel' : 'Registrar Nuevo Pastel'}
            </h4>
            <button onClick={() => { setEditingStockItem(null); setIsCreatingStock(false); clearStockForm(); }}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSaveStockItem} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Pastel Base (Catálogo)</label>
                <select value={stockProductId} onChange={(e) => {
                  const val = e.target.value;
                  setStockProductId(val);
                  if (val !== 'custom') {
                    const found = products.find(p => p.id === val);
                    if (found) {
                      setStockName(found.name);
                      setStockFlavor(found.flavors?.[0] || 'Vainilla');
                      setStockDecoration(found.decorations?.[0] || 'Estándar');
                      setStockImageUrl(found.images?.[0] || '');
                    }
                  } else {
                    setStockName('');
                  }
                }}
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white outline-none focus:border-brand-500 cursor-pointer">
                  <option value="custom">✦ Pastel Personalizado / Vitrina</option>
                  {products.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Nombre / Identificador del Pastel</label>
                <input type="text" required value={stockName} onChange={(e) => setStockName(e.target.value)}
                  placeholder="Ej: Selva Negra Clásico con Cerezas"
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white outline-none focus:border-brand-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Sabor</label>
                <select value={stockFlavor} onChange={(e) => setStockFlavor(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white cursor-pointer">
                  <option value="Vainilla">Vainilla</option>
                  <option value="Chocolate">Chocolate</option>
                  <option value="Chocolate Belga">Chocolate Belga</option>
                  <option value="Red Velvet">Red Velvet</option>
                  <option value="Manjar Blanco">Manjar Blanco</option>
                  <option value="Tres Leches">Tres Leches</option>
                  <option value="Lúcuma">Lúcuma</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Tamaño</label>
                <select value={stockSize} onChange={(e) => setStockSize(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white cursor-pointer">
                  <option value="Pequeño (10 porciones)">Pequeño (10 porciones)</option>
                  <option value="Mediano (20 porciones)">Mediano (20 porciones)</option>
                  <option value="Grande (30 porciones)">Grande (30 porciones)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Decoración</label>
                <input type="text" value={stockDecoration} onChange={(e) => setStockDecoration(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Cantidad Física</label>
                <input type="number" min={0} value={stockQuantity} onChange={(e) => setStockQuantity(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Notas / Ubicación</label>
              <input type="text" value={stockNotes} onChange={(e) => setStockNotes(e.target.value)}
                placeholder="Ej: Vitrina refrigerada #3, hecho el viernes"
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button type="button" onClick={() => { setEditingStockItem(null); setIsCreatingStock(false); clearStockForm(); }}
                className="px-5 py-2 border border-zinc-200 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 hover:bg-zinc-50 cursor-pointer">
                Cancelar
              </button>
              <button type="submit"
                className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider cursor-pointer">
                {editingStockItem ? 'Guardar Cambios' : 'Agregar al Inventario'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Stock List */}
      {loadingStock ? (
        <div className="text-center py-12 text-zinc-400 text-xs font-mono">Cargando inventario...</div>
      ) : stockList.length === 0 ? (
        <div className="text-center py-16 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
          <Package className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
          <h4 className="text-sm font-serif font-bold text-zinc-500 dark:text-zinc-400">No hay pasteles en stock físico</h4>
          <p className="text-xs text-zinc-400 mt-1">Presiona "Agregar Pastel Listo" para registrar un pastel ya preparado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stockList.map((item) => {
            const isLowStock = item.quantity <= 1;
            return (
              <div key={item.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden">
                  <img src={optimizeImageUrl(item.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80', 600)}
                    alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${isLowStock ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                      {item.quantity} uds.
                    </span>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-serif font-bold text-zinc-900 dark:text-white text-sm">{item.name}</h4>
                      <span className="text-[10px] text-zinc-400 font-mono">{item.flavor} • {item.size}</span>
                    </div>
                    {/* Barcode */}
                    <div className="flex flex-col items-center ml-2 shrink-0">
                      <Barcode
                        value={`STK-${item.id.slice(-8)}`}
                        width={1.2}
                        height={24}
                        fontSize={7}
                        lineColor="#71717a"
                        margin={0}
                      />
                      <span className="text-[6px] font-mono text-zinc-400 mt-0.5">{item.id.slice(-8)}</span>
                    </div>
                  </div>
                  {item.notes && <p className="text-[10px] text-zinc-500 italic">{item.notes}</p>}
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex space-x-1">
                      <button onClick={() => handleStartEditStock(item)}
                        className="p-1.5 border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-400 hover:text-brand-500 cursor-pointer" title="Editar">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteStock(item.id)}
                        className="p-1.5 border border-zinc-200 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 cursor-pointer" title="Eliminar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {item.quantity > 0 && (
                      <button onClick={() => setOrderToAssignStock(item)}
                        className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors">
                        Asignar a Pedido
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stock Assignment Modal */}
      <AnimatePresence>
        {orderToAssignStock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-500 block">Seleccionar Pedido</span>
                  <h3 className="font-serif text-lg font-bold text-zinc-900 dark:text-white">Asignar Stock Físico a Pedido</h3>
                </div>
                <button onClick={() => setOrderToAssignStock(null)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full cursor-pointer">
                  <X className="h-4 w-4 text-zinc-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-3 flex-1">
                <p className="text-xs text-zinc-500 font-sans mb-3">
                  Selecciona el pedido de cliente al cual deseas asignar este pastel de stock físico <strong className="text-brand-700">{orderToAssignStock.name}</strong> ({orderToAssignStock.flavor}).
                  El pedido se marcará automáticamente como <strong className="text-emerald-600">LISTO</strong>.
                </p>
                {pendingOrders.length === 0 ? (
                  <div className="text-center py-6 text-zinc-400 text-xs font-mono">No hay pedidos pendientes para asignar stock.</div>
                ) : (
                  pendingOrders.map((ord) => (
                    <div key={ord.id}
                      className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-brand-500/50 transition-all cursor-pointer"
                      onClick={() => handleConfirmAssignStock(ord.id)}>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{ord.customerName}</span>
                        <span className="block text-[10px] text-zinc-400 truncate font-mono">{ord.productName} • S/. {ord.totalPrice}</span>
                        <span className="block text-[9px] text-zinc-400 font-mono mt-0.5">#{ord.id.substring(0, 12)}...</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold border ml-3 ${
                        ord.status === 'Pendiente' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        ord.status === 'Preparando' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        'bg-zinc-50 text-zinc-600 border-zinc-200'
                      }`}>
                        {ord.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-end">
                <button onClick={() => setOrderToAssignStock(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
