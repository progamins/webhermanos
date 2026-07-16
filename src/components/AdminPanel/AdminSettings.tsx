import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Cake, Globe, Wrench, ToggleLeft, ToggleRight, Clock, Eye, X, Edit3, Shield, Key, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { AppConfig } from '../../types';
import { dbService } from '../../dbService';
import ImageUploader from './ImageUploader';

interface AdminSettingsProps {
  config: AppConfig;
  onRefreshData: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
}

export default function AdminSettings({ config, onRefreshData, showToast }: AdminSettingsProps) {
  const [setWhatsapp, setSetWhatsapp] = useState(config.whatsappNumber);
  const [setFb, setSetFb] = useState(config.facebookUrl);
  const [setIg, setSetIg] = useState(config.instagramUrl);
  const [setEmail, setSetEmail] = useState(config.email);
  const [setAddress, setSetAddress] = useState(config.address);
  const [setHours, setSetHours] = useState(config.openingHours);
  const [setSeoTitle, setSetSeoTitle] = useState(config.seoTitle);
  const [setSeoDesc, setSetSeoDesc] = useState(config.seoDescription);
  const [setMaintenance, setSetMaintenance] = useState(config.maintenanceMode || false);
  const [maintenanceEndTime, setMaintenanceEndTime] = useState(config.maintenanceEndTime || '');
  const [maintenanceTitle, setMaintenanceTitle] = useState(config.maintenanceTitle || 'Volveremos muy pronto');
  const [maintenanceDescription, setMaintenanceDescription] = useState(config.maintenanceDescription || '');
  const [maintenanceBadge, setMaintenanceBadge] = useState(config.maintenanceBadge || 'En mantenimiento');
  const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(config.faviconUrl || '');
  const [showPreview, setShowPreview] = useState(false);
  // Role password management
  const [analystPassword, setAnalystPassword] = useState('');
  const [stockManagerPassword, setStockManagerPassword] = useState('');
  const [rolePasswordsConfigured, setRolePasswordsConfigured] = useState({ analyst: false, stock_manager: false });
  const [credentialsEmailed, setCredentialsEmailed] = useState(false);
  const [sendingCredentials, setSendingCredentials] = useState(false);

  // Load role passwords status
  useEffect(() => {
    const loadRoleStatus = async () => {
      try {
        const res = await dbService.getRolePasswordsStatus();
        if (res.success && res.roles) {
          setRolePasswordsConfigured({
            analyst: res.roles.analyst || false,
            stock_manager: res.roles.stock_manager || false
          });
          setCredentialsEmailed(res.credentials_emailed || false);
        }
      } catch {}
    };
    loadRoleStatus();
  }, []);

  useEffect(() => {
    if (config) {
      setSetWhatsapp(config.whatsappNumber);
      setSetFb(config.facebookUrl);
      setSetIg(config.instagramUrl);
      setSetEmail(config.email);
      setSetAddress(config.address);
      setSetHours(config.openingHours);
      setSetSeoTitle(config.seoTitle);
      setSetSeoDesc(config.seoDescription);
      setSetMaintenance(config.maintenanceMode || false);
      setMaintenanceEndTime(config.maintenanceEndTime || '');
      setMaintenanceTitle(config.maintenanceTitle || 'Volveremos muy pronto');
      setMaintenanceDescription(config.maintenanceDescription || '');
      setMaintenanceBadge(config.maintenanceBadge || 'En mantenimiento');
      setLogoUrl(config.logoUrl || '');
      setFaviconUrl(config.faviconUrl || '');
    }
  }, [config]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: AppConfig = {
      ...config,
      whatsappNumber: setWhatsapp,
      facebookUrl: setFb,
      instagramUrl: setIg,
      email: setEmail,
      address: setAddress,
      openingHours: setHours,
      seoTitle: setSeoTitle,
      seoDescription: setSeoDesc,
      maintenanceMode: setMaintenance,
      maintenanceEndTime,
      maintenanceTitle,
      maintenanceDescription,
      maintenanceBadge,
      logoUrl,
      faviconUrl
    };
    try {
      await dbService.saveConfig(newConfig);
      onRefreshData();
      showToast('Configuración del negocio actualizada en tiempo real.', 'success', 'Ajustes guardados');
    } catch {
      showToast('Ocurrió un error al guardar los ajustes.', 'error', 'Error');
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm max-w-2xl mx-auto">
      <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-white mb-6">
        Configuración de la Tienda
      </h3>

      {/* Logo */}
      <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-150 dark:border-zinc-800/60 mb-6" id="logo-customizer-section">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-500 mb-3 flex items-center gap-1.5">
          <Cake className="h-4 w-4" />
          Logo
        </h4>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center justify-center bg-white dark:bg-zinc-900 h-14 w-14 rounded-full overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <Cake className="h-6 w-6 text-brand-500" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <span className="block text-[10px] font-mono uppercase text-zinc-400">            Personalizar Logo</span>
            <ImageUploader value={logoUrl} onChange={(val) => setLogoUrl(val)} placeholder="URL de tu logo o sube uno" />
          </div>
        </div>
      </div>

      {/* Favicon */}
      <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-150 dark:border-zinc-800/60 mb-6" id="favicon-customizer-section">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-500 mb-3 flex items-center gap-1.5">
          <Globe className="h-4 w-4" />
          Favicon
        </h4>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center justify-center bg-white dark:bg-zinc-900 h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800">
            {faviconUrl ? (
              <img src={faviconUrl} alt="Favicon Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg">🧁</span>
            )}
          </div>
          <div className="flex-1 space-y-1">
            <span className="block text-[10px] font-mono uppercase text-zinc-400">            Ícono de la pestaña del navegador</span>
            <ImageUploader value={faviconUrl} onChange={(val) => setFaviconUrl(val)} placeholder="URL de tu favicon (ico, png, svg) o sube uno" />
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveConfig} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Número de WhatsApp de Edwin</label>
            <input type="text" required value={setWhatsapp} onChange={(e) => setSetWhatsapp(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Correo de Negocio</label>
            <input type="email" required value={setEmail} onChange={(e) => setSetEmail(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Dirección del Taller Familiar</label>
          <input type="text" required value={setAddress} onChange={(e) => setSetAddress(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Horarios de Atención</label>
          <input type="text" required value={setHours} onChange={(e) => setSetHours(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Facebook URL</label>
            <input type="text" value={setFb} onChange={(e) => setSetFb(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Instagram URL</label>
            <input type="text" value={setIg} onChange={(e) => setSetIg(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">SEO Título</label>
            <input type="text" value={setSeoTitle} onChange={(e) => setSetSeoTitle(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">SEO Descripción</label>
            <input type="text" value={setSeoDesc} onChange={(e) => setSetSeoDesc(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
          </div>
        </div>

        {/* Maintenance Mode Toggle */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 mt-6">
          <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 dark:bg-amber-950/30 rounded-lg">
                  <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-serif font-bold text-zinc-900 dark:text-white">Modo Mantenimiento</h4>
                  <p className="text-[10px] text-zinc-500 font-sans">Activa esta opción para mostrar una pantalla de mantenimiento a los visitantes. Solo los administradores podrán acceder al panel.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSetMaintenance(!setMaintenance)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  setMaintenance
                    ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'
                }`}
              >
                {setMaintenance ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                <span>{setMaintenance ? 'Activado' : 'Desactivado'}</span>
              </button>
            </div>
            {setMaintenance && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-100/80 dark:bg-amber-950/20 rounded-xl text-[10px] text-amber-800 dark:text-amber-300 font-mono">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>La web está actualmente en modo mantenimiento.</span>
                </div>

                {/* Customizable Message */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-brand-50 dark:bg-brand-950/30 rounded-lg shrink-0">
                      <Edit3 className="h-4 w-4 text-brand-500" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1 font-semibold">Personalizar mensaje de mantenimiento</label>
                        <p className="text-[10px] text-zinc-400 font-sans">Edita el título, descripción y badge que verán tus clientes en la pantalla de mantenimiento.</p>
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Badge</label>
                        <input
                          type="text"
                          value={maintenanceBadge}
                          onChange={(e) => setMaintenanceBadge(e.target.value)}
                          placeholder="En mantenimiento"
                          className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Título</label>
                        <input
                          type="text"
                          value={maintenanceTitle}
                          onChange={(e) => setMaintenanceTitle(e.target.value)}
                          placeholder="Volveremos muy pronto"
                          className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Descripción</label>
                        <textarea
                          value={maintenanceDescription}
                          onChange={(e) => setMaintenanceDescription(e.target.value)}
                          placeholder="Estamos horneando nuevas sorpresas para ti..."
                          rows={3}
                          className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-white resize-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPreview(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg text-[10px] font-mono font-semibold text-brand-700 uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Vista previa
                      </button>
                    </div>
                  </div>
                </div>

                {/* Countdown End Time Picker */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-brand-50 dark:bg-brand-950/30 rounded-lg shrink-0">
                      <Clock className="h-4 w-4 text-brand-500" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1 font-semibold">Cuenta regresiva — ¿Cuándo volvemos?</label>
                        <p className="text-[10px] text-zinc-400 font-sans mb-2">Los clientes verán un contador animado con el tiempo restante hasta que finalice el mantenimiento.</p>
                      </div>
                      <input
                        type="datetime-local"
                        value={maintenanceEndTime ? maintenanceEndTime.substring(0, 16) : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            setMaintenanceEndTime(new Date(val).toISOString());
                          } else {
                            setMaintenanceEndTime('');
                          }
                        }}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-white font-mono"
                      />
                      {maintenanceEndTime && (
                        <p className="text-[10px] text-zinc-400 font-mono">
                          Fin: {new Date(maintenanceEndTime).toLocaleString('es-PE', {
                            dateStyle: 'long',
                            timeStyle: 'short'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Role Password Management - Solo Administrador */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 mt-6">
          <div className="bg-brand-50/30 dark:bg-brand-950/10 border border-brand-200/60 dark:border-brand-900/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-brand-100 dark:bg-brand-950/30 rounded-lg">
                <Shield className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h4 className="text-sm font-serif font-bold text-zinc-900 dark:text-white">Gestión de Roles y Accesos</h4>
                <p className="text-[10px] text-zinc-500 font-sans">Configura contraseñas específicas para cada rol del panel de administración.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Admin Master Password */}
              <div className="bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/30 rounded-xl p-4 ring-1 ring-rose-100 dark:ring-rose-900/20">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-rose-100 dark:bg-rose-950/30 rounded-lg shrink-0">
                    <Shield className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300">🛡️ Administrador — Contraseña Maestra</label>
                      <p className="text-[9px] text-zinc-400">Cambia la contraseña principal del panel. Mínimo 6 caracteres.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="password"
                        id="admin-current-password"
                        placeholder="Contraseña actual"
                        className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-white font-mono"
                      />
                      <input
                        type="password"
                        id="admin-new-password"
                        placeholder="Nueva contraseña"
                        className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-white font-mono"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const currentPw = (document.getElementById('admin-current-password') as HTMLInputElement)?.value;
                          const newPw = (document.getElementById('admin-new-password') as HTMLInputElement)?.value;
                          if (!currentPw || !newPw) {
                            showToast('Completa ambos campos: contraseña actual y nueva.', 'warning', 'Campos requeridos');
                            return;
                          }
                          if (newPw.length < 6) {
                            showToast('La nueva contraseña debe tener al menos 6 caracteres.', 'warning', 'Muy corta');
                            return;
                          }
                          try {
                            const res = await dbService.changeAdminPassword(currentPw, newPw);
                            if (res.success) {
                              showToast('Contraseña maestra cambiada con éxito.', 'success', '🔑 Contraseña actualizada');
                              (document.getElementById('admin-current-password') as HTMLInputElement).value = '';
                              (document.getElementById('admin-new-password') as HTMLInputElement).value = '';
                            } else {
                              showToast(res.error || 'Error al cambiar la contraseña.', 'error', 'Error');
                            }
                          } catch {
                            showToast('Error de conexión con el servidor.', 'error', 'Error');
                          }
                        }}
                        className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all hover:scale-[1.02] whitespace-nowrap cursor-pointer"
                      >
                        <Shield className="h-3 w-3 inline mr-1 -mt-0.5" />
                        Cambiar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analyst Password */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-950/30 rounded-lg shrink-0">
                    <Key className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300">👤 Analista</label>
                        <p className="text-[9px] text-zinc-400">Acceso a pedidos, pagos y opiniones</p>
                      </div>
                      {rolePasswordsConfigured.analyst && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[8px] font-mono font-bold uppercase">
                          <CheckCircle className="h-2.5 w-2.5" />
                          Configurada
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={analystPassword}
                      onChange={(e) => setAnalystPassword(e.target.value)}
                      placeholder={rolePasswordsConfigured.analyst ? '•••••••• (dejar vacío para mantener)' : 'Nueva contraseña para el analista'}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-white font-mono"
                      minLength={4}
                    />
                  </div>
                </div>
              </div>

              {/* Stock Manager Password */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/30 rounded-lg shrink-0">
                    <Key className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300">🖼️ Gestor de Stock</label>
                        <p className="text-[9px] text-zinc-400">Acceso a stock físico y galería</p>
                      </div>
                      {rolePasswordsConfigured.stock_manager && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[8px] font-mono font-bold uppercase">
                          <CheckCircle className="h-2.5 w-2.5" />
                          Configurada
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={stockManagerPassword}
                      onChange={(e) => setStockManagerPassword(e.target.value)}
                      placeholder={rolePasswordsConfigured.stock_manager ? '•••••••• (dejar vacío para mantener)' : 'Nueva contraseña para el gestor de stock'}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-white font-mono"
                      minLength={4}
                    />
                  </div>
                </div>
              </div>

              {/* Save Role Passwords */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!analystPassword && !stockManagerPassword) {
                      showToast('Ingresa al menos una contraseña para actualizar.', 'warning', 'Campos vacíos');
                      return;
                    }
                    try {
                      const res = await dbService.saveRolePasswords(analystPassword, stockManagerPassword);
                      if (res.success) {
                        showToast('Contraseñas de roles actualizadas correctamente.', 'success', 'Roles guardados');
                        setAnalystPassword('');
                        setStockManagerPassword('');
                        // Reload status
                        const statusRes = await dbService.getRolePasswordsStatus();
                        if (statusRes.success && statusRes.roles) {
                          setRolePasswordsConfigured({
                            analyst: statusRes.roles.analyst || false,
                            stock_manager: statusRes.roles.stock_manager || false
                          });
                        }
                      } else {
                        showToast(res.error || 'Error al guardar.', 'error', 'Error');
                      }
                    } catch {
                      showToast('Error de conexión con el servidor.', 'error', 'Error');
                    }
                  }}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Key className="h-3 w-3 inline mr-1 -mt-0.5" />
                  Guardar Contraseñas de Roles
                </button>

                {/* Send Credentials Email (one-time) */}
                <button
                  type="button"
                  onClick={async () => {
                    setSendingCredentials(true);
                    try {
                      const res = await dbService.sendCredentialsEmail();
                      if (res.success) {
                        if (res.alreadySent) {
                          showToast('Las credenciales ya fueron enviadas anteriormente.', 'info', 'Ya enviado');
                        } else {
                          showToast('Credenciales enviadas al correo del administrador.', 'success', '✅ Enviado');
                          setCredentialsEmailed(true);
                        }
                      } else {
                        showToast(res.error || 'Error al enviar.', 'error', 'Error');
                      }
                    } catch {
                      showToast('Error de conexión.', 'error', 'Error');
                    }
                    setSendingCredentials(false);
                  }}
                  disabled={sendingCredentials}
                  className={`px-4 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    credentialsEmailed
                      ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  {credentialsEmailed ? (
                    <><CheckCircle className="h-3 w-3" /> Credenciales enviadas</>
                  ) : (
                    <><Send className="h-3 w-3" /> {sendingCredentials ? 'Enviando...' : 'Enviar credenciales por correo (1 vez)'}</>
                  )}
                </button>
              </div>

              {credentialsEmailed && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl text-[10px] text-emerald-700 dark:text-emerald-300 font-mono">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Las credenciales ya fueron enviadas al correo del administrador. Si necesitas reenviarlas, contacta a soporte.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex pt-4">
          <button type="submit"
            className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-sm transition-all duration-300 hover:scale-[1.02] cursor-pointer">
            Guardar Configuración
          </button>
        </div>
      </form>

      {/* Live Preview Modal for Maintenance Screen - rendered via portal to stay above the navbar */}
      {showPreview && createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#FFF9F5] via-white to-[#FFF9F5] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowPreview(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-md hover:bg-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4 text-zinc-600" />
              </button>

              {/* Preview badge */}
              <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-brand-500/90 backdrop-blur-sm rounded-full text-[9px] font-mono font-bold text-white uppercase tracking-wider shadow-lg">
                <Eye className="h-3 w-3 inline mr-1 -mt-0.5" />
                Vista previa
              </div>

              {/* Render maintenance preview content — faithful to production */}
              <div className="min-h-[500px] flex items-center justify-center p-8 overflow-hidden">
                <div className="max-w-lg w-full text-center space-y-5">
                  {/* Lottie 3D Cake Animation */}
                  <div className="relative flex justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.08, 0.15] }}
                      transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                      className="absolute w-60 h-60 rounded-full bg-brand-200/40 blur-3xl"
                    />
                    <div className="w-52 h-52 relative">
                      <DotLottieReact
                        src="/cake.lottie"
                        autoplay
                        loop
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Badge */}
                    <span className="inline-block px-4 py-1.5 bg-brand-50 border border-brand-200 rounded-full text-[10px] font-mono font-semibold text-brand-700 tracking-[0.2em] uppercase">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-2 align-middle" />
                      {maintenanceBadge || 'En mantenimiento'}
                    </span>

                    <h2 className="font-serif text-3xl sm:text-4xl font-bold text-zinc-900 leading-tight">
                      {maintenanceTitle || 'Volveremos muy pronto'}
                    </h2>

                    <p className="text-sm sm:text-base text-zinc-500 leading-relaxed font-sans max-w-sm mx-auto">
                      {maintenanceDescription || 'Estamos horneando nuevas sorpresas para ti. Mientras tanto, todos tus pedidos y operaciones continúan activos. No tienes nada de qué preocuparte.'}
                    </p>

                    {/* Countdown Timer Preview */}
                    {maintenanceEndTime && new Date(maintenanceEndTime).getTime() > Date.now() && (
                      <div className="flex items-center justify-center gap-3">
                        {(() => {
                          const diff = Math.max(0, new Date(maintenanceEndTime).getTime() - Date.now());
                          const previewCountdown = {
                            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                            hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                            minutes: Math.floor((diff / (1000 * 60)) % 60),
                            seconds: Math.floor((diff / 1000) % 60),
                          };
                          return [
                            { label: 'Días', value: previewCountdown.days },
                            { label: 'Horas', value: previewCountdown.hours },
                            { label: 'Min', value: previewCountdown.minutes },
                            { label: 'Seg', value: previewCountdown.seconds },
                          ].map((unit, i, arr) => (
                            <div key={unit.label} className="flex items-center gap-3">
                              <div className="text-center">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/80 backdrop-blur-sm border border-brand-100 rounded-2xl flex items-center justify-center shadow-sm">
                                  <span className="font-mono text-lg sm:text-xl font-bold text-brand-700 tabular-nums">
                                    {String(unit.value).padStart(2, '0')}
                                  </span>
                                </div>
                                <span className="block text-[9px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mt-1">
                                  {unit.label}
                                </span>
                              </div>
                              {i < arr.length - 1 && <span className="text-lg font-mono font-bold text-brand-300 -mt-5">:</span>}
                            </div>
                          ));
                        })()}
                      </div>
                    )}

                    {/* Reassurance cards */}
                    <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                      <div className="bg-white/70 backdrop-blur-sm border border-brand-100 rounded-xl p-3 text-center">
                        <span className="block text-lg mb-0.5">✅</span>
                        <span className="text-[10px] font-mono font-semibold text-zinc-600 uppercase tracking-wide">Pedidos guardados</span>
                      </div>
                      <div className="bg-white/70 backdrop-blur-sm border border-brand-100 rounded-xl p-3 text-center">
                        <span className="block text-lg mb-0.5">🔄</span>
                        <span className="text-[10px] font-mono font-semibold text-zinc-600 uppercase tracking-wide">Operaciones activas</span>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="text-xs text-zinc-400 font-sans">
                      <p>📧 {setEmail || config.email}</p>
                      <p>📱 {setWhatsapp ? `+${setWhatsapp}` : config.whatsappNumber}</p>
                    </div>

                    {/* Social Media Buttons — identical to production */}
                    <div className="flex items-center justify-center gap-3">
                      {/* Facebook */}
                      <a
                        href={setFb || config.facebookUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        <span>Facebook</span>
                      </a>
                      {/* Instagram */}
                      <a
                        href={setIg || config.instagramUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#515bd4] hover:opacity-90 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                        <span>Instagram</span>
                      </a>
                      {/* WhatsApp */}
                      <a
                        href={`https://wa.me/${setWhatsapp || '51902568187'}?text=Hola%20Carol%20y%20Edwin%2C%20quiero%20hacer%20un%20pedido`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-400 font-serif italic">
                    — Con amor, Carol & Edwin Rosas Albines
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>,
        document.body
      )}
    </div>
  );
}
