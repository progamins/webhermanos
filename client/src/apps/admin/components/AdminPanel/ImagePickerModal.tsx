import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Image, Loader2, Check, HardDrive } from 'lucide-react';

interface StorageFile {
  name: string;
  fullPath: string;
  folder: string;
  size: number;
  contentType: string;
  timeCreated: string | null;
  updated: string | null;
  downloadUrl: string | null;
  /** Origen: almacenamiento de archivos o imágenes ya existentes en la galería */
  source?: 'storage' | 'gallery';
}

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  /** Modo multi-selección: permite elegir varias imágenes y asignarlas de una vez. */
  multiple?: boolean;
  /** Se llama (en modo múltiple) con todas las URLs seleccionadas al pulsar "Asignar". */
  onSelectMany?: (urls: string[]) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** ¿Es un archivo de imagen? Acepta content-type de imagen o extensión de imagen
 *  (el content-type puede faltar o ser 'application/octet-stream' para archivos
 *  registrados sin MIME correcto — la pestaña de Almacenamiento sí los muestra,
 *  así que el selector también debe poder asignarlos). */
function isImageFile(f: StorageFile): boolean {
  if (f.contentType && f.contentType.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif|svg|avif|ico|bmp)$/i.test(f.name || '');
}

export default function ImagePickerModal({ isOpen, onClose, onSelect, multiple = false, onSelectMany }: ImagePickerModalProps) {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSelectedUrl(null);
    setSelectedUrls(new Set());
    setSearch('');

    const token = localStorage.getItem('maison_admin_token') || '';

    // 1) Archivos de Almacenamiento
    const loadStorage = fetch('/api/admin/storage/list', { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(json => {
        if (!json.success) return [];
        const imgs = (json.files || []).filter((f: StorageFile) =>
          isImageFile(f) && f.downloadUrl
        );
        imgs.sort((a: StorageFile, b: StorageFile) => {
          return ((b.timeCreated || '') < (a.timeCreated || '') ? -1 : 1);
        });
        return imgs.map((f: StorageFile) => ({ ...f, source: 'storage' as const }));
      })
      .catch(() => []);

    // 2) Imágenes que YA están en la galería (para reutilizarlas sin volver a subir)
    const loadGallery = fetch('/api/gallery')
      .then(r => r.json())
      .then((json: any) => {
        if (!Array.isArray(json)) return [];
        return json
          .filter((g: any) => g && typeof g.imageUrl === 'string' && g.imageUrl.trim())
          .map((g: any) => ({
            name: g.title || 'Imagen de la galería',
            fullPath: g.imageUrl,
            folder: 'gallery',
            size: 0,
            contentType: 'image/unknown',
            timeCreated: g.date || null,
            updated: null,
            downloadUrl: g.imageUrl,
            source: 'gallery' as const,
          }));
      })
      .catch(() => []);

    Promise.all([loadStorage, loadGallery]).then(([storageFiles, galleryFiles]) => {
      // Dedupe por URL (prioridad: almacenamiento; la galería completa lo demás)
      const seen = new Set<string>();
      const merged: StorageFile[] = [];
      for (const f of [...storageFiles, ...galleryFiles]) {
        const key = f.downloadUrl || f.fullPath;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push(f);
      }
      setFiles(merged);
      setLoading(false);
    });
  }, [isOpen]);

  const filtered = search.trim()
    ? files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : files;

  const handleSelect = (url: string) => {
    if (multiple) {
      setSelectedUrls(prev => {
        const next = new Set(prev);
        if (next.has(url)) next.delete(url);
        else next.add(url);
        return next;
      });
      return;
    }
    setSelectedUrl(url);
    // Pequeño delay para mostrar el check antes de cerrar
    setTimeout(() => {
      onSelect(url);
      onClose();
    }, 200);
  };

  const handleAssign = () => {
    const urls = [...selectedUrls];
    if (urls.length === 0) return;
    onSelectMany?.(urls);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center">
                  <Image className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-zinc-900 dark:text-white">
                    Galería de Imágenes
                  </h3>
                  <p className="text-[10px] font-mono text-zinc-400">
                    {files.length} imágenes disponibles · {multiple ? 'Selecciona varias para asignarlas' : 'Selecciona una para usarla'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar imágenes..."
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-zinc-800 dark:text-white transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 text-brand-500 animate-spin mb-3" />
                  <span className="text-xs font-mono text-zinc-400">Cargando imágenes...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <HardDrive className="h-10 w-10 text-zinc-300 mb-3" />
                  <p className="text-sm font-serif font-bold text-zinc-500">
                    {search ? 'Sin resultados' : 'Sin imágenes'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {search
                      ? `No se encontró "${search}"`
                      : 'Sube imágenes desde el botón "Subir" en el formulario'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filtered.map((file) => {
                    const isSelected = multiple
                      ? selectedUrls.has(file.downloadUrl!)
                      : selectedUrl === file.downloadUrl;
                    return (
                      <motion.button
                        key={file.fullPath}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => handleSelect(file.downloadUrl!)}
                        className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'border-brand-500 ring-2 ring-brand-500/30 shadow-lg shadow-brand-500/10'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md'
                        }`}
                      >
                        <img
                          src={file.downloadUrl!}
                          alt={file.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />

                        {/* Selected overlay */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-lg">
                              <Check className="h-5 w-5" />
                            </div>
                          </div>
                        )}

                        {/* Size badge (solo almacenamiento) */}
                        {file.source === 'storage' && file.size > 0 && (
                          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] font-mono text-white">{formatBytes(file.size)}</span>
                          </div>
                        )}

                        {/* Origen: galería */}
                        {file.source === 'gallery' && (
                          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-brand-500/90 backdrop-blur-sm rounded-md">
                            <span className="text-[7px] font-mono font-bold text-white uppercase tracking-wider">Galería</span>
                          </div>
                        )}

                        {/* Name tooltip */}
                        <div className="absolute inset-x-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded-md truncate">
                            <span className="text-[7px] font-mono text-white/90 truncate block">{file.name}</span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 shrink-0 bg-zinc-50/50 dark:bg-zinc-950/50">
              <span className="text-[10px] font-mono text-zinc-400">
                {filtered.length} de {files.length} imágenes
                {multiple && selectedUrls.size > 0 ? ` · ${selectedUrls.size} seleccionada(s)` : ''}
              </span>
              <div className="flex items-center space-x-2">
                {multiple && (
                  <button
                    onClick={handleAssign}
                    disabled={selectedUrls.size === 0}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm"
                  >
                    {selectedUrls.size > 0 ? `Asignar ${selectedUrls.size}` : 'Asignar'}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
