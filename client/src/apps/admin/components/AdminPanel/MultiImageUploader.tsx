import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Image, X, Loader2, Check, AlertCircle } from 'lucide-react';
import { compressImage } from '../../../../shared/utils/images';
import { showToast } from '../../../../shared/utils/toast';

interface MultiImageUploaderProps {
  onUpload: (urls: string[]) => void;
}

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  url?: string;
  error?: string;
  originalSize: number;
  compressedSize?: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

let uploadIdCounter = 0;

export default function MultiImageUploader({ onUpload }: MultiImageUploaderProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: UploadItem[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(file => ({
        id: `upload-${++uploadIdCounter}`,
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' as const,
        originalSize: file.size,
      }));

    if (newItems.length === 0) {
      showToast('Solo se permiten imágenes', 'warning', '📸 Multi-subida');
      return;
    }

    setItems(prev => [...prev, ...newItems]);
    // Auto-start upload after a brief delay to let the UI render
    setTimeout(() => startUpload([...items, ...newItems]), 100);
  }, [items]);

  const startUpload = async (allItems: UploadItem[]) => {
    setIsUploading(true);
    const token = localStorage.getItem('maison_admin_token') || '';
    const uploadedUrls: string[] = [];

    // Upload in parallel (max 3 concurrent to avoid overwhelming the server)
    const pending = allItems.filter(i => i.status === 'pending');
    const chunks: UploadItem[][] = [];
    for (let i = 0; i < pending.length; i += 3) {
      chunks.push(pending.slice(i, i + 3));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(async (item) => {
        try {
          // Mark as uploading
          setItems(prev => prev.map(i =>
            i.id === item.id ? { ...i, status: 'uploading' as const } : i
          ));

          // Compress
          let compressed: Blob | File = item.file;
          let compressedSize = item.file.size;
          try {
            compressed = await compressImage(item.file, { maxWidth: 1200 });
            compressedSize = compressed.size;
          } catch {
            // Use original
          }

          setItems(prev => prev.map(i =>
            i.id === item.id ? { ...i, compressedSize } : i
          ));

          const ext = compressed.type === 'image/jpeg' ? '.jpg' : '.webp';
          const compressedFile = new File([compressed], item.file.name.replace(/\.[^.]+$/, ext), {
            type: compressed.type || 'image/webp',
            lastModified: Date.now()
          });

          const formData = new FormData();
          formData.append('image', compressedFile);
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'x-admin-token': token },
            body: formData
          });
          const data = await res.json();

          if (res.ok && data.success) {
            setItems(prev => prev.map(i =>
              i.id === item.id ? { ...i, status: 'done' as const, url: data.imageUrl } : i
            ));
            uploadedUrls.push(data.imageUrl);
          } else {
            throw new Error(data.error || 'Error de subida');
          }
        } catch (err) {
          setItems(prev => prev.map(i =>
            i.id === item.id ? {
              ...i,
              status: 'error' as const,
              error: err instanceof Error ? err.message : 'Error de conexión'
            } : i
          ));
        }
      }));
    }

    setIsUploading(false);

    if (uploadedUrls.length > 0) {
      showToast(`${uploadedUrls.length} imagen(es) subida(s) correctamente`, 'success', '📸 Multi-subida');
      // Clean up items after a brief delay
      setTimeout(() => {
        setItems([]);
        onUpload(uploadedUrls);
      }, 1500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const clearAll = () => {
    items.forEach(i => URL.revokeObjectURL(i.preview));
    setItems([]);
  };

  const doneCount = items.filter(i => i.status === 'done').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const totalCount = items.length;

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`
          relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragOver
            ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/30 scale-[1.01]'
            : items.length > 0
              ? 'border-brand-300/50 dark:border-brand-800/30 bg-brand-50/20 dark:bg-brand-950/5'
              : 'border-zinc-200 dark:border-zinc-800 hover:border-brand-300 dark:hover:border-brand-700 bg-zinc-50/50 dark:bg-zinc-950/30'
          }
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
        style={{ minHeight: '100px' }}
      >
        {isDragOver ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-2">
            <Upload className="h-8 w-8 text-brand-500 animate-bounce" />
            <span className="text-sm font-mono font-bold text-brand-600 dark:text-brand-400">
              ¡Suelta las imágenes aquí!
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              Subirás {items.length > 0 ? `${items.length + 1}` : 'varias'} imágenes
            </span>
          </div>
        ) : isUploading ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-2">
            <Loader2 className="h-7 w-7 text-brand-500 animate-spin" />
            <span className="text-xs font-mono text-zinc-400">
              Subiendo {doneCount + errorCount}/{totalCount} imágenes...
            </span>
            <div className="w-48 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-400 to-brand-500 rounded-full transition-all duration-300"
                style={{ width: `${(doneCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-1.5">
            <Upload className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
            <span className="text-xs font-mono text-zinc-400">
              Arrastra varias imágenes o <span className="text-brand-500 font-bold">haz clic</span> para seleccionar
            </span>
            <span className="text-[9px] font-mono text-zinc-300 dark:text-zinc-600">
              JPG, PNG, WebP · Puedes soltar varias a la vez
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center py-4 space-x-2 text-zinc-400">
            <Upload className="h-5 w-5" />
            <span className="text-[10px] font-mono">
              Arrastra más imágenes o <span className="text-brand-500 font-bold">haz clic</span> para agregar
            </span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Preview Grid */}
      {items.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400">
              {totalCount} imagen(es) · {doneCount} listas{errorCount > 0 ? ` · ${errorCount} con error` : ''}
              {isUploading && ` · ${totalCount - doneCount - errorCount} pendientes`}
            </span>
            {!isUploading && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[9px] font-mono text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                Limpiar todo
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 group"
                >
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Status overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {item.status === 'uploading' && (
                      <Loader2 className="h-5 w-5 text-brand-500 animate-spin" />
                    )}
                    {item.status === 'done' && (
                      <div className="w-full h-full bg-black/30 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    )}
                    {item.status === 'error' && (
                      <div className="w-full h-full bg-black/40 flex items-center justify-center" title={item.error}>
                        <AlertCircle className="h-5 w-5 text-red-400" />
                      </div>
                    )}
                  </div>

                  {/* Compression badge */}
                  {item.compressedSize && item.status === 'done' && (
                    <div className="absolute top-1 left-1 px-1 py-0.5 bg-black/50 backdrop-blur-sm rounded-md">
                      <span className="text-[7px] font-mono text-emerald-300">
                        -{Math.round((1 - item.compressedSize / item.originalSize) * 100)}%
                      </span>
                    </div>
                  )}

                  {/* Remove button */}
                  {!isUploading && item.status !== 'uploading' && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                      className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  )}

                  {/* File name on hover */}
                  <div className="absolute inset-x-1 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="px-1 py-0.5 bg-black/60 backdrop-blur-sm rounded-md truncate">
                      <span className="text-[7px] font-mono text-white/90 truncate block">
                        {item.file.name}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}