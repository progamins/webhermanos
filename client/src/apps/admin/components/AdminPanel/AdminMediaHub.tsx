import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Palette, Image as ImageIcon, Cake, HardDrive, Save, X, Trash2,
  Upload, Check, Loader2, Package, Sparkles
} from 'lucide-react';
import type { Product, GalleryItem, AppConfig } from '../../../../shared/types';
import { dbService } from '../../../../shared/services/dbService';
import { showToast } from '../../../../shared/utils/toast';
import ImageUploader from './ImageUploader';
import MultiImageUploader from './MultiImageUploader';
import AdminGallery from './AdminGallery';
import AdminImageManager from './AdminImageManager';
import { optimizeImageUrl } from '../../../../shared/utils/images';

type MediaTab = 'identity' | 'covers' | 'products' | 'storage';

interface AdminMediaHubProps {
  products: Product[];
  galleryItems: GalleryItem[];
  config: AppConfig;
  onRefreshData: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
}

const MEDIA_TABS: { id: MediaTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'identity', label: 'Logo e Icono', icon: Palette, desc: 'Marca de la tienda' },
  { id: 'covers', label: 'Portadas y Galería', icon: ImageIcon, desc: 'Hero, historia y creaciones' },
  { id: 'products', label: 'Imágenes de Modelos', icon: Cake, desc: 'Fotos de cada pastel' },
  { id: 'storage', label: 'Almacenamiento', icon: HardDrive, desc: 'Archivos y herramientas' },
];

export default function AdminMediaHub({ products, galleryItems, config, onRefreshData, showToast: _toast }: AdminMediaHubProps) {
  const [activeTab, setActiveTab] = useState<MediaTab>('identity');

  // ── Identidad (logo + favicon) ──
  const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(config.faviconUrl || '');
  const [savingIdentity, setSavingIdentity] = useState(false);

  useEffect(() => {
    setLogoUrl(config.logoUrl || '');
    setFaviconUrl(config.faviconUrl || '');
  }, [config]);

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingIdentity(true);
    try {
      const newConfig: AppConfig = { ...config, logoUrl, faviconUrl };
      await dbService.saveConfig(newConfig);
      onRefreshData();
      _toast('Logo e ícono actualizados correctamente.', 'success', '🎨 Identidad');
    } catch {
      _toast('Ocurrió un error al guardar la identidad.', 'error', 'Error');
    } finally {
      setSavingIdentity(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/85 shadow-sm">
        <div className="flex items-center space-x-2 text-brand-500 font-mono text-[10px] font-bold uppercase tracking-wider mb-2">
          <ImageIcon className="h-4 w-4" />
          <span>Centro de Medios Unificado</span>
        </div>
        <h3 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">
          Gestión de Imágenes
        </h3>
        <p className="text-xs text-zinc-500 mt-1.5 font-sans leading-relaxed max-w-2xl">
          Todo lo visual de tu tienda en un solo lugar: logo, ícono, portadas, galería,
          fotos de los modelos y almacenamiento de archivos.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2">
        {MEDIA_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                isActive
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border-zinc-100 dark:border-zinc-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB: IDENTIDAD (Logo + Favicon) ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'identity' && (
          <motion.div
            key="identity"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm max-w-3xl"
          >
            <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-500 mb-2 flex items-center">
              <Palette className="h-4 w-4 mr-2" />
              Identidad de la Tienda
            </h4>
            <p className="text-xs text-zinc-500 mb-6 font-sans">
              El logo aparece en el menú de navegación y el ícono (favicon) en la pestaña del navegador.
            </p>

            <form onSubmit={handleSaveIdentity} className="space-y-6">
              {/* Logo */}
              <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800" id="logo-customizer-section">
                <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  Logo
                </h5>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center justify-center bg-white dark:bg-zinc-900 h-14 w-14 rounded-full overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-brand-500" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="block text-[10px] font-mono uppercase text-zinc-400">Logo de la marca</span>
                    <ImageUploader value={logoUrl} onChange={setLogoUrl} placeholder="URL de tu logo o sube uno" />
                  </div>
                </div>
              </div>

              {/* Favicon */}
              <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800" id="favicon-customizer-section">
                <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Ícono (Favicon)
                </h5>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center justify-center bg-white dark:bg-zinc-900 h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    {faviconUrl ? (
                      <img src={faviconUrl} alt="Favicon Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">🧁</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="block text-[10px] font-mono uppercase text-zinc-400">Ícono de la pestaña del navegador</span>
                    <ImageUploader value={faviconUrl} onChange={setFaviconUrl} placeholder="URL de tu favicon (ico, png, svg) o sube uno" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={savingIdentity}
                  className="px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-sm transition-all duration-300 hover:scale-[1.02] cursor-pointer flex items-center space-x-2">
                  {savingIdentity ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{savingIdentity ? 'Guardando...' : 'Guardar Logo e Ícono'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ── TAB: PORTADAS Y GALERÍA ── */}
        {activeTab === 'covers' && (
          <motion.div key="covers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <AdminGallery galleryItems={galleryItems} config={config} onRefreshData={onRefreshData} showToast={_toast} />
          </motion.div>
        )}

        {/* ── TAB: IMÁGENES DE MODELOS ── */}
        {activeTab === 'products' && (
          <motion.div key="products" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <ProductImageManager products={products} onRefreshData={onRefreshData} showToast={_toast} />
          </motion.div>
        )}

        {/* ── TAB: ALMACENAMIENTO ── */}
        {activeTab === 'storage' && (
          <motion.div key="storage" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <AdminImageManager />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ProductImageManager — imágenes de cada modelo
   ═══════════════════════════════════════════════ */
function ProductImageManager({ products, onRefreshData, showToast }: {
  products: Product[];
  onRefreshData: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
}) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const startEdit = (prod: Product) => {
    setEditing(prod);
    setImages(prod.images && prod.images.length > 0 ? prod.images : []);
  };

  const cancelEdit = () => {
    setEditing(null);
    setImages([]);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const cleaned = images.filter(u => u.trim());
    try {
      await dbService.saveProduct({ ...editing, images: cleaned });
      onRefreshData();
      showToast(`Imágenes de "${editing.name}" actualizadas.`, 'success', '📸 Modelo');
      cancelEdit();
    } catch {
      showToast('Error al guardar las imágenes del modelo.', 'error', 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-500">Editando imágenes</span>
            <h4 className="text-xl font-serif font-bold text-zinc-900 dark:text-white">{editing.name}</h4>
            <p className="text-[10px] text-zinc-400 mt-0.5">S/. {editing.basePrice} · {editing.category}</p>
          </div>
          <button onClick={cancelEdit} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer">
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>

        {/* Grid de imágenes actuales */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold">
              Imágenes ({images.filter(u => u.trim()).length})
            </span>
            <span className="text-[9px] font-mono text-zinc-400">La primera es la portada</span>
          </div>

          {images.some(u => u.trim()) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.filter(u => u.trim()).map((url, idx) => (
                <div key={`img-${idx}`} className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 shadow-sm">
                  <img src={url} alt={`Imagen ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  {idx === 0 && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-brand-500/90 backdrop-blur-sm rounded-md shadow-sm">
                      <span className="text-[7px] font-mono font-bold text-white uppercase tracking-wider">★ Portada</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                    <button type="button" onClick={() => setImages(prev => prev.filter(u => u !== url))}
                      className="p-1.5 bg-white/95 hover:bg-red-50 rounded-lg transition-all cursor-pointer shadow-sm" title="Eliminar imagen">
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                    {idx > 0 && (
                      <button type="button" onClick={() => {
                        const cur = images.filter(u => u.trim());
                        [cur[0], cur[idx]] = [cur[idx], cur[0]];
                        setImages(cur);
                      }}
                        className="p-1.5 bg-white/95 hover:bg-brand-50 rounded-lg transition-all cursor-pointer shadow-sm" title="Poner como portada">
                        <Upload className="h-3.5 w-3.5 text-brand-500 -rotate-90" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Subida múltiple */}
          <MultiImageUploader onUpload={(urls) => {
            setImages(prev => [...prev.filter(u => u.trim()), ...urls]);
          }} />

          {/* Agregar desde URL */}
          <button type="button" onClick={() => setImages(prev => [...prev.filter(u => u.trim()), ''])}
            className="w-full py-2.5 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-mono text-zinc-400 hover:border-brand-300 hover:text-brand-500 transition-all cursor-pointer flex items-center justify-center space-x-1.5">
            <Upload className="h-3.5 w-3.5" />
            <span>+ Agregar desde URL o Galería</span>
          </button>

          {images.some(u => u.trim()) && (
            <div className="space-y-2">
              {images.map((url, idx) => (
                url.trim() ? null : (
                  <div key={`empty-${idx}`} className="flex items-center gap-2">
                    <div className="flex-1">
                      <ImageUploader value="" onChange={(val) => {
                        const next = [...images];
                        next[idx] = val;
                        setImages(next);
                      }} placeholder={`URL de imagen nueva...`} />
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button onClick={cancelEdit}
            className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 hover:bg-zinc-50 cursor-pointer">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider cursor-pointer flex items-center space-x-2">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            <span>Guardar Imágenes</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm">
      <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-500 mb-2 flex items-center">
        <Cake className="h-4 w-4 mr-2" />
        Imágenes de los Modelos ({products.length})
      </h4>
      <p className="text-xs text-zinc-500 mb-6 font-sans">
        Selecciona un modelo para gestionar sus fotos: sube varias a la vez, cambia la portada o elimina imágenes.
      </p>

      {products.length === 0 ? (
        <div className="text-center py-16 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
          <Package className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">No hay modelos en el catálogo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(prod => (
            <button key={prod.id} onClick={() => startEdit(prod)}
              className="group bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 text-left transition-all hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    {prod.images && prod.images[0] ? (
                      <img src={optimizeImageUrl(prod.images[0], 200)} alt={prod.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-300">
                        <Package className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  {prod.images && prod.images.length > 1 && (
                    <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-[8px] font-mono font-bold px-1 rounded-full shadow-sm border border-white">
                      {prod.images.length}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-mono font-bold text-brand-600 dark:text-brand-400 uppercase">{prod.category}</span>
                  <h5 className="font-serif font-bold text-sm text-zinc-900 dark:text-white truncate">{prod.name}</h5>
                  <span className="text-[10px] font-mono text-zinc-400">{prod.images?.length || 0} imagen(es)</span>
                </div>
                <Upload className="h-4 w-4 text-zinc-300 group-hover:text-brand-500 group-hover:-rotate-90 transition-all shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}