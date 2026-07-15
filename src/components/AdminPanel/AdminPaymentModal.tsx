import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Upload, Eye, Trash2, Loader2 } from 'lucide-react';
import { Order } from '../../types';
import { dbService } from '../../dbService';

interface AdminPaymentModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
  setOrders?: React.Dispatch<React.SetStateAction<Order[]>>;
  onViewScreenshot?: (url: string, title: string) => void;
  onViewVoucher?: (order: Order) => void;
}

export default function AdminPaymentModal({
  order, isOpen, onClose, onSave, showToast, setOrders, onViewScreenshot, onViewVoucher
}: AdminPaymentModalProps) {
  const [paymentStatusInput, setPaymentStatusInput] = useState<'pendiente' | 'confirmado' | 'rechazado' | 'parcial'>('pendiente');
  const [paymentMethodInput, setPaymentMethodInput] = useState<'Yape' | 'Plin' | 'Transferencia' | 'Efectivo' | 'Ninguno'>('Ninguno');
  const [montoPagadoInput, setMontoPagadoInput] = useState<number>(0);
  const [fechaPagoInput, setFechaPagoInput] = useState<string>('');
  const [confirmedByAdminInput, setConfirmedByAdminInput] = useState<string>('Carol Rosas');
  const [voucherFileInput, setVoucherFileInput] = useState<File | null>(null);
  const [voucherPreviewUrl, setVoucherPreviewUrl] = useState<string | null>(null);
  const [isUploadingVoucher, setIsUploadingVoucher] = useState<boolean>(false);

  useEffect(() => {
    if (order) {
      setPaymentStatusInput(order.paymentStatus || 'pendiente');
      setPaymentMethodInput(order.paymentMethod || 'Ninguno');
      setMontoPagadoInput(order.montoPagado ?? order.totalPrice);
      setFechaPagoInput(order.fechaPago || new Date().toISOString().split('T')[0]);
      setConfirmedByAdminInput(order.confirmedByAdmin || 'Carol Rosas');
      setVoucherFileInput(null);
      setVoucherPreviewUrl(null);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleSavePaymentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dbService.updateOrderPayment(order.id, {
        paymentStatus: paymentStatusInput,
        paymentMethod: paymentMethodInput,
        montoPagado: Number(montoPagadoInput) || 0,
        fechaPago: fechaPagoInput,
        confirmedByAdmin: confirmedByAdminInput
      });

      if (setOrders) {
        setOrders(prev => prev.map(o => o.id === order.id ? {
          ...o,
          paymentStatus: paymentStatusInput,
          paymentMethod: paymentMethodInput,
          montoPagado: Number(montoPagadoInput) || 0,
          fechaPago: fechaPagoInput,
          confirmedByAdmin: confirmedByAdminInput
        } : o));
      }

      showToast(`Pago de pedido #${order.id.substring(0, 8)} actualizado.`, 'success', 'Gestión de Pago');
      onSave();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar los detalles de pago.', 'error', 'Error de Pago');
    }
  };

  const handleVoucherFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVoucherFileInput(file);
      setVoucherPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadVoucher = async () => {
    if (!voucherFileInput) return;
    setIsUploadingVoucher(true);
    try {
      const result = await dbService.uploadVoucher(order.id, voucherFileInput);
      const updatedOrder: Order = { ...order, voucherUrl: result.voucherUrl, voucherName: result.voucherName, voucherUploadedAt: result.voucherUploadedAt };
      if (setOrders) {
        setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
      }
      setVoucherFileInput(null);
      setVoucherPreviewUrl(null);
      showToast('Comprobante subido correctamente a Firebase Storage.', 'success', 'Voucher Guardado');
      onSave();
    } catch (err: any) {
      showToast(err.message || 'Error al subir el comprobante de pago.', 'error', 'Error de Carga');
    } finally {
      setIsUploadingVoucher(false);
    }
  };

  const handleDeleteVoucher = async () => {
    if (!confirm('¿Estás seguro de eliminar el comprobante de este pedido?')) return;
    try {
      await dbService.deleteVoucher(order.id, order.voucherUrl);
      const updatedOrder: Order = { ...order, voucherUrl: undefined, voucherName: undefined, voucherUploadedAt: undefined };
      if (setOrders) {
        setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
      }
      showToast('Comprobante eliminado correctamente de la base de datos.', 'info', 'Voucher Removido');
      onSave();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar el comprobante.', 'error', 'Error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-500 block">Pago</span>
            <h3 className="font-serif text-lg font-bold text-zinc-900 dark:text-white">Detalles del Pago</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full cursor-pointer">
            <X className="h-4 w-4 text-zinc-500" />
          </button>
        </div>

        <form onSubmit={handleSavePaymentDetails} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Order Summary */}
          <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl p-4 flex justify-between items-center text-xs">
            <div>
              <span className="block text-[9px] font-mono text-zinc-400 uppercase">Cliente</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">{order.customerName}</span>
              <span className="block text-[9px] font-mono text-zinc-400 mt-1 uppercase">Pedido</span>
              <span className="text-zinc-600 dark:text-zinc-300">{order.productName}</span>
            </div>
            <div className="text-right">
              <span className="block text-[9px] font-mono text-zinc-400 uppercase">Total</span>
              <span className="font-mono font-bold text-brand-500 text-base">S/. {order.totalPrice}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-semibold">Estado de Pago</label>
              <select value={paymentStatusInput} onChange={(e) => setPaymentStatusInput(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white font-medium outline-none focus:border-brand-500 transition-colors cursor-pointer">
                <option value="pendiente">🟡 Pago pendiente</option>
                <option value="confirmado">🟢 Pago confirmado</option>
                <option value="rechazado">🔴 Pago rechazado</option>
                <option value="parcial">🔵 Pago parcial</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-semibold">Método de Pago</label>
              <select value={paymentMethodInput} onChange={(e) => setPaymentMethodInput(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white outline-none focus:border-brand-500 transition-colors cursor-pointer">
                <option value="Ninguno">Seleccionar...</option>
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Efectivo">Efectivo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-semibold">Monto Pagado (S/.)</label>
              <input type="number" value={montoPagadoInput} onChange={(e) => setMontoPagadoInput(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-semibold">Fecha de Pago</label>
              <input type="date" value={fechaPagoInput} onChange={(e) => setFechaPagoInput(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white outline-none focus:border-brand-500" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-semibold">Confirmado por</label>
            <input type="text" value={confirmedByAdminInput} onChange={(e) => setConfirmedByAdminInput(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white outline-none focus:border-brand-500" />
          </div>

          {/* Voucher Section */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-5 space-y-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">Comprobante de Pago (Voucher)</h4>

            {order.voucherUrl ? (
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 shrink-0">
                    <img src={order.voucherUrl} alt="Voucher" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate font-mono">{order.voucherName || 'comprobante.jpg'}</span>
                    {order.voucherUploadedAt && (
                      <span className="block text-[10px] text-zinc-400 font-mono">{new Date(order.voucherUploadedAt).toLocaleString('es-PE')}</span>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    {onViewScreenshot && (
                      <button type="button" onClick={() => onViewScreenshot(order.voucherUrl!, `Comprobante - ${order.customerName}`)}
                        className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-500 hover:text-brand-600 cursor-pointer" title="Ver">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {onViewVoucher && (
                      <button type="button" onClick={() => onViewVoucher(order)}
                        className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-500 hover:text-brand-600 cursor-pointer" title="Imprimir Boleta">
                        🖨️
                      </button>
                    )}
                    <button type="button" onClick={handleDeleteVoucher}
                      className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer" title="Eliminar">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <label className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border-2 border-dashed transition-colors ${voucherFileInput ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-zinc-50 border-zinc-300 text-zinc-500 hover:bg-zinc-100'}`}>
                    <Upload className="h-4 w-4" />
                    <span>{voucherFileInput ? voucherFileInput.name : 'Seleccionar Comprobante'}</span>
                    <input type="file" accept="image/*,application/pdf" onChange={handleVoucherFileChange} className="hidden" />
                  </label>
                </div>
                {voucherPreviewUrl && (
                  <div className="space-y-2">
                    <img src={voucherPreviewUrl} alt="Preview" className="max-h-48 rounded-xl border border-zinc-200 object-contain mx-auto" />
                    <button type="button" onClick={handleUploadVoucher} disabled={isUploadingVoucher}
                      className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer transition-colors shadow-sm">
                      {isUploadingVoucher ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span>{isUploadingVoucher ? 'Subiendo...' : 'Subir Comprobante'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50 cursor-pointer transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm">
              Guardar Cambios
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
