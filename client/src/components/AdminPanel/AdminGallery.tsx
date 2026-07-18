import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Image, Plus, Edit3, Trash2, X, Sparkles } from 'lucide-react';
import { GalleryItem, AppConfig } from '../../types';
import { dbService } from '../../dbService';
import ImageUploader from './ImageUploader';
import { optimizeImageUrl } from '../../utils/images';

interface AdminGalleryProps {
  galleryItems: GalleryItem[];
  config: AppConfig;
  onRefreshData: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
}

export default function AdminGallery({ galleryItems, config, onRefreshData, showToast }: AdminGalleryProps) {
  // Gallery Management
  const [newGalleryTitle, setNewGalleryTitle] = useState('');
  const [newGalleryCategory, setNewGalleryCategory] = useState('Bodas');
  const [newGalleryDate, setNewGalleryDate] = useState(new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }));
  const [newGalleryImageUrl, setNewGalleryImageUrl] = useState('');
  const [newGalleryDescription, setNewGalleryDescription] = useState('');
  const [isSavingGallery, setIsSavingGallery] = useState(false);
  const [editingGalleryItem, setEditingGalleryItem] = useState<GalleryItem | null>(null);

  // Cover Image settings (Hero & About)
  const [heroImage, setHeroImage] = useState(config.heroImage || '');
  const [aboutImage, setAboutImage] = useState(config.aboutImage || '');
  const [heroTitle, setHeroTitle] = useState(config.heroTitle || '');
  const [heroDescription, setHeroDescription] = useState(config.heroDescription || '');
  const [heroBadge, setHeroBadge] = useState(config.heroBadge || '');
  const [aboutTitle, setAboutTitle] = useState(config.aboutTitle || '');
  const [aboutDescription, setAboutDescription] = useState(config.aboutDescription || '');

  useEffect(() => {
    if (config) {
      setHeroImage(config.heroImage || '');
      setAboutImage(config.aboutImage || '');
      setHeroTitle(config.heroTitle || '');
      setHeroDescription(config.heroDescription || '');
      setHeroBadge(config.heroBadge || '');
      setAboutTitle(config.aboutTitle || '');
      setAboutDescription(config.aboutDescription || '');
    }
  }, [config]);

  const resetGalleryForm = (editing: GalleryItem | null) => {
    const withDefaults = {
      title: '',
      category: 'Bodas',
      date: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }),
      imageUrl: '',
      description: '',
    };
    setEditingGalleryItem(editing);
    setNewGalleryTitle(editing?.title ?? withDefaults.title);
    setNewGalleryCategory(editing?.category ?? withDefaults.category);
    setNewGalleryDate(editing?.date ?? withDefaults.date);
    setNewGalleryImageUrl(editing?.imageUrl ?? withDefaults.imageUrl);
    setNewGalleryDescription(editing?.description ?? withDefaults.description);
  };

  const handleStartEditGallery = (item: GalleryItem) => {
    resetGalleryForm(item);
  };

  const handleCancelEditGallery = () => {
    resetGalleryForm(null);
  };

  const handleSaveGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryImageUrl || !newGalleryTitle) {
      showToast('Por favor ingresa un título y una URL de imagen válida.', 'warning', 'Formulario incompleto');
      return;
    }
    setIsSavingGallery(true);
    const itemData: GalleryItem = {
      id: editingGalleryItem ? editingGalleryItem.id : 'gallery_' + Date.now(),
      title: newGalleryTitle, category: newGalleryCategory, date: newGalleryDate,
      imageUrl: newGalleryImageUrl, description: newGalleryDescription,
    };
    try {
      await dbService.saveGalleryItem(itemData);
      handleCancelEditGallery();
      onRefreshData();              showToast(editingGalleryItem ? 'Imagen actualizada correctamente.' : 'Foto agregada a la galería.', 'success', 'Galería');
    } catch {
      showToast('Ocurrió un error al intentar guardar la imagen en la galería.', 'error', 'Error');
    } finally {
      setIsSavingGallery(false);
    }
  };

  const handleDeleteGalleryItem = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta imagen de la galería?')) return;
    try {
      await dbService.deleteGalleryItem(id);
      if (editingGalleryItem && editingGalleryItem.id === id) handleCancelEditGallery();
      onRefreshData();
      showToast('Imagen retirada de la galería de fotos.', 'info', 'Galería');
    } catch {
      showToast('Ocurrió un error al eliminar la imagen de la galería.', 'error', 'Error');
    }
  };

  const handleSaveImagesConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: AppConfig = {
      ...config,
      heroTitle, heroDescription, heroBadge, heroImage, aboutTitle, aboutDescription, aboutImage
    };
    try {
      await dbService.saveConfig(newConfig);
      onRefreshData();
      showToast('Imágenes guardadas correctamente.', 'success', 'Imágenes');
    } catch {
      showToast('Error al intentar actualizar las imágenes de cabecera.', 'error', 'Error');
    }
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm" id="admin-images-header">
        <span className="text-[10px] tracking-[0.3em] uppercase opacity-75 text-brand-500 block font-bold font-mono">
          DISEÑO E IDENTIDAD VISUAL
        </span>
        <h3 className="text-2xl font-serif font-light italic text-zinc-900 dark:text-white mt-1">
          Galería de Imágenes
        </h3>
        <p className="text-xs text-zinc-500 mt-2 max-w-xl leading-relaxed">
          Reemplaza y gestiona fácilmente las imágenes principales del sitio web, incluyendo las portadas de inicio, nuestra historia y las fotos reales de la galería de creaciones de Carol Rosas.
        </p>
      </div>

      {/* SECTION 1: COVER IMAGES (HERO & HISTORY) */}
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm" id="admin-cover-images-section">
        <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-500 mb-6 flex items-center">
          <Image className="h-4 w-4 mr-2 text-brand-500" />
          1. Portada Principal
        </h4>
        <form onSubmit={handleSaveImagesConfig} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Hero */}
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-900">
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1 font-bold">Imagen de Inicio (Hero Image)</label>
                <ImageUploader value={heroImage} onChange={setHeroImage} placeholder="Escribe la URL o sube una imagen de portada..." />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono uppercase text-zinc-400 block font-semibold">Vista Previa:</span>
                <div className="aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                  {heroImage ? <img src={optimizeImageUrl(heroImage, 600)} alt="Vista previa" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                    : <div className="flex items-center justify-center h-full text-zinc-400 text-xs font-mono">Sin imagen configurada</div>}
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Título Hero</label>
                  <input type="text" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="El Arte de Compartir"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Descripción Hero</label>
                  <textarea value={heroDescription} onChange={(e) => setHeroDescription(e.target.value)} rows={2} placeholder="Diseños exclusivos..."
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white resize-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Badge Hero</label>
                  <input type="text" value={heroBadge} onChange={(e) => setHeroBadge(e.target.value)} placeholder="Por Carol & Edwin Rosas Albines"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
                </div>
              </div>
            </div>

            {/* About */}
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-900">
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1 font-bold">Imagen de Historia (Nosotros)</label>
                <ImageUploader value={aboutImage} onChange={setAboutImage} placeholder="Escribe la URL o sube una imagen de historia..." />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono uppercase text-zinc-400 block font-semibold">Vista Previa:</span>
                <div className="aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                  {aboutImage ? <img src={optimizeImageUrl(aboutImage, 800)} alt="Vista previa" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                    : <div className="flex items-center justify-center h-full text-zinc-400 text-xs font-mono">Sin imagen configurada</div>}
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Título Historia</label>
                  <input type="text" value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} placeholder="Nuestra Historia de Sabor Familiar"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Descripción Historia</label>
                  <textarea value={aboutDescription} onChange={(e) => setAboutDescription(e.target.value)} rows={3} placeholder="En Maison Rosas..."
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white resize-none" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-sm transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              id="btn-save-cover-images">
              Guardar Portadas y Textos
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: GALLERY */}
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm" id="admin-gallery-section">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-500 flex items-center">
            <Sparkles className="h-4 w-4 mr-2 text-brand-500" />
            2. Creaciones Carol ({galleryItems.length} fotos)
          </h4>          {!editingGalleryItem && (
            <button onClick={() => resetGalleryForm({ id: 'new', imageUrl: '', title: '', category: 'Bodas', date: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }), description: '' } as GalleryItem)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-sm cursor-pointer">
              <Plus className="h-4 w-4" />
              <span>Agregar Foto</span>
            </button>
          )}
        </div>

        {/* Gallery Form */}
        {editingGalleryItem !== null && (
          <form onSubmit={handleSaveGalleryItem} className="mb-8 p-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-500">
                {editingGalleryItem?.id && editingGalleryItem.id !== 'new' ? `Editando: ${editingGalleryItem.title}` : 'Nueva Foto'}
              </span>
              <button type="button" onClick={handleCancelEditGallery}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Título de la Foto</label>
                <input type="text" required value={newGalleryTitle} onChange={(e) => setNewGalleryTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Categoría</label>
                <select value={newGalleryCategory} onChange={(e) => setNewGalleryCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white">
                  <option value="Bodas">Bodas</option>
                  <option value="Cumpleaños">Cumpleaños</option>
                  <option value="Infantiles">Infantiles</option>
                  <option value="Aniversarios">Aniversarios</option>
                  <option value="Especiales">Especiales</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">URL de Imagen</label>
                <ImageUploader value={newGalleryImageUrl} onChange={setNewGalleryImageUrl} placeholder="URL de la imagen..." />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Fecha / Mes de entrega</label>
                <input type="text" required value={newGalleryDate} onChange={(e) => setNewGalleryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Descripción (Opcional)</label>
              <textarea value={newGalleryDescription} onChange={(e) => setNewGalleryDescription(e.target.value)} rows={2}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white resize-none" />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button type="button" onClick={handleCancelEditGallery}
                className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 hover:bg-zinc-50 cursor-pointer">
                Cancelar
              </button>
              <button type="submit" disabled={isSavingGallery}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50">
                {isSavingGallery ? 'Guardando...' : 'Guardar Imagen'}
              </button>
            </div>
          </form>
        )}

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="admin-gallery-list">
          {galleryItems.map((item) => (
            <div key={item.id} className="group relative rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 aspect-[4/3]">
              <img src={optimizeImageUrl(item.imageUrl, 800)} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-brand-300 font-bold">{item.category}</span>
                <h4 className="text-sm font-serif font-semibold text-white">{item.title}</h4>
                <span className="text-[10px] text-zinc-300">{item.date}</span>
                <div className="flex mt-2 space-x-2">
                  <button onClick={() => handleStartEditGallery(item)}
                    className="px-2 py-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white text-[10px] flex items-center space-x-1 cursor-pointer">
                    <Edit3 className="h-3 w-3" />
                    <span>Editar</span>
                  </button>
                  <button onClick={() => handleDeleteGalleryItem(item.id)}
                    className="px-2 py-1 bg-red-500/60 hover:bg-red-500/80 rounded-lg text-white text-[10px] flex items-center space-x-1 cursor-pointer">
                    <Trash2 className="h-3 w-3" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
