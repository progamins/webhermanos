import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, X, Home, MessageSquareText, Send } from 'lucide-react';
import type { AppConfig, AssistantAction, AssistantMessage, AssistantOption, AssistantReply, AssistantScreen, Product } from '../../../../shared/types';
import { actionLabel, assistantUid, isBusinessOpen } from '../../../../shared/services/attentionService';
import { sendAssistantMessage } from '../../../../shared/services/assistantService';
import { Spinner } from '../../../../shared/components/ui';

interface AssistantPanelProps {
  config: AppConfig;
  onClose: () => void;
  onSelectCustomize: (product: Product) => void;
}

const MENU_ACTION: AssistantAction = { type: 'menu' };

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Respuesta local para cuando el backend no responde (nunca dejar el chat muerto). */
function offlineReply(): AssistantReply {
  return {
    messages: [{
      id: assistantUid('m'),
      role: 'bot',
      kind: 'error',
      text: 'No pudimos conectarnos en este momento 🙏 Intenta de nuevo o escríbenos por WhatsApp.',
      options: [
        { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
        { label: '🏠 Menú principal', action: { type: 'menu' } },
      ],
    }],
    nextScreen: { id: 'menu' },
  };
}

/**
 * Panel del asistente — UI delgada: cada mensaje/acción se envía al backend
 * (POST /api/assistant/message) y el panel solo renderiza el AssistantReply.
 */
export default function AssistantPanel({ config, onClose, onSelectCustomize }: AssistantPanelProps) {
  const screenRef = useRef<AssistantScreen>({ id: 'menu' });
  const welcomeFetched = useRef(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const businessOpen = isBusinessOpen(config);

  // Bienvenida generada por el backend (única fuente de verdad)
  useEffect(() => {
    if (welcomeFetched.current) return;
    welcomeFetched.current = true;
    const typingId = assistantUid('typing');
    setMessages([{ id: typingId, role: 'bot', kind: 'loading', text: '' }]);
    sendAssistantMessage({ screen: { id: 'menu' }, action: MENU_ACTION })
      .then((reply) => setMessages((prev) => [...prev.filter((m) => m.id !== typingId), ...reply.messages]))
      .catch(() => setMessages((prev) => [...prev.filter((m) => m.id !== typingId), ...offlineReply().messages]));
  }, []);

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

  /** Intercambio completo: eco → "escribiendo…" → backend → burbujas/efectos. */
  const exchange = async (payload: { message?: string; action?: AssistantAction }, echo?: AssistantMessage) => {
    const typingId = assistantUid('typing');
    setMessages((prev) => [...prev, ...(echo ? [echo] : []), { id: typingId, role: 'bot', kind: 'loading', text: '' }]);

    // Simular tiempo de escritura (agente real)
    await sleep(350 + Math.random() * 450);

    try {
      const reply = await sendAssistantMessage({ screen: screenRef.current, ...payload });
      screenRef.current = reply.nextScreen;
      setMessages((prev) => [...prev.filter((m) => m.id !== typingId), ...reply.messages]);

      // Efectos laterales (abrir personalizador / WhatsApp) — la UI solo ejecuta
      if (reply.effect?.type === 'customize') {
        onClose();
        onSelectCustomize(reply.effect.product);
        return;
      }
      if (reply.effect?.type === 'whatsapp') {
        window.open(reply.effect.url, '_blank', 'noopener');
      }
    } catch {
      setMessages((prev) => [...prev.filter((m) => m.id !== typingId), ...offlineReply().messages]);
    }
  };

  const handleAction = (action: AssistantAction, optionLabel?: string) => {
    const echoText = optionLabel || actionLabel(action);
    exchange({ action }, echoText ? userMessage(echoText) : undefined);
  };

  const handleSendText = (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    exchange({ message: text }, userMessage(text));
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

      {/* ─── Entrada de texto libre ─── */}
      <form
        onSubmit={handleSendText}
        className="px-3 pt-2.5 pb-0 shrink-0"
        style={{ backgroundColor: 'var(--theme-surface)' }}
      >
        <div
          className="flex items-center gap-2 rounded-full border px-3.5 py-2.5 transition-colors focus-within:border-brand-300"
          style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu consulta…"
            aria-label="Escribe tu consulta"
            enterKeyHint="send"
            className="flex-1 min-w-0 bg-transparent text-xs outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            style={{ color: 'var(--theme-text)' }}
          />
          <button
            type="submit"
            aria-label="Enviar mensaje"
            className="p-1.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white transition-colors shrink-0 cursor-pointer disabled:opacity-40"
            disabled={!input.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>

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
            <span className="animate-pulse">{message.text ? 'Un momento…' : 'Escribiendo…'}</span>
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

interface OptionChipProps {
  option: AssistantOption;
  onAction: MessageBubbleProps['onAction'];
}

function OptionChip({ option, onAction }: OptionChipProps) {
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

// Mensaje del usuario (eco) — id único garantizado
function userMessage(text: string): AssistantMessage {
  return { id: assistantUid('u'), role: 'user', text };
}