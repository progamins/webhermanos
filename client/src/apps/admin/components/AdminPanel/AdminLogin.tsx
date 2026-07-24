import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, type Transition } from 'motion/react';
import { Toaster } from '../../../../shared/components/ui';
import {
  Check, Shield, UserCircle, Image as ImageIcon,
  Eye, EyeOff, KeyRound, LogIn, Sparkles,
} from 'lucide-react';
import { dbService } from '../../../../shared/services/dbService';
import type { AdminRole } from '../../../../shared/types';
import { showToast } from '../../../../shared/utils/toast';

interface AdminLoginProps {
  onLoginSuccess: (role: AdminRole) => void;
}

// ─── Role configuration ───
const ROLES: {
  id: AdminRole;
  label: string;
  icon: React.ElementType;
  desc: string;
  color: string;
  gradient: string;
  indicator: string;
}[] = [
  {
    id: 'admin',
    label: 'Administrador',
    icon: Shield,
    desc: 'Acceso completo a todos los módulos del sistema',
    color: 'from-amber-400 to-yellow-500',
    gradient: 'from-amber-500/20 to-yellow-500/10',
    indicator: 'bg-amber-400',
  },
  {
    id: 'analyst',
    label: 'Analista',
    icon: UserCircle,
    desc: 'Pedidos, pagos, cuentas y reseñas de clientes',
    color: 'from-indigo-400 to-purple-500',
    gradient: 'from-indigo-500/20 to-purple-500/10',
    indicator: 'bg-indigo-400',
  },
  {
    id: 'stock_manager',
    label: 'Gestor de Stock',
    icon: ImageIcon,
    desc: 'Stock físico, galería de imágenes y modelos',
    color: 'from-emerald-400 to-teal-500',
    gradient: 'from-emerald-500/20 to-teal-500/10',
    indicator: 'bg-emerald-400',
  },
];

// ─── Animation easings ───
const smoothEase = [0.16, 1, 0.3, 1] as const;
const springEase = [0.34, 1.56, 0.64, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
} as const;

// ═══════════════════════════════════════════
// DARK FLUID GRADIENT BACKGROUND
// ═══════════════════════════════════════════
function FluidBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#08080e]">
      {/* Deep animated gradient layers */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse 90% 60% at 15% 20%, rgba(99,102,241,0.12) 0%, transparent 60%)',
            'radial-gradient(ellipse 70% 50% at 85% 75%, rgba(245,158,11,0.08) 0%, transparent 50%)',
            'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(16,185,129,0.05) 0%, transparent 50%)',
            'radial-gradient(ellipse 50% 70% at 70% 25%, rgba(139,92,246,0.10) 0%, transparent 50%)',
            'radial-gradient(ellipse 60% 50% at 25% 80%, rgba(245,158,11,0.06) 0%, transparent 50%)',
            'linear-gradient(145deg, #0a0a1a, #0f0f2a 30%, #1a0f1a 60%, #0f0f20 85%, #0a0a18)',
          ].join(',\n'),
          backgroundSize: '300% 300%',
        }}
        animate={{
          backgroundPosition: [
            '0% 0%',
            '30% 40%',
            '60% 20%',
            '20% 60%',
            '0% 0%',
          ],
        }}
        transition={{ duration: 35, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating gradient orbs — sutiles y profundos */}
      <motion.div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.20) 0%, transparent 65%)',
          filter: 'blur(80px)',
        }}
        animate={{ x: [0, 50, -30, 0], y: [0, -40, 30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 -right-32 w-[600px] h-[600px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 65%)',
          filter: 'blur(100px)',
        }}
        animate={{ x: [0, -40, 50, 0], y: [0, 40, -30, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 60%)',
          filter: 'blur(70px)',
        }}
        animate={{ scale: [1, 1.15, 0.9, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Subtle dots pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// GEOMETRIC EMBLEM (reemplaza el cake)
// ═══════════════════════════════════════════
function GeometricEmblem() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.7, ease: springEase }}
      className="relative mx-auto mb-4"
    >
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/20 to-indigo-500/20 blur-2xl animate-pulse" />
      {/* Main circle */}
      <div className="relative mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 shadow-2xl shadow-amber-500/10 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
          <motion.span
            className="font-serif text-transparent text-xl font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            } as React.CSSProperties}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            MR
          </motion.span>
        </div>
      </div>
      {/* Outer spinning rings */}
      <motion.div
        className="absolute -inset-3 rounded-full border border-zinc-700/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute -inset-5 rounded-full border border-dashed border-amber-500/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AdminRole>('admin');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Focus on mount
  useEffect(() => {
    setTimeout(() => passwordRef.current?.focus(), 600);
  }, []);

  // Auto-clean error
  useEffect(() => {
    if (loginError) {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = setTimeout(() => setLoginError(''), 4000);
    }
    return () => { if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current); };
  }, [loginError]);

  // ─── Login handler ───
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setLoginError('Ingresa la contraseña del panel');
      passwordRef.current?.focus();
      return;
    }
    setLoginError('');
    setIsSubmitting(true);

    const result = await dbService.adminLogin(password, selectedRole);
    setIsSubmitting(false);

    if (result.success) {
      localStorage.setItem('maison_admin_role', selectedRole);
      setIsSuccess(true);

      const roleLabels: Record<string, string> = {
        admin: 'Administrador Principal',
        analyst: 'Analista de Cuentas',
        stock_manager: 'Gestor de Stock',
      };
      showToast(
        `Sesión iniciada como ${roleLabels[selectedRole] || 'Administrador'}`,
        'success',
        '✦ Acceso Concedido'
      );

      setTimeout(() => onLoginSuccess(selectedRole), 800);
    } else {
      const errorMsg = result.error || 'Contraseña incorrecta. Inténtalo de nuevo.';
      setLoginError(errorMsg);
      passwordRef.current?.focus();
      showToast('Credenciales incorrectas.', 'error', '🔒 Acceso Denegado');
    }
  };

  // ─── Role-based colors ───
  const roleColors = selectedRole === 'admin'
    ? { accent: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'border-amber-500/30', text: 'text-amber-300' }
    : selectedRole === 'analyst'
      ? { accent: '#6366f1', bg: 'rgba(99,102,241,0.15)', border: 'border-indigo-500/30', text: 'text-indigo-300' }
      : { accent: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'border-emerald-500/30', text: 'text-emerald-300' };

  return (
    <section className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Dark Fluid Background */}
      <FluidBackground />

      {/* Subtle top-right glow */}
      <div
        className="absolute top-0 right-0 w-96 h-96 opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${roleColors.accent}22, transparent 70%)`,
          filter: 'blur(60px)',
        }}
        aria-hidden="true"
      />

      {/* Login Card */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md"
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className="relative"
        >
          {/* Card glow shadow */}
          <div
            className="absolute -inset-3 blur-3xl rounded-3xl opacity-30"
            style={{
              background: `linear-gradient(135deg, ${roleColors.accent}15, transparent 60%)`,
            }}
            aria-hidden="true"
          />

          {/* Card */}
          <div
            className="relative rounded-3xl p-8 md:p-10 shadow-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, rgba(24,24,36,0.95), rgba(16,16,26,0.98))',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: `0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)`,
            }}
          >
            {/* Top edge accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background: `linear-gradient(90deg, transparent, ${roleColors.accent}44, transparent)`,
              }}
              aria-hidden="true"
            />

            {/* Corner ambient */}
            <div
              className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-15"
              style={{
                background: `radial-gradient(circle, ${roleColors.accent}33, transparent 70%)`,
                filter: 'blur(30px)',
              }}
              aria-hidden="true"
            />

            {/* Content */}
            <div className="relative z-10 text-center space-y-5">
              {/* Emblem */}
              <GeometricEmblem />

              {/* Header */}
              <motion.div variants={containerVariants}>
                <motion.span
                  variants={containerVariants}
                  className={`inline-block px-3 py-1 rounded-full text-[9px] font-mono uppercase tracking-[0.2em] font-bold mb-2 ${roleColors.text}`}
                  style={{ backgroundColor: roleColors.bg }}
                >
                  Panel de Administración
                </motion.span>
                <motion.h2
                  variants={containerVariants}
                  className="text-[22px] md:text-2xl font-serif font-bold text-zinc-100 mt-1 leading-tight"
                >
                  Bienvenido al Taller
                </motion.h2>
                <motion.p
                  variants={containerVariants}
                  className="text-[11px] text-zinc-500 mt-2 leading-relaxed max-w-xs mx-auto font-light"
                >
                  Ingresa tus credenciales para gestionar Maison Rosas
                </motion.p>
              </motion.div>

              {/* Form */}
              <motion.form
                variants={containerVariants}
                onSubmit={handleLogin}
                className="space-y-4 text-left"
              >
                {/* Password Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-password-input"
                    className="block text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-semibold"
                  >
                    Contraseña del Panel
                  </label>
                  <div className="relative group">
                    {/* Focus glow */}
                    <div
                      className="absolute -inset-0.5 rounded-xl opacity-0 group-focus-within:opacity-100 transition-all duration-500 blur-md"
                      style={{
                        background: `linear-gradient(135deg, ${roleColors.accent}33, transparent)`,
                      }}
                      aria-hidden="true"
                    />
                    <div className="relative flex items-center">
                      <KeyRound className="absolute left-3.5 h-4 w-4 text-zinc-500 pointer-events-none" />
                      <input
                        ref={passwordRef}
                        id="admin-password-input"
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (loginError) setLoginError('');
                        }}
                        className={`w-full pl-10 pr-10 py-3 text-sm placeholder:text-zinc-600 outline-none rounded-xl transition-all duration-300 ${
                          loginError
                            ? 'border-2 border-red-500/60 bg-red-500/10 text-red-200 focus:border-red-400'
                            : 'border border-zinc-700/60 bg-zinc-800/50 text-zinc-100 focus:border-zinc-500 hover:border-zinc-600'
                        }`}
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 p-1 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Role Selector */}
                <div className="space-y-2">
                  <label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-semibold">
                    Seleccionar Rol de Acceso
                  </label>
                  <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Seleccionar rol">
                    {ROLES.map((role, i) => {
                      const Icon = role.icon;
                      const isActive = selectedRole === role.id;
                      return (
                        <motion.button
                          key={role.id}
                          custom={i}
                          initial={{ opacity: 0, x: -15 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: 0.4 + i * 0.1, ease: smoothEase }}
                          whileHover={{ scale: 1.01, x: 3 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          onClick={() => {
                            setSelectedRole(role.id);
                            setLoginError('');
                            passwordRef.current?.focus();
                          }}
                          className={`relative flex items-center gap-3.5 px-4 py-3 rounded-2xl text-left text-xs transition-all duration-300 cursor-pointer border overflow-hidden group ${
                            isActive
                              ? 'shadow-lg'
                              : 'border-transparent hover:border-zinc-700/50'
                          }`}
                          style={{
                            backgroundColor: isActive
                              ? `${roleColors.accent}15`
                              : 'rgba(255,255,255,0.03)',
                            borderColor: isActive
                              ? `${roleColors.accent}33`
                              : 'transparent',
                          }}
                        >
                          {/* Active indicator bar */}
                          <motion.div
                            layoutId="activeRoleBar"
                            className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${role.indicator}`}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          />

                          {/* Icon container */}
                          <div
                            className={`relative p-2 rounded-xl transition-all duration-300 ${
                              isActive
                                ? `bg-gradient-to-br ${role.gradient}`
                                : 'bg-zinc-800/50 group-hover:bg-zinc-700/50'
                            }`}
                          >
                            <Icon className={`h-4 w-4 transition-colors duration-300 ${
                              isActive ? roleColors.text : 'text-zinc-500 group-hover:text-zinc-300'
                            }`} />
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <span className={`block text-[12px] font-semibold transition-colors ${
                              isActive ? 'text-zinc-100' : 'text-zinc-400 group-hover:text-zinc-200'
                            }`}>
                              {role.label}
                            </span>
                            <span className="block text-[9px] text-zinc-500 truncate mt-0.5">
                              {role.desc}
                            </span>
                          </div>

                          {/* Checkmark */}
                          <motion.div
                            initial={false}
                            animate={{
                              scale: isActive ? 1 : 0,
                              opacity: isActive ? 1 : 0,
                            }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            className={`p-1 rounded-full ${role.indicator}`}
                          >
                            <Check className="h-3 w-3 text-white" />
                          </motion.div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence mode="wait">
                  {loginError && (
                    <motion.p
                      key="login-error"
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' } as Transition}
                      className="text-[11px] text-red-400 font-medium flex items-center gap-1.5"
                      id="login-error-msg"
                    >
                      <span className="w-1 h-1 rounded-full bg-red-400 inline-block" />
                      {loginError}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isSubmitting || isSuccess}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.7, ease: smoothEase }}
                  className={`relative w-full py-3.5 rounded-2xl text-xs font-mono font-bold uppercase tracking-[0.15em] transition-all duration-500 cursor-pointer overflow-hidden group ${
                    isSuccess
                      ? 'text-white'
                      : isSubmitting
                        ? 'text-zinc-500'
                        : 'text-white hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                  id="admin-login-submit"
                  style={!isSuccess && !isSubmitting ? {
                    background: `linear-gradient(135deg, ${roleColors.accent}, ${roleColors.accent}dd)`,
                    boxShadow: `0 4px 24px ${roleColors.accent}33, 0 2px 8px ${roleColors.accent}22`,
                  } : isSuccess ? {
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    boxShadow: '0 4px 24px rgba(16,185,129,0.3)',
                  } : {
                    background: 'rgba(255,255,255,0.05)',
                  }}
                >
                  {/* Shimmer */}
                  {!isSubmitting && !isSuccess && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]"
                      animate={{ x: ['-150%', '200%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                    />
                  )}

                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <motion.span
                          className="inline-block w-3.5 h-3.5 rounded-full border-2 border-zinc-500/30 border-t-zinc-300"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                        />
                        <span>Verificando credenciales</span>
                      </>
                    ) : isSuccess ? (
                      <>
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        >
                          <Check className="h-4 w-4" />
                        </motion.span>
                        <span>Acceso autorizado</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                        <span>Ingresar al Panel</span>
                        <Sparkles className="h-3 w-3 opacity-40 group-hover:opacity-80 transition-opacity" />
                      </>
                    )}
                  </span>
                </motion.button>
              </motion.form>

              {/* Footer */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-[9px] text-zinc-600 font-mono tracking-wider"
              >
                &copy; {new Date().getFullYear()} Maison Rosas &mdash; Pasteler&iacute;a de Autor
              </motion.p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Toaster */}
      <Toaster position="top-right" toastOptions={{ duration: 4500 }} />
    </section>
  );
}
