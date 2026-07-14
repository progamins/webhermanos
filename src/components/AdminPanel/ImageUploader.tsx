import React, { useState } from 'react';

interface ImageUploaderProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function ImageUploader({ value, onChange, placeholder }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  return (
    <div className="space-y-1.5">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "https://images.unsplash.com/... o sube una"}
          className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white font-mono"
        />
        <label className="cursor-pointer bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider shrink-0 select-none flex items-center space-x-1">
          <span>{uploading ? 'Cargando...' : 'Subir'}</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>
      {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
    </div>
  );
}
