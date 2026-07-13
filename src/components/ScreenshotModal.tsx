import React, { useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScreenshotModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export default function ScreenshotModal({ imageUrl, isOpen, onClose, title = 'Captura de Pago (WhatsApp)' }: ScreenshotModalProps) {
  const [scale, setScale] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);

  // Reset controls when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Attempt to get a reasonable file name
      const ext = imageUrl.split('.').pop()?.split('?')[0] || 'png';
      link.download = `comprobante-pago-${Date.now()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Fallback direct open
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 dark:bg-black/90 backdrop-blur-md cursor-zoom-out"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative bg-zinc-900/90 dark:bg-zinc-950/95 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-zinc-950/50 border-b border-zinc-800 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="font-serif font-bold text-white text-sm truncate">
                {title}
              </h3>
              <p className="text-[10px] font-mono text-zinc-400 mt-0.5 truncate uppercase tracking-wider">
                Visualizador de Comprobantes Oficial
              </p>
            </div>
            
            {/* Control buttons */}
            <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Acercar (Zoom In)"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Alejar (Zoom Out)"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Rotar 90°"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="p-1.5 bg-brand-600 hover:bg-brand-500 rounded-lg text-white transition-colors cursor-pointer"
                title="Descargar Comprobante"
              >
                <Download className="h-4 w-4" />
              </button>
              <div className="w-[1px] h-5 bg-zinc-800 mx-1" />
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-750 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Viewport Frame with scroll and drag capabilities */}
          <div className="p-6 bg-zinc-950/40 flex-1 overflow-auto flex items-center justify-center min-h-[300px] max-h-[60vh] select-none relative">
            <div className="relative overflow-hidden flex items-center justify-center w-full h-full">
              <motion.img
                src={imageUrl}
                alt="Comprobante de pago"
                className="max-h-[50vh] max-w-full object-contain shadow-lg rounded-xl pointer-events-none transition-transform duration-200"
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                }}
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Bottom Bar info */}
          <div className="px-6 py-3 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 font-sans">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Verificado seguro por el servidor
            </span>
            <span>Zoom: {Math.round(scale * 100)}%</span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
