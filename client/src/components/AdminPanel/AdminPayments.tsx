import React, { useState } from 'react';
import { Eye, Search, X, Check, Upload } from 'lucide-react';
import { Order } from '../../types';
import { dbService } from '../../dbService';

interface AdminPaymentsProps {
  orders: Order[];
  setOrders?: React.Dispatch<React.SetStateAction<Order[]>>;
  onRefreshData: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
  onViewScreenshot: (url: string, title: string) => void;
}

export default function AdminPayments({ orders, setOrders, onRefreshData, showToast, onViewScreenshot }: AdminPaymentsProps) {
  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [paymentsFilter, setPaymentsFilter] = useState<'all' | 'no_screenshot' | 'has_screenshot'>('all');
  const [uploadingReceiptOrderId, setUploadingReceiptOrderId] = useState<string | null>(null);

  const handleUploadReceiptForOrder = async (orderId: string, file: File) => {
    setUploadingReceiptOrderId(orderId);
    try {
      const result = await dbService.uploadVoucher(orderId, file);
      if (setOrders) {
        setOrders(prev => prev.map(o => o.id === orderId ? {
          ...o, voucherUrl: result.voucherUrl, voucherName: result.voucherName, voucherUploadedAt: result.voucherUploadedAt
        } : o));
      }
      showToast('Comprobante de pago archivado correctamente.', 'success', 'Comprobante Guardado');
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Error al subir el comprobante.', 'error', 'Error de Subida');
    } finally {
      setUploadingReceiptOrderId(null);
    }
  };

  const handleDeleteReceiptForOrder = async (order: Order) => {
    if (!confirm(`¿Estás seguro de eliminar el comprobante de pago de ${order.customerName}?`)) return;
    setUploadingReceiptOrderId(order.id);
    try {
      await dbService.deleteVoucher(order.id, order.voucherUrl);
      if (setOrders) {
        setOrders(prev => prev.map(o => o.id === order.id ? {
          ...o, voucherUrl: undefined, voucherName: undefined, voucherUploadedAt: undefined
        } : o));
      }
      showToast('Comprobante eliminado del archivo.', 'success', 'Eliminado');
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar el comprobante.', 'error', 'Error al Eliminar');
    } finally {
      setUploadingReceiptOrderId(null);
    }
  };

  const paymentsFilteredOrders = orders.filter(o => {
    const customerName = (o.customerName || '').toLowerCase();
    const orderId = (o.id || '').toLowerCase();
    const trackingCode = (o.trackingCode || '').toLowerCase();
    const searchLower = paymentsSearch.toLowerCase();
    const matchesSearch = 
      customerName.includes(searchLower) ||
      orderId.includes(searchLower) ||
      (trackingCode && trackingCode.includes(searchLower));
    if (!matchesSearch) return false;
    if (paymentsFilter === 'no_screenshot') return o.paymentStatus === 'confirmado' && !o.voucherUrl;
    if (paymentsFilter === 'has_screenshot') return o.paymentStatus === 'confirmado' && o.voucherUrl;
    return o.paymentStatus === 'confirmado' || o.voucherUrl;
  });

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/85 shadow-sm">
        <div className="flex items-center space-x-2 text-brand-500 font-mono text-[10px] font-bold uppercase tracking-wider mb-2">
          <span>💵 Archivo de Pagos Verificados</span>
        </div>
        <h3 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">
          Comprobantes de Pago
        </h3>
        <p className="text-xs text-zinc-500 mt-1 font-sans leading-relaxed max-w-2xl">
          Este es un apartado exclusivo para el administrador. Una vez que confirmas el pago de un cliente desde la sección "Pedidos WhatsApp", puedes archivar aquí la captura de pantalla real (Yape, Plin o Transferencia) para llevar un registro histórico perfecto del negocio. El cliente también podrá visualizarla en su portal de seguimiento.
        </p>
      </div>

      {/* Filters Row */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-xs">
          <input type="text" placeholder="Buscar por cliente o código..." value={paymentsSearch}
            onChange={(e) => setPaymentsSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white outline-none focus:border-brand-500 transition-colors font-sans" />
          <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-3" />
        </div>
        <div className="flex space-x-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'no_screenshot', label: '⚠️ Sin Comprobante' },
            { id: 'has_screenshot', label: '✅ Con Comprobante' },
          ].map((btn) => (
            <button key={btn.id} onClick={() => setPaymentsFilter(btn.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${paymentsFilter === btn.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950' : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payments List */}
      {paymentsFilteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <span className="text-3xl block mb-3">💳</span>
          <h4 className="text-sm font-serif font-bold text-zinc-700 dark:text-zinc-300">Ningún pago confirmado aún</h4>
          <p className="text-xs text-zinc-400 mt-1">Los comprobantes aparecerán aquí cuando confirmes pagos desde la planilla de pedidos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {paymentsFilteredOrders.map((ord) => (
            <div key={ord.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-serif font-bold text-zinc-900 dark:text-white text-sm">{ord.customerName}</h4>
                    <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">{ord.productName}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-50 dark:bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-100 dark:border-zinc-800">
                    {ord.trackingCode}
                  </span>
                </div>

                <div className="bg-zinc-50/50 dark:bg-zinc-950/50 rounded-2xl p-3 mb-4 space-y-1.5 text-[11px] font-sans text-zinc-600">
                  <div className="flex justify-between"><span className="text-zinc-400">Pedido:</span><span className="font-semibold text-zinc-800 dark:text-zinc-200">S/. {ord.totalPrice}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Método:</span><span className="font-semibold">{ord.paymentMethod || '—'}</span></div>
                  {ord.montoPagado ? <div className="flex justify-between"><span className="text-zinc-400">Pagado:</span><span className="font-semibold text-emerald-600">S/. {ord.montoPagado}</span></div> : null}
                  {ord.fechaPago ? <div className="flex justify-between"><span className="text-zinc-400">Fecha:</span><span className="font-semibold text-zinc-800 dark:text-zinc-200">{ord.fechaPago}</span></div> : null}
                </div>
              </div>

              {/* Voucher section */}
              <div className="space-y-2 mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800">
                {ord.voucherUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-100 shrink-0">
                        <img src={ord.voucherUrl} alt="Voucher" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="truncate flex-1 min-w-0">
                        <span className="block text-[10px] font-medium text-zinc-700 dark:text-zinc-300 truncate font-mono">{ord.voucherName || 'captura.jpg'}</span>
                        <span className="block text-[8px] text-zinc-400 font-mono">{ord.voucherUploadedAt ? new Date(ord.voucherUploadedAt).toLocaleDateString('es-PE') : ''}</span>
                      </div>
                      <button onClick={() => onViewScreenshot(ord.voucherUrl!, `Captura de Pago - ${ord.customerName}`)}
                        className="p-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 rounded-lg shrink-0 cursor-pointer transition-colors" title="Ver">
                        <Eye className="h-3.5 w-3.5 text-zinc-500" />
                      </button>
                    </div>
                    <button onClick={() => handleDeleteReceiptForOrder(ord)}
                      disabled={uploadingReceiptOrderId === ord.id}
                      className="w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50">
                      {uploadingReceiptOrderId === ord.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                ) : (
                  <label className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer border-2 border-dashed transition-colors ${uploadingReceiptOrderId === ord.id ? 'bg-zinc-100 border-zinc-300 text-zinc-400' : 'bg-brand-50 border-brand-300 text-brand-700 hover:bg-brand-100'}`}>
                    <Upload className="h-3.5 w-3.5" />                      <span>{uploadingReceiptOrderId === ord.id ? 'Subiendo...' : 'Subir Comprobante'}</span>
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingReceiptOrderId === ord.id}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadReceiptForOrder(ord.id, f); e.target.value = ''; }} />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
