import React, { useState, useEffect } from 'react';
import { Cake } from 'lucide-react';
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
  const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');

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
      setLogoUrl(config.logoUrl || '');
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
      logoUrl
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
        Ajustes Comerciales de Maison Rosas
      </h3>

      {/* Logo */}
      <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-150 dark:border-zinc-800/60 mb-6" id="logo-customizer-section">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-500 mb-3 flex items-center gap-1.5">
          <Cake className="h-4 w-4" />
          Logo de la Marca
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
            <span className="block text-[10px] font-mono uppercase text-zinc-400">Personalizar Ícono / Logo de la Tienda</span>
            <ImageUploader value={logoUrl} onChange={(val) => setLogoUrl(val)} placeholder="URL de tu logo o sube uno" />
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

        <div className="flex pt-4">
          <button type="submit"
            className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-sm transition-all duration-300 hover:scale-[1.02] cursor-pointer">
            Guardar Configuración
          </button>
        </div>
      </form>
    </div>
  );
}
