import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Check, X, Sparkles, Clock } from 'lucide-react';
import { dbService } from '../../dbService';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
}

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success', title?: string) => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);
    const result = await dbService.adminLogin(password);
    setIsSubmitting(false);

    if (result.success) {
      showToast('Sesión de administración autorizada. ¡Hola Edwin!', 'success', 'Acceso Concedido');
      setTimeout(() => onLoginSuccess(), 500);
    } else {
      const errorMsg = result.error || 'Contraseña incorrecta. Inténtalo de nuevo.';
      setLoginError(errorMsg);
      showToast('Credenciales incorrectas.', 'error', 'Acceso Denegado');
    }
  };

  const toastIcons = {
    success: <Check className="h-3 w-3" />,
    error: <X className="h-3 w-3" />,
    info: <Sparkles className="h-3 w-3" />,
    warning: <Clock className="h-3 w-3" />,
  };

  const toastBg = {
    success: 'bg-emerald-500/20 text-emerald-500',
    error: 'bg-red-500/20 text-red-500',
    info: 'bg-blue-500/20 text-blue-500',
    warning: 'bg-amber-500/20 text-amber-500',
  };

  return (
    <section className="min-h-screen flex items-center justify-center pt-24 bg-brand-bg dark:bg-zinc-950 px-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-75">
        <div className="absolute top-[20%] left-[15%] w-[350px] h-[350px] rounded-full bg-brand-200/40 dark:bg-brand-950/20 blur-3xl animate-blob-1" />
        <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-brand-300/35 dark:bg-brand-900/15 blur-3xl animate-blob-2" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 25, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md liquid-glass liquid-glass-sheen p-8 text-center space-y-6 z-10 relative border border-white/40 dark:border-zinc-800/60 shadow-xl"
        id="admin-login-card"
      >
        <div className="mx-auto w-12 h-12 bg-white/40 dark:bg-zinc-800/40 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center border border-white/60 dark:border-zinc-700/60 shadow-sm">
          <Lock className="h-5 w-5" />
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 font-bold">
            PANEL DE ADMINISTRACIÓN
          </span>
          <h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white mt-1">
            Maison Rosas Admin
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Ingresa la contraseña de la familia Rosas Albines para acceder al panel.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            required
            placeholder="Contraseña del panel"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 liquid-glass-input text-sm placeholder-zinc-400/80 focus:outline-none text-zinc-800 dark:text-white text-center shadow-inner"
            id="admin-password-input"
            disabled={isSubmitting}
          />

          {loginError && (
            <p className="text-xs text-red-500 font-medium" id="login-error-msg">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider btn-glow transition-all duration-300 hover:scale-[1.01] cursor-pointer disabled:opacity-50"
            id="admin-login-submit"
          >
            {isSubmitting ? 'Verificando...' : 'Entrar al Panel'}
          </button>
        </form>

        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
          Contraseña demo: <code className="bg-white/40 dark:bg-zinc-800/40 px-1.5 py-0.5 rounded font-mono">ADMIN_PASSWORD_PLACEHOLDER</code>
        </p>
      </motion.div>

      {/* Toast Notifications */}
      <div className="fixed top-6 right-6 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none" id="toasts-portal-login">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9, rotate: -1 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            layout
            className="pointer-events-auto liquid-glass liquid-glass-sheen border border-white/40 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xl flex items-start space-x-3 backdrop-blur-xl"
            id={`toast-${toast.id}`}
          >
            <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${toastBg[toast.type]}`}>
              {toastIcons[toast.type]}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && (
                <h5 className="text-[10px] font-mono font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  {toast.title}
                </h5>
              )}
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 leading-relaxed font-sans">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
