import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit3, Trash2, ToggleLeft, ToggleRight, X, Package } from 'lucide-react';
import { Product } from '../../types';
import { dbService } from '../../dbService';
import ImageUploader from './ImageUploader';
import Barcode from '../Barcode';
import { optimizeImageUrl } from '../../utils/images';

interface AdminProductsProps {
  products: Product[];
  onRefreshData: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
}

export default function AdminProducts({ products, onRefreshData, showToast }: AdminProductsProps) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState(100);
  const [prodCategory, setProdCategory] = useState('Cumpleaños');
  const [prodFlavors, setProdFlavors] = useState('');
  const [prodDecorations, setProdDecorations] = useState('');
  const [prodPrepTime, setProdPrepTime] = useState('48 horas');
  const [prodImages, setProdImages] = useState<string[]>(['']);

  const clearProductForm = () => {
    setProdName('');
    setProdDesc('');
    setProdPrice(100);
    setProdCategory('Cumpleaños');
    setProdFlavors('');
    setProdDecorations('');
    setProdPrepTime('48 horas');
    setProdImages(['']);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodPrice) {
      showToast('Por favor, ingresa el nombre y el precio base.', 'warning', 'Formulario incompleto');
      return;
    }

    const flavorsArray = prodFlavors.split(',').map(s => s.trim()).filter(Boolean);
    const decorationsArray = prodDecorations.split(',').map(s => s.trim()).filter(Boolean);
    const targetId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;
    const targetImages = prodImages.filter(url => url.trim() !== '').length > 0
      ? prodImages.filter(url => url.trim() !== '')
      : (editingProduct && editingProduct.images.length > 0
        ? editingProduct.images
        : []);

    const newProduct: Product = {
      id: targetId,
      name: prodName,
      description: prodDesc,
      basePrice: Number(prodPrice),
      category: prodCategory,
      images: targetImages,
      flavors: flavorsArray.length > 0 ? flavorsArray : ['Vainilla', 'Chocolate'],
      decorations: decorationsArray.length > 0 ? decorationsArray : ['Flores Frescas', 'Trufas'],
      preparationTime: prodPrepTime,
      active: editingProduct ? (editingProduct.active ?? true) : true,
      stock: editingProduct ? (editingProduct.stock ?? true) : true,
      tags: [prodCategory.toLowerCase(), 'artesanal']
    };

    try {
      await dbService.saveProduct(newProduct);
      onRefreshData();
      showToast(editingProduct ? `El modelo "${prodName}" se ha guardado correctamente.` : `Pastel "${prodName}" creado y agregado al catálogo público.`, 'success', 'Catálogo de Pasteles');
      setEditingProduct(null);
      setIsCreatingProduct(false);
      clearProductForm();
    } catch {
      showToast('Ocurrió un error al guardar el producto.', 'error', 'Error');
    }
  };

  const startEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdDesc(prod.description);
    setProdPrice(prod.basePrice);
    setProdCategory(prod.category);
    setProdFlavors(prod.flavors ? prod.flavors.join(', ') : '');
    setProdDecorations(prod.decorations ? prod.decorations.join(', ') : '');
    setProdPrepTime(prod.preparationTime || '48 horas');
    setProdImages(prod.images && prod.images.length > 0 ? prod.images : ['']);
    setIsCreatingProduct(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este modelo de pastel de forma permanente?')) return;
    try {
      await dbService.deleteProduct(id);
      onRefreshData();
      showToast('El pastel se ha eliminado permanentemente del catálogo.', 'info', 'Pastel retirado');
    } catch {
      showToast('Error al intentar eliminar el pastel.', 'error', 'Error');
    }
  };

  const handleToggleProductStock = async (prod: Product) => {
    const updated = { ...prod, stock: !(prod.stock !== false) };
    try {
      await dbService.saveProduct(updated);
      onRefreshData();
      showToast(`Stock de "${prod.name}" marcado como ${updated.stock ? 'Con Stock' : 'Sin Stock'}.`, 'info', 'Stock actualizado');
    } catch {
      showToast('Error al cambiar stock.', 'error', 'Error');
    }
  };

  const handleToggleProductActive = async (prod: Product) => {
    const updated = { ...prod, active: !(prod.active !== false) };
    try {
      await dbService.saveProduct(updated);
      onRefreshData();
      showToast(`Visibilidad de "${prod.name}" está ahora ${updated.active ? 'Pública (Activo)' : 'Oculta (Inactivo)'}.`, 'info', 'Estado de Catálogo');
    } catch {
      showToast('Error al cambiar visibilidad.', 'error', 'Error');
    }
  };

  if (isCreatingProduct || editingProduct) {
    return (
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm max-w-2xl mx-auto">
        <h3 className="text-xl font-serif font-bold text-zinc-900 dark:text-white mb-6">
          {editingProduct ? `Editar Pastel: ${editingProduct.name}` : 'Crear Nuevo Modelo de Pastel'}
        </h3>
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Nombre del Pastel</label>
              <input type="text" required value={prodName} onChange={(e) => setProdName(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Precio Base (S/.)</label>
              <input type="number" required value={prodPrice} onChange={(e) => setProdPrice(Number(e.target.value))}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Descripción de Autor (Carol)</label>
            <textarea rows={4} value={prodDesc} onChange={(e) => setProdDesc(e.target.value)}
              placeholder="Describe la receta, texturas, rellenos y la presentación artística de Carol para este modelo de pastel..."
              className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800 dark:text-white resize-y" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Categoría</label>
              <select value={prodCategory} onChange={(e) => setProdCategory(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white">
                <option value="Bodas">Bodas</option>
                <option value="Cumpleaños">Cumpleaños</option>
                <option value="Infantiles">Infantiles</option>
                <option value="Aniversarios">Aniversarios</option>
                <option value="Especiales">Especiales</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Tiempo de Preparación</label>
              <input type="text" value={prodPrepTime} onChange={(e) => setProdPrepTime(e.target.value)} placeholder="Ej: 48 horas"
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Sabores (Separados por coma)</label>
              <input type="text" placeholder="Chocolate, Vainilla, Red Velvet" value={prodFlavors} onChange={(e) => setProdFlavors(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Decoraciones (Separadas por coma)</label>
              <input type="text" placeholder="Flores Frescas, Macarons, Trufas" value={prodDecorations} onChange={(e) => setProdDecorations(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Imágenes del Pastel ({prodImages.filter(u => u.trim()).length})</label>
            <div className="space-y-2">
              {prodImages.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <ImageUploader
                      value={url}
                      onChange={(val) => {
                        const next = [...prodImages];
                        next[idx] = val;
                        setProdImages(next);
                      }}
                      placeholder={`URL de imagen ${idx + 1}...`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (prodImages.length <= 1) return;
                      setProdImages(prodImages.filter((_, i) => i !== idx));
                    }}
                    disabled={prodImages.length <= 1}
                    className="p-2 border border-red-200/50 rounded-xl text-red-400 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
                    title="Eliminar imagen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setProdImages([...prodImages, ''])}
                className="w-full py-2 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-zinc-400 hover:border-brand-300 hover:text-brand-500 transition-all cursor-pointer"
              >
                + Agregar otra imagen
              </button>
            </div>
            {prodImages.filter(u => u.trim()).length > 1 && (
              <p className="text-[9px] text-zinc-400 mt-1 font-mono">
                La primera imagen se usará como portada en el catálogo.
              </p>
            )}
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button type="button" onClick={() => { setEditingProduct(null); setIsCreatingProduct(false); clearProductForm(); }}
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 hover:bg-zinc-50 cursor-pointer">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider cursor-pointer">
              Guardar Pastel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-white">
          Catálogo Activo en Web ({products.length} modelos)
        </h3>
        <button onClick={() => setIsCreatingProduct(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-sm cursor-pointer"
          id="create-product-btn">
          <Plus className="h-4 w-4" />
          <span>Agregar Pastel</span>
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
          <p className="text-sm text-zinc-400">No hay productos en el catálogo. ¡Agrega tu primer pastel!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="admin-products-list">
          {products.map((prod) => (
            <div key={prod.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 flex flex-col justify-between"
              id={`admin-product-item-${prod.id}`}>
              <div className="flex space-x-4">
                <div className="relative">
                  <div className="relative">
                    {prod.images && prod.images[0] ? (
                      <img src={optimizeImageUrl(prod.images[0], 200)} alt={prod.name} className="w-16 h-16 rounded-xl object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <Package className="h-5 w-5" />
                      </div>
                    )}
                    {prod.images && prod.images.length > 1 && (
                      <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-[8px] font-mono font-bold px-1 rounded-full shadow-sm border border-white">
                        +{prod.images.length - 1}
                      </span>
                    )}
                  </div>
                  {/* Barcode tiny overlay */}
                  <div className="absolute -bottom-1 -right-1 bg-white/95 dark:bg-zinc-900/95 rounded-md p-0.5 shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <Barcode
                      value={`PROD-${prod.id.slice(-6)}`}
                      width={1}
                      height={12}
                      fontSize={5}
                      lineColor="#52525b"
                      margin={0}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-mono font-bold text-brand-600 dark:text-brand-400 uppercase">{prod.category}</span>
                  <h4 className="font-serif font-bold text-sm text-zinc-900 dark:text-white truncate">{prod.name}</h4>
                  <span className="font-mono text-xs font-bold text-zinc-500 mt-0.5 block">S/. {prod.basePrice}</span>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed italic">{prod.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 my-4 py-3 border-y border-zinc-100 dark:border-zinc-800/50 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Stock:</span>
                  <button onClick={() => handleToggleProductStock(prod)}
                    className={`flex items-center ${prod.stock ? 'text-emerald-500' : 'text-red-500'}`}>
                    {prod.stock ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Activo:</span>
                  <button onClick={() => handleToggleProductActive(prod)}
                    className={`flex items-center ${prod.active ? 'text-emerald-500' : 'text-zinc-400'}`}>
                    {prod.active ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={() => startEditProduct(prod)}
                  className="p-2 border border-zinc-100 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 text-zinc-500 hover:text-brand-500 cursor-pointer" title="Editar pastel">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDeleteProduct(prod.id)}
                  className="p-2 border border-zinc-100 dark:border-zinc-800 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 cursor-pointer" title="Eliminar de Firestore">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
