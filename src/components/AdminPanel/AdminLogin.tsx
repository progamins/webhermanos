import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Toaster } from 'react-hot-toast';
import { Lock, Check, Shield, UserCircle, Image as ImageIcon } from 'lucide-react';
import { dbService } from '../../dbService';
import type { AdminRole } from '../../types';
import { showToast } from '../../utils/toast';

interface AdminLoginProps {
  onLoginSuccess: (role: AdminRole) => void;
}

const ROLES: { id: AdminRole; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'admin', label: 'Administrador', icon: Shield, desc: 'Acceso completo a todos los módulos' },
  { id: 'analyst', label: 'Analista', icon: UserCircle, desc: 'Pedidos, pagos, cuentas y reseñas' },
  { id: 'stock_manager', label: 'Gestor de Stock', icon: ImageIcon, desc: 'Stock físico, galería de imágenes y modelo' },
];

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<AdminRole>('admin');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);
    const result = await dbService.adminLogin(password, selectedRole);
    setIsSubmitting(false);

    if (result.success) {
      // Store role in localStorage
      localStorage.setItem('maison_admin_role', selectedRole);
      
      const roleLabels: Record<string, string> = {
        admin: 'Administrador Principal',
        analyst: 'Analista de Cuentas',
        stock_manager: 'Gestor de Stock',
      };
      showToast(`Sesión iniciada como ${roleLabels[selectedRole] || 'Administrador'}`, 'success', 'Acceso Concedido');
      setTimeout(() => onLoginSuccess(selectedRole), 500);
    } else {
      const errorMsg = result.error || 'Contraseña incorrecta. Inténtalo de nuevo.';
      setLoginError(errorMsg);
      showToast('Credenciales incorrectas.', 'error', 'Acceso Denegado');
    }
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

          {/* Role Selector */}
          <div className="space-y-2">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
              Seleccionar Rol
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {ROLES.map((role) => {
                const Icon = role.icon;
                const isActive = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-brand-50 border-brand-300 text-brand-800 shadow-sm'
                        : 'bg-white/40 border-zinc-200/60 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-brand-500 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1">
                      <span className="block text-[11px] font-bold">{role.label}</span>
                      <span className="block text-[9px] text-zinc-400">{role.desc}</span>
                    </div>
                    {isActive && <Check className="h-3.5 w-3.5 text-brand-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

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


      </motion.div>

      {/* Toast Notifications with react-hot-toast */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4500,
          style: { padding: 0, margin: 0, background: 'transparent', boxShadow: 'none' },
        }}
        containerStyle={{
          top: 24,
          right: 24,
        }}
      />
    </section>
  );
}
