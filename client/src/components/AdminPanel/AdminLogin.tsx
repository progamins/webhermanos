import React, { useState, useRef, useCallback } from 'react';
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
  const [videoOpacity, setVideoOpacity] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastOpacityRef = useRef(1);

  const smoothLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => {});
    setVideoOpacity(1);
  }, []);

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
      // Sin delay artificial — transición inmediata al panel
      onLoginSuccess(selectedRole);
    } else {
      const errorMsg = result.error || 'Contraseña incorrecta. Inténtalo de nuevo.';
      setLoginError(errorMsg);
      showToast('Credenciales incorrectas.', 'error', 'Acceso Denegado');
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center pt-24 px-4 relative overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0 bg-zinc-950">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          preload="auto"
          poster="/uploads/image-1784240002481-440086267.png"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-linear"
          onTimeUpdate={() => {
            const v = videoRef.current;
            if (!v || v.duration === 0) return;
            const remaining = v.duration - v.currentTime;
            const nextOpacity = remaining < 0.8
              ? Math.max(0.08, remaining / 0.8)
              : 1;
            // Solo actualizar si cambió para evitar re-renders innecesarios
            if (nextOpacity !== lastOpacityRef.current) {
              lastOpacityRef.current = nextOpacity;
              setVideoOpacity(nextOpacity);
            }
          }}
          onEnded={smoothLoop}
        >
          <source src="/uploads/video_login.mp4" type="video/mp4" />
        </video>
        {/* Overlay oscuro para legibilidad */}
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
        {/* Gradiente decorativo en los bordes */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 25, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 text-center space-y-6 z-10 relative border border-white/20 shadow-2xl rounded-3xl"
        id="admin-login-card"
      >
        <div className="mx-auto w-14 h-14 bg-white/20 text-white rounded-full flex items-center justify-center border border-white/30 shadow-lg">
          <Lock className="h-6 w-6" />
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand-300 font-bold">
            PANEL DE ADMINISTRACIÓN
          </span>
          <h2 className="text-2xl font-serif font-bold text-white mt-1 drop-shadow-sm">
            Maison Rosas Admin
          </h2>
          <p className="text-xs text-white/70 mt-1 leading-relaxed">
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
            className="w-full px-4 py-3 bg-white/15 backdrop-blur-md text-sm placeholder-white/50 focus:outline-none text-white text-center border border-white/20 rounded-xl focus:border-brand-400 focus:bg-white/20 transition-all"
            id="admin-password-input"
            disabled={isSubmitting}
          />

          {/* Role Selector */}
          <div className="space-y-2">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-white/60 font-semibold">
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
                        ? 'bg-brand-500/20 border-brand-400 text-white shadow-sm'
                        : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/20 hover:border-white/30'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-brand-500 text-white' : 'bg-white/15 text-white/60'}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1">
                      <span className="block text-[11px] font-bold text-white">{role.label}</span>
                      <span className="block text-[9px] text-white/50">{role.desc}</span>
                    </div>
                    {isActive && <Check className="h-3.5 w-3.5 text-brand-300 shrink-0" />}
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
