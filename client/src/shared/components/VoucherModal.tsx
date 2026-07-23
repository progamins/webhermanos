import React, { useState } from 'react';
import { X, Printer, CheckCircle2, ShoppingBag, Calendar, Phone, Mail, Award, Download, Loader2 } from 'lucide-react';
import { Order } from '../types';
import html2canvas from 'html2canvas';
import Barcode from './Barcode';

interface VoucherModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function VoucherModal({ order, isOpen, onClose }: VoucherModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadVoucher = async () => {
    const element = document.getElementById('maison-print-ticket');
    if (!element) return;
    
    setIsDownloading(true);
    try {
      // Small delay to ensure all assets / layouts are complete
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      const canvas = await html2canvas(element, {
        scale: 2, // High DPI / quality
        useCORS: true, // Bypass cross-origin restrictions for absolute images if any
        backgroundColor: '#FCFBF7', // Match the receipt background color
        logging: false,
        onclone: (clonedDoc) => {
          // You can modify style of cloned element if needed for crisp rendering
          const clonedElement = clonedDoc.getElementById('maison-print-ticket');
          if (clonedElement) {
            clonedElement.style.boxShadow = 'none';
            clonedElement.style.border = 'none';
          }
        }
      });
      
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `Boleta-MaisonRosas-${order.trackingCode || order.id}.png`;
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error auto-generating receipt download image:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Self-contained CSS for printing ONLY the ticket area */}
      <style>{`
        @media print {
          /* Hide everything else on the page */
          body * {
            visibility: hidden !important;
            background: none !important;
          }
          /* Show only the voucher area */
          #maison-print-ticket, #maison-print-ticket * {
            visibility: visible !important;
          }
          #maison-print-ticket {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header (No print) */}
        <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between no-print">
          <div>
            <h3 className="font-serif font-bold text-zinc-900 dark:text-white text-sm">
              Comprobante de Pago Digital
            </h3>
            <p className="text-[10px] font-mono text-zinc-400 mt-0.5 uppercase tracking-wider">
              Maison Rosas Ticket N° {order.trackingCode}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable container */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center">
          
          {/* Printable Ticket */}
          <div 
            id="maison-print-ticket" 
            className="w-full bg-[#FCFBF7] dark:bg-[#1C1A18] text-zinc-800 dark:text-zinc-200 p-6 sm:p-8 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 shadow-inner font-sans relative flex flex-col space-y-5"
          >
            {/* Watermark Logo Backing */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
              <span className="font-serif font-black text-8xl text-center rotate-12">MAISON</span>
            </div>

            {/* Shop branding */}
            <div className="text-center space-y-1.5 border-b border-zinc-200 dark:border-zinc-700 pb-4">
              <span className="inline-block px-2.5 py-0.5 bg-brand-50 border border-brand-200/50 text-brand-700 rounded-full text-[9px] font-mono font-bold tracking-widest uppercase">
                ★ BOLETA DE VENTA ★
              </span>
              <h2 className="font-serif font-extrabold text-2xl text-zinc-900 dark:text-white tracking-tight">
                Maison Rosas
              </h2>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 italic font-serif">
                Pastelería de Autor & Repostería Fina
              </p>
              <p className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 leading-snug">
                Av. Ricardo Palma 213, Urb. Sánchez Cerro, Sullana, Perú<br/>
                Contacto: +51 902 568 187 • RUC: 10457489251
              </p>
            </div>

            {/* Meta info block */}
            <div className="grid grid-cols-2 gap-y-2 text-[10px] font-mono border-b border-zinc-150 dark:border-zinc-700 pb-3">
              <div>
                <span className="text-zinc-400 block uppercase">Comprobante N°</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">MR-{order.trackingCode}</span>
              </div>
              <div className="text-right">
                <span className="text-zinc-400 block uppercase">Fecha de Emisión</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{order.fechaPago || order.date}</span>
              </div>
              <div>
                <span className="text-zinc-400 block uppercase">Operación</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span>APROBADO</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-zinc-400 block uppercase">Forma de Pago</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{order.paymentMethod || 'Verificado'}</span>
              </div>
            </div>

            {/* Customer info block */}
            <div className="space-y-1 text-xs border-b border-zinc-150 dark:border-zinc-700 pb-3">
              <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Datos del Cliente
              </h4>
              <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <span className="font-bold text-zinc-900 dark:text-white">{order.customerName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                <span>📞 {order.customerPhone}</span>
                {order.customerEmail && <span>• ✉ {order.customerEmail}</span>}
              </div>
            </div>

            {/* Purchase Item Table */}
            <div className="space-y-3.5 border-b border-zinc-150 dark:border-zinc-700 pb-4">
              <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                Detalle del Pedido
              </h4>

              <div className="space-y-2.5">
                <div className="flex justify-between items-start text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-zinc-900 dark:text-white block">{order.productName}</span>
                    <span className="text-[10px] text-zinc-500 block">
                      Porción: {order.size}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      Sabor: {order.flavor}
                    </span>
                    {order.selectedDecoration && order.selectedDecoration !== 'Ninguna' && (
                      <span className="text-[10px] text-zinc-500 block">
                        Decoración: {order.selectedDecoration}
                      </span>
                    )}
                    {order.message && (
                      <span className="text-[10px] text-brand-700 block italic font-serif">
                        Dedicatoria: "{order.message}"
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-zinc-950 shrink-0">
                    S/. {order.totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Calculations totals */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>SUBTOTAL (Sujeto a exoneración)</span>
                <span>S/. {(order.totalPrice * 0.82).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>I.G.V. (18% incluido)</span>
                <span>S/. {(order.totalPrice * 0.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-zinc-900 dark:text-white border-t border-zinc-200 dark:border-zinc-700 pt-2 font-mono">
                <span>MONTO TOTAL PAGADO</span>
                <span className="text-brand-600 text-base">S/. {order.totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer seal */}
            <div className="pt-4 border-t border-zinc-200/60 dark:border-zinc-700/60 text-center space-y-2">
              <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-bold font-mono">
                <span>🟢</span>
                <span>PAGO VERIFICADO POR EL ADMINISTRADOR</span>
              </div>
              
              <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-sans leading-normal">
                Pastelería Familiar Maison Rosas de Carol & Edwin Rosas Albines.<br/>
                ¡Gracias por permitirnos endulzar tu mesa familiar! Sullana, Piura.
              </div>

              {/* Real scannable barcode */}
              <div className="flex flex-col items-center pt-2 select-none">
                <Barcode
                  value={`MR-${order.trackingCode}-${order.id.slice(-4)}`}
                  width={2}
                  height={50}
                  fontSize={10}
                  lineColor="#27272a"
                  background="transparent"
                  margin={0}
                />
                <span className="text-[8px] font-mono text-zinc-400 mt-0.5 uppercase tracking-widest">
                  *{order.trackingCode}*
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* Footer (No print) */}
        <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end space-x-2 no-print shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Cerrar
          </button>
          
          {/* Download Button */}
          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownloadVoucher}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-150 text-white dark:text-zinc-900 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-55"
          >
            {isDownloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>{isDownloading ? 'Descargando...' : 'Descargar Boleta'}</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-md"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimir</span>
          </button>
        </div>

      </div>
    </div>
  );
}
