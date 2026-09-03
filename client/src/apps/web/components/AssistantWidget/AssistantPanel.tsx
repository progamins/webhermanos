import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, X, Home, MessageSquareText } from 'lucide-react';
import type { AppConfig, Product } from '../../../../shared/types';
import {
  assistantRespond,
  actionLabel,
  isBusinessOpen,
  type AssistantAction,
  type AssistantContext,
  type AssistantMessage,
  type AssistantOption,
  type AssistantScreen,
} from '../../../../shared/services/attentionService';
import { dbService } from '../../../../shared/services/dbService';
import { Spinner } from '../../../../shared/components/ui';

interface AssistantPanelProps {
  config: AppConfig;
  initialProducts: Product[];
  onClose: () => void;
  onSelectCustomize: (product: Product) => void;
}

const MENU_ACTION: AssistantAction = { type: 'menu' };

export default function AssistantPanel({ config, initialProducts, onClose, onSelectCustomize }: AssistantPanelProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [productsLoaded, setProductsLoaded] = useState(initialProducts.length > 0);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState(false);

  const screenRef = useRef<AssistantScreen>({ id: 'menu' });
  const [messages, setMessages] = useState<AssistantMessage[]>(() =>
    assistantRespond({ id: 'menu' }, MENU_ACTION, { config, products: initialProducts }).messages,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const businessOpen = isBusinessOpen(config);

  // Usar productos ya cargados por la App si el asistente se montó antes que ellos
  useEffect(() => {
    if (initialProducts.length > 0 && !productsLoaded) {
      setProducts(initialProducts);
      setProductsLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProducts]);

  // Scroll automático al último mensaje
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const buildCtx = (overrides?: Partial<AssistantContext>): AssistantContext => ({
    config,
    products,
    productsLoaded,
    productLoading,
    productError,
    ...overrides,
  });

  const loadProducts = async () => {
    setProductLoading(true);
    setProductError(false);
    try {
      const list = await dbService.getProducts();
      setProducts(list);
      setProductsLoaded(true);
      const reply = assistantRespond(
        screenRef.current,
        { type: 'reload' },
        buildCtx({ products: list, productsLoaded: true, productLoading: false, productError: false }),
      );
      setMessages((prev) => [...prev.filter((m) => m.kind !== 'loading'), ...reply.messages]);
    } catch {
      setProductError(true);
      setProductsLoaded(true);
      const reply = assistantRespond(
        screenRef.current,
        { type: 'reload' },
        buildCtx({ products: [], productsLoaded: true, productLoading: false, productError: true }),
      );
      setMessages((prev) => [...prev.filter((m) => m.kind !== 'loading'), ...reply.messages]);
    } finally {
      setProductLoading(false);
    }
  };

  const handleAction = async (action: AssistantAction, optionLabel?: string) => {
    const reply = assistantRespond(screenRef.current, action, buildCtx());
    const echo = optionLabel || actionLabel(action);

    screenRef.current = reply.nextScreen;
    setMessages((prev) => [...prev, ...(echo ? [userMessage(echo)] : []), ...reply.messages]);

    // Efectos laterales (abrir personalizador / WhatsApp) — la UI solo ejecuta
    if (reply.effect?.type === 'customize') {
      onClose();
      onSelectCustomize(reply.effect.product);
      return;
    }
    if (reply.effect?.type === 'whatsapp') {
      window.open(reply.effect.url, '_blank', 'noopener');
      return;
    }

    // La pantalla necesita productos y aún no se intentó cargarlos → cargar
    if (reply.requiresProducts && !productsLoaded && !productLoading) {
      await loadProducts();
    }
  };

  return (
    <motion.div
      role="dialog"
      aria-label="Asistente de atención Maison Rosas"
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="fixed z-[60] bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-[380px] h-[min(600px,calc(100dvh-7rem))] flex flex-col overflow-hidden rounded-3xl border shadow-2xl shadow-black/10"
      style={{
        backgroundColor: 'var(--theme-bg)',
        borderColor: 'var(--theme-border)',
        color: 'var(--theme-text)',
      }}
    >
      {/* ─── Header ─── */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#C7442E] to-[#E9A13B] flex items-center gap-3 shrink-0">
        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <MessageCircle className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-serif font-bold text-white leading-tight">Asistente Maison Rosas</p>
          <p className="flex items-center gap-1.5 text-[10px] text-white/90 mt-0.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${businessOpen ? 'bg-emerald-300' : 'bg-rose-300'} animate-pulse`}
            />
            {businessOpen ? 'Estamos atendiendo ahora' : 'Fuera de horario'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar asistente"
          className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ─── Mensajes ─── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3" aria-live="polite">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onAction={handleAction} />
        ))}
      </div>

      {/* ─── Acciones rápidas ─── */}
      <div
        className="px-3 py-2 border-t flex items-center justify-between shrink-0"
        style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}
      >
        <button
          type="button"
          onClick={() => handleAction(MENU_ACTION)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-mono font-semibold uppercase tracking-wider transition-colors hover:bg-brand-50 dark:hover:bg-brand-950/30 cursor-pointer"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)' }}
        >
          <Home className="h-3 w-3" />
          Menú
        </button>
        <span className="text-[9px] font-mono text-zinc-400">Atención automática</span>
        <button
          type="button"
          onClick={() => handleAction({ type: 'whatsapp' })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366] text-white text-[10px] font-mono font-semibold uppercase tracking-wider transition-all hover:brightness-105 cursor-pointer"
        >
          <MessageSquareText className="h-3 w-3" />
          WhatsApp
        </button>
      </div>
    </motion.div>
  );
}

// ─── Burbuja de mensaje + opciones ───

interface MessageBubbleProps {
  message: AssistantMessage;
  onAction: (action: AssistantAction, label?: string) => void;
}

function MessageBubble({ message, onAction }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-xs leading-relaxed bg-brand-500 text-white shadow-sm">
          {message.text}
        </div>
      </div>
    );
  }

  const isError = message.kind === 'error';
  const isEmpty = message.kind === 'empty';

  return (
    <div className="flex flex-col items-start gap-2">
      <div
        className={`max-w-[88%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line shadow-sm ${
          isError
            ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200'
            : isEmpty
              ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200'
              : ''
        }`}
        style={
          !isError && !isEmpty
            ? {
                backgroundColor: 'var(--theme-surface)',
                border: '1px solid var(--theme-border)',
                color: 'var(--theme-text)',
              }
            : undefined
        }
      >
        {message.kind === 'loading' ? (
          <span className="flex items-center gap-2">
            <Spinner size="sm" />
            <span className="animate-pulse">Un momento…</span>
          </span>
        ) : (
          message.text
        )}
      </div>

      {message.options && message.options.length > 0 && (
        <div className="flex flex-col items-start gap-1.5 pl-1 w-full max-w-[92%]">
          {message.options.map((opt) => (
            <OptionChip key={opt.label} option={opt} onAction={onAction} />
          ))}
        </div>
      )}
    </div>
  );
}

function OptionChip({ option, onAction }: { option: AssistantOption; onAction: MessageBubbleProps['onAction'] }) {
  return (
    <button
      type="button"
      onClick={() => onAction(option.action, option.label)}
      className="text-left w-fit max-w-full px-3.5 py-2 rounded-full border text-[11px] font-medium leading-snug transition-all hover:scale-[1.02] active:scale-[0.98] hover:bg-brand-50 dark:hover:bg-brand-950/30 cursor-pointer"
      style={{
        backgroundColor: 'var(--theme-surface-glass)',
        borderColor: 'var(--theme-border)',
        color: 'var(--theme-text-secondary)',
      }}
    >
      {option.label}
    </button>
  );
}

// ids únicos por sesión del panel
let msgSeq = 0;
function userMessage(text: string): AssistantMessage {
  return { id: `u-${++msgSeq}`, role: 'user', text };
}