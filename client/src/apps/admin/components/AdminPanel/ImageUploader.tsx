import React, { useState, useRef } from 'react';
import { Upload, Link, Image, X } from 'lucide-react';
import { compressImage } from '../../../../shared/utils/images';
import { showToast } from '../../../../shared/utils/toast';
import ImagePickerModal from './ImagePickerModal';

interface ImageUploaderProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function ImageUploader({ value, onChange, placeholder }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{ original: number; compressed: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      return;
    }

    setUploading(true);
    setError('');
    setCompressionStats(null);

    let originalSize = file.size;
    let compressedSize = file.size;
    let compressed: Blob | File = file;
    try {
      originalSize = file.size;
      compressed = await compressImage(file, { maxWidth: 1200 });
      compressedSize = compressed.size;
    } catch (compressionError) {
      showToast('Error al comprimir la imagen. Se subirá el archivo original.', 'warning', '🧩 Compresión');
      console.warn('[ImageUploader] Error de compresión:', compressionError);
    }

    try {
      setCompressionStats({ original: originalSize, compressed: compressedSize });

      const ext = compressed.type === 'image/jpeg' ? '.jpg' : '.webp';
      const compressedFile = new File([compressed], file.name.replace(/\.[^.]+$/, ext), {
        type: compressed.type || 'image/webp',
        lastModified: Date.now()
      });

      const formData = new FormData();
      formData.append('image', compressedFile);
      const token = localStorage.getItem('maison_admin_token') || '';
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-admin-token': token },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onChange(data.imageUrl);
        showToast('Imagen subida correctamente', 'success', '📤 Subida');
      } else {
        setError(data.error || 'Error subiendo archivo');
      }
    } catch (uploadError) {
      console.error('[ImageUploader] Error de subida:', uploadError);
      setError('Error de red al subir la imagen');
      showToast('Error al subir la imagen al servidor.', 'error', '📤 Subida');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await handleFile(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handlePickerSelect = (url: string) => {
    onChange(url);
    setError('');
  };

  const handleClear = () => {
    onChange('');
    setError('');
  };

  return (
    <div className="space-y-2">
      {/* URL Input Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => { onChange(e.target.value); setError(''); }}
            placeholder={placeholder || "https://... o sube una imagen"}
            className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white font-mono pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
          {!value && (
            <Link className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 dark:text-zinc-600 pointer-events-none" />
          )}
          {value && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
              title="Limpiar"
            >
              <X className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500" />
            </button>
          )}
        </div>

        {/* Gallery button */}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="shrink-0 px-3 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 hover:text-brand-500 hover:border-brand-300 dark:hover:border-brand-700 transition-all cursor-pointer flex items-center space-x-1.5 text-[10px] font-mono font-bold uppercase tracking-wider"
          title="Elegir de la galería"
        >
          <Image className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Galería</span>
        </button>

        {/* Upload button */}
        <label
          onClick={triggerFileInput}
          className="shrink-0 cursor-pointer bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider select-none flex items-center space-x-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>{uploading ? 'Subiendo...' : 'Subir'}</span>
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Drag & Drop Zone + Preview */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!value && !uploading ? triggerFileInput : undefined}
        className={`
          relative rounded-2xl border-2 border-dashed transition-all duration-200 overflow-hidden
          ${isDragOver
            ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/30 scale-[1.01]'
            : value
              ? 'border-emerald-300/50 dark:border-emerald-800/30 bg-emerald-50/30 dark:bg-emerald-950/10'
              : 'border-zinc-200 dark:border-zinc-800 hover:border-brand-300 dark:hover:border-brand-700 bg-zinc-50/50 dark:bg-zinc-950/30 cursor-pointer'
          }
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
        style={{ minHeight: value ? '140px' : '120px' }}
      >
        {/* Uploading state */}
        {uploading && (
          <div className="flex flex-col items-center justify-center py-6 space-y-2">
            <div className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
            <span className="text-[10px] font-mono text-zinc-400">Subiendo imagen...</span>
            {compressionStats && (
              <div className="flex items-center gap-2 mt-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg transition-all duration-300">
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-mono text-red-500/70 line-through">
                    {formatBytes(compressionStats.original)}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBytes(compressionStats.compressed)}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="relative w-16 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div className="absolute inset-0 rounded-full bg-red-200/50" />
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (compressionStats.compressed / compressionStats.original) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    -{Math.round((1 - compressionStats.compressed / compressionStats.original) * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Drag-over state */}
        {!uploading && isDragOver && (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <Upload className="h-8 w-8 text-brand-500 animate-bounce" />
            <span className="text-sm font-mono font-bold text-brand-600 dark:text-brand-400">Suelta la imagen aquí</span>
          </div>
        )}

        {/* Image preview */}
        {!uploading && !isDragOver && value && (
          <div className="flex items-center gap-4 p-3">
            <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 shadow-sm group/preview">
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg opacity-0 group-hover/preview:opacity-100 transition-all cursor-pointer"
                title="Quitar imagen"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate">
                {value.split('/').pop() || 'Imagen seleccionada'}
              </p>
              <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                Arrastra una imagen para reemplazar
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); triggerFileInput(); }}
                  className="text-[9px] font-mono font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-all cursor-pointer"
                >
                  Reemplazar
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPickerOpen(true); }}
                  className="text-[9px] font-mono font-bold text-zinc-500 hover:text-zinc-700 px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  De galería
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!uploading && !isDragOver && !value && (
          <div className="flex flex-col items-center justify-center py-6 space-y-1.5">
            <Upload className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
            <span className="text-xs font-mono text-zinc-400">
              Arrastra una imagen aquí o <span className="text-brand-500 font-bold">haz clic</span> para subir
            </span>
            <span className="text-[9px] font-mono text-zinc-300 dark:text-zinc-600">
              JPG, PNG, WebP · Máx 10 MB
            </span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-[10px] text-red-500 font-medium flex items-center space-x-1">
          <span>⚠</span>
          <span>{error}</span>
        </p>
      )}

      {/* ImagePickerModal */}
      <ImagePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
      />
    </div>
  );
}