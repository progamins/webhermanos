import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircle, X } from 'lucide-react';
import type { AppConfig, Product } from '../../../../shared/types';
import { isBusinessOpen } from '../../../../shared/services/attentionService';
import AssistantPanel from './AssistantPanel';

interface AssistantWidgetProps {
  config: AppConfig | null;
  onSelectCustomize: (product: Product) => void;
}

/**
 * Botón flotante + panel del asistente de atención automática.
 * Se oculta por completo si la config tiene assistantEnabled = false.
 * El motor vive en el backend; aquí solo se abre/cierra el panel.
 */
export default function AssistantWidget({ config, onSelectCustomize }: AssistantWidgetProps) {
  const [open, setOpen] = useState(false);

  if (!config || config.assistantEnabled === false) return null;

  const businessOpen = isBusinessOpen(config);

  return (
    <>
      <AnimatePresence>
        {open && (
          <AssistantPanel
            config={config}
            onClose={() => setOpen(false)}
            onSelectCustomize={onSelectCustomize}
          />
        )}
      </AnimatePresence>

      {/* Botón flotante */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de atención'}
        aria-expanded={open}
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[60] h-14 w-14 rounded-full bg-gradient-to-br from-[#C7442E] to-[#E9A13B] text-white shadow-xl shadow-brand-900/25 flex items-center justify-center transition-shadow hover:shadow-2xl"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}

        {/* Indicador ABIERTO/CERRADO */}
        <span
          aria-hidden="true"
          className={`absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${
            businessOpen ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        />
      </motion.button>
    </>
  );
}