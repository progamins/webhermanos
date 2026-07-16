import React from 'react';
import toast from 'react-hot-toast';
import { Check, X, Sparkles, Clock, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export function showToast(message: string, type: ToastType = 'success', title?: string) {
  const icons: Record<ToastType, React.ReactNode> = {
    success: <Check className="h-4 w-4 text-emerald-500" />,
    error: <X className="h-4 w-4 text-red-500" />,
    info: <Sparkles className="h-4 w-4 text-blue-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  };

  const borders: Record<ToastType, string> = {
    success: 'border-emerald-200 dark:border-emerald-900/40',
    error: 'border-red-200 dark:border-red-900/40',
    info: 'border-blue-200 dark:border-blue-900/40',
    warning: 'border-amber-200 dark:border-amber-900/40',
  };

  const shadows: Record<ToastType, string> = {
    success: 'shadow-emerald-500/10',
    error: 'shadow-red-500/10',
    info: 'shadow-blue-500/10',
    warning: 'shadow-amber-500/10',
  };

  toast.custom(
    (t) => (
      <div
        className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-xl bg-white/95 dark:bg-zinc-900/95 ${borders[type]} ${shadows[type]} min-w-[300px] max-w-sm transition-all`}
        style={{
          transform: t.visible
            ? 'translateY(0) scale(1) rotate(0deg)'
            : 'translateY(-24px) scale(0.92) rotate(-1deg)',
          opacity: t.visible ? 1 : 0,
          transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700">
          {icons[type]}
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h5 className="text-[10px] font-mono font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              {title}
            </h5>
          )}
          <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 leading-relaxed font-sans">
            {message}
          </p>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    ),
    {
      duration: 4500,
      position: 'top-right',
      id: `toast-${Date.now()}`,
    }
  );
}
