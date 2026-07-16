import React, { useState, useRef } from 'react';
import { Upload, Link } from 'lucide-react';

interface ImageUploaderProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function ImageUploader({ value, onChange, placeholder }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);
      const token = localStorage.getItem('maison_admin_token') || '';
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-admin-token': token },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onChange(data.imageUrl);
      } else {
        setError(data.error || 'Error subiendo archivo');
      }
    } catch {
      setError('Error de red al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFile(file);
    // Reset input so the same file can be re-selected
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

  return (
    <div className="space-y-1.5">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "https://images.unsplash.com/... o sube una"}
            className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white font-mono pr-10"
          />
          {!value && (
            <Link className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 dark:text-zinc-600 pointer-events-none" />
          )}
        </div>

        {/* Upload button triggers file input */}
        <label
          onClick={triggerFileInput}
          className="cursor-pointer bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider shrink-0 select-none flex items-center space-x-1 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>{uploading ? 'Cargando...' : 'Subir'}</span>
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200
          ${isDragOver
            ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/30 scale-[1.01]'
            : value
              ? 'border-emerald-300/50 dark:border-emerald-800/30 bg-emerald-50/30 dark:bg-emerald-950/10'
              : 'border-zinc-200 dark:border-zinc-800 hover:border-brand-300 dark:hover:border-brand-700 bg-zinc-50/50 dark:bg-zinc-950/30'
          }
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        {uploading ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
            <span className="text-[10px] font-mono text-zinc-400">Subiendo imagen...</span>
          </div>
        ) : isDragOver ? (
          <div className="flex flex-col items-center space-y-1.5">
            <Upload className="h-6 w-6 text-brand-500 animate-bounce" />
            <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">Suelta la imagen aquí</span>
          </div>
        ) : value ? (
          <div className="flex items-center justify-center space-x-2">
            <img
              src={value}
              alt="Preview"
              className="h-10 w-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-800"
              referrerPolicy="no-referrer"
            />
            <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[200px]">
              Imagen lista — arrastra para reemplazar
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-1.5">
            <Upload className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
            <span className="text-[10px] font-mono text-zinc-400">
              Arrastra una imagen aquí o <span className="text-brand-500 font-bold">haz clic</span> para subir
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[10px] text-red-500 font-medium flex items-center space-x-1">
          <span>⚠</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
