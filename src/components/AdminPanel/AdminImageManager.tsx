import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  HardDrive, Trash2, Search, RefreshCw, ExternalLink, Image,
  FileImage, FileText, Loader2, ChevronDown, ChevronUp,
  AlertTriangle, Check, X, Globe, FolderOpen, UploadCloud,
  ShieldAlert, ShieldCheck
} from 'lucide-react';
import { showToast } from '../../utils/toast';

interface StorageFile {
  name: string;
  fullPath: string;
  folder: string;
  size: number;
  contentType: string;
  timeCreated: string | null;
  updated: string | null;
  downloadUrl: string | null;
  localPath?: string;
}

interface StorageResponse {
  success: boolean;
  files: StorageFile[];
  totalSize: number;
  totalFiles: number;
  firebaseFiles: StorageFile[];
  localFiles: StorageFile[];
  error?: string;
}

interface AuditUrl {
  collection: string;
  docId: string;
  field: string;
  url: string;
  type: 'firebase' | 'local' | 'unsplash' | 'external' | 'empty';
}

interface AuditResponse {
  success: boolean;
  urls: AuditUrl[];
  counts: {
    total: number;
    firebase: number;
    local: number;
    unsplash: number;
    external: number;
    empty: number;
  };
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) return <Image className="h-4 w-4" />;
  if (contentType === 'application/pdf') return <FileText className="h-4 w-4" />;
  return <FileImage className="h-4 w-4" />;
}

function getFileColor(contentType: string): string {
  if (contentType.startsWith('image/')) return 'text-emerald-500';
  if (contentType === 'application/pdf') return 'text-red-500';
  return 'text-zinc-400';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-PE', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

type SortField = 'name' | 'size' | 'timeCreated' | 'contentType';
type SortDir = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';
type StorageTab = 'all' | 'firebase' | 'local';

export default function AdminImageManager() {
  const [data, setData] = useState<StorageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('timeCreated');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [storageTab, setStorageTab] = useState<StorageTab>('all');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const token = localStorage.getItem('maison_admin_token') || '';

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/storage/list', {
        headers: { 'x-admin-token': token }
      });
      const json: StorageResponse = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || 'Error al obtener archivos');
      }
    } catch {
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Derive file list from active tab
  const files: StorageFile[] = (() => {
    if (!data) return [];
    let list: StorageFile[];
    if (storageTab === 'firebase') list = data.firebaseFiles || [];
    else if (storageTab === 'local') list = data.localFiles || [];
    else list = data.files || [];

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.fullPath.toLowerCase().includes(q) ||
        f.contentType.toLowerCase().includes(q)
      );
    }

    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'size': cmp = (a.size || 0) - (b.size || 0); break;
        case 'timeCreated': cmp = ((a.timeCreated || '') < (b.timeCreated || '') ? -1 : 1); break;
        case 'contentType': cmp = a.contentType.localeCompare(b.contentType); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  })();

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const toggleSelect = (fullPath: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fullPath)) next.delete(fullPath);
      else next.add(fullPath);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.fullPath)));
    }
  };

  const handleDelete = async (file: StorageFile) => {
    setDeleting(file.fullPath);
    try {
      const res = await fetch(`/api/admin/storage/delete?fullPath=${encodeURIComponent(file.fullPath)}&folder=${encodeURIComponent(file.folder)}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token }
      });
      const json = await res.json();
      if (json.success) {
        showToast(`"${file.name}" eliminado correctamente.`, 'success', '🗑️ Eliminado');
        setConfirmDelete(null);
        fetchFiles();
      } else {
        showToast(json.error || 'Error al eliminar.', 'error', 'Error');
      }
    } catch {
      showToast('Error de conexión al eliminar.', 'error', 'Error');
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;
    setBulkDeleting(true);
    const filesToDelete = files.filter(f => selectedFiles.has(f.fullPath));
    try {
      const res = await fetch('/api/admin/storage/delete-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: JSON.stringify({ files: filesToDelete })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`${json.deleted} archivo(s) eliminado(s)${json.errors > 0 ? ` (${json.errors} error(es))` : ''}.`, 'success', '🗑️ Eliminación masiva');
        setSelectedFiles(new Set());
        fetchFiles();
      } else {
        showToast(json.error || 'Error en eliminación masiva.', 'error', 'Error');
      }
    } catch {
      showToast('Error de conexión.', 'error', 'Error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const fetchAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch('/api/admin/audit/urls', {
        headers: { 'x-admin-token': token }
      });
      const json: AuditResponse = await res.json();
      if (json.success) {
        setAuditData(json);
        setShowAudit(true);
      } else {
        showToast(json.error || 'Error al auditar URLs.', 'error', 'Auditoría');
      }
    } catch {
      showToast('Error de conexión al auditar.', 'error', 'Auditoría');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (!data?.localFiles?.length) return;
    if (!confirm(`¿Migrar ${data.localFiles.length} archivo(s) local(es) a Firebase Storage?\n\nLos archivos se mantendrán en el servidor local como respaldo.`)) return;

    setMigrating(true);
    try {
      const res = await fetch('/api/admin/storage/migrate-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        }
      });
      const json = await res.json();
      if (json.success) {
        const failed = json.total - json.migrated;
        if (json.migrated > 0) {
          showToast(`${json.migrated} archivo(s) migrado(s) a Firebase Storage.${failed > 0 ? ` (${failed} error(es))` : ''}`, 'success', '☁️ Migración completa');
        } else {
          showToast('No se pudo migrar ningún archivo.', 'warning', 'Migración');
        }
        fetchFiles();
      } else {
        showToast(json.error || 'Error durante la migración.', 'error', 'Error');
      }
    } catch {
      showToast('Error de conexión durante la migración.', 'error', 'Error');
    } finally {
      setMigrating(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 inline ml-1 opacity-20" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 inline ml-1 text-brand-500" />
      : <ChevronDown className="h-3 w-3 inline ml-1 text-brand-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/85 shadow-sm">
        <div className="flex items-center space-x-2 text-brand-500 font-mono text-[10px] font-bold uppercase tracking-wider mb-2">
          <HardDrive className="h-4 w-4" />
          <span>Gestión Profesional de Almacenamiento</span>
        </div>
        <h3 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">
          Administrador de Imágenes
        </h3>
        <p className="text-xs text-zinc-500 mt-1.5 font-sans leading-relaxed max-w-2xl">
          Visualiza, organiza y optimiza el almacenamiento de todas las imágenes del sistema.
          Gestión directa con <strong>Firebase Storage</strong> y archivos locales del servidor.
        </p>
      </div>

      {/* Stats Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Archivos Totales', value: data.totalFiles, icon: <HardDrive className="h-4 w-4" />, color: 'text-brand-500' },
            { label: 'Almacenamiento Total', value: formatBytes(data.totalSize), icon: <Globe className="h-4 w-4" />, color: 'text-emerald-500' },
            { label: 'Firebase Storage', value: data.firebaseFiles?.length || 0, icon: <Globe className="h-4 w-4" />, color: 'text-sky-500' },
            { label: 'Archivos Locales', value: data.localFiles?.length || 0, icon: <FolderOpen className="h-4 w-4" />, color: 'text-amber-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center space-x-2 text-zinc-400 mb-2">
                {stat.icon}
                <span className="text-[9px] font-mono uppercase tracking-wider font-bold">{stat.label}</span>
              </div>
              <span className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-4">
        {/* Row 1: Tabs + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex space-x-1.5 bg-zinc-50 dark:bg-zinc-950 p-1 rounded-xl">
            {[
              { id: 'all' as StorageTab, label: 'Todos', icon: <HardDrive className="h-3.5 w-3.5" /> },
              { id: 'firebase' as StorageTab, label: 'Firebase', icon: <Globe className="h-3.5 w-3.5" /> },
              { id: 'local' as StorageTab, label: 'Local', icon: <FolderOpen className="h-3.5 w-3.5" /> },
            ].map(tab => (
              <button key={tab.id} onClick={() => { setStorageTab(tab.id); setSelectedFiles(new Set()); }}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  storageTab === tab.id
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}>
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {/* URL Audit button */}
            <button onClick={fetchAudit} disabled={auditLoading}
              className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 hover:text-brand-500 transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50 text-[10px] font-mono font-bold uppercase tracking-wider"
              title="Auditar URLs en Firestore">
              {auditLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
              <span>Auditar URLs</span>
            </button>
            {/* Migrate local files to Firebase */}
            {data && data.localFiles && data.localFiles.length > 0 && (
              <button onClick={handleMigrate} disabled={migrating}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-400 text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm group">
                {migrating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Migrando {data.localFiles.length} archivos...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-3.5 w-3.5 group-hover:animate-bounce" />
                    <span>Migrar {data.localFiles.length} a Firebase</span>
                  </>
                )}
              </button>
            )}
            {selectedFiles.size > 0 && (
              <button onClick={handleBulkDelete} disabled={bulkDeleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm">
                {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Eliminar ({selectedFiles.size})</span>
              </button>
            )}
            <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 hover:text-brand-500 transition-all cursor-pointer">
              {viewMode === 'grid' ? <ChevronDown className="h-4 w-4" /> : <Image className="h-4 w-4" />}
            </button>
            <button onClick={fetchFiles} disabled={loading}
              className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 hover:text-brand-500 transition-all cursor-pointer disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Row 2: Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, ruta o tipo..."
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-zinc-800 dark:text-white transition-all" />
          </div>

          <div className="flex space-x-1.5">
            {[
              { field: 'name' as SortField, label: 'Nombre' },
              { field: 'size' as SortField, label: 'Peso' },
              { field: 'timeCreated' as SortField, label: 'Fecha' },
              { field: 'contentType' as SortField, label: 'Tipo' },
            ].map(({ field, label }) => (
              <button key={field} onClick={() => toggleSort(field)}
                className={`px-3 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  sortField === field
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-sm'
                    : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 hover:text-zinc-700'
                }`}>
                {label} <SortIcon field={field} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* File List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <Loader2 className="h-8 w-8 text-brand-500 animate-spin mb-4" />
          <span className="text-xs font-mono text-zinc-400">Escaneando almacenamiento...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 bg-red-50 dark:bg-red-950/20 rounded-3xl border border-red-200 dark:border-red-900/30 shadow-sm">
          <AlertTriangle className="h-8 w-8 text-red-400 mb-3" />
          <span className="text-xs font-mono font-bold text-red-600">{error}</span>
          <button onClick={fetchFiles} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer">
            Reintentar
          </button>
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <HardDrive className="h-10 w-10 text-zinc-300 mb-3" />
          <h4 className="text-sm font-serif font-bold text-zinc-500">Sin archivos</h4>
          <p className="text-xs text-zinc-400 mt-1">No hay archivos en esta ubicación.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {files.map((file) => (
            <motion.div
              key={file.fullPath}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`group relative bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${
                selectedFiles.has(file.fullPath)
                  ? 'border-brand-500 ring-2 ring-brand-500/20'
                  : 'border-zinc-100 dark:border-zinc-800 hover:border-brand-200 dark:hover:border-brand-800'
              }`}
            >
              {/* Select checkbox */}
              <button onClick={() => toggleSelect(file.fullPath)}
                className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                  selectedFiles.has(file.fullPath)
                    ? 'bg-brand-500 border-brand-500 text-white'
                    : 'bg-white/80 dark:bg-zinc-900/80 border-zinc-300 dark:border-zinc-600 opacity-0 group-hover:opacity-100'
                }`}>
                {selectedFiles.has(file.fullPath) && <Check className="h-3 w-3" />}
              </button>

              {/* Preview */}
              <div className="aspect-square bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden">
                {file.contentType.startsWith('image/') && file.downloadUrl ? (
                  <img src={file.downloadUrl} alt={file.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className={`${getFileColor(file.contentType)}`}>
                      {getFileIcon(file.contentType)}
                    </div>
                  </div>
                )}
                {/* Size badge */}
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded-md">
                  <span className="text-[8px] font-mono text-white">{formatBytes(file.size)}</span>
                </div>
              </div>

              {/* Info */}
              <div className="p-2.5 space-y-1">
                <p className="text-[9px] font-mono text-zinc-800 dark:text-zinc-200 truncate" title={file.name}>
                  {file.name}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-mono text-zinc-400 uppercase">{file.folder}</span>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {file.downloadUrl && (
                      <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer"
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded cursor-pointer" title="Abrir">
                        <ExternalLink className="h-3 w-3 text-zinc-400 hover:text-brand-500" />
                      </a>
                    )}
                    <button onClick={() => setConfirmDelete(file.fullPath)}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded cursor-pointer" title="Eliminar">
                      <Trash2 className="h-3 w-3 text-zinc-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs min-w-[700px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="w-10 px-3 py-3">
                    <input type="checkbox" checked={selectedFiles.size === files.length && files.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-zinc-300 text-brand-500 focus:ring-brand-500 cursor-pointer" />
                  </th>
                  <th className="px-3 py-3 text-left text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-700 select-none"
                    onClick={() => toggleSort('name')}>
                    Nombre <SortIcon field="name" />
                  </th>
                  <th className="px-3 py-3 text-left text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-700 select-none"
                    onClick={() => toggleSort('contentType')}>
                    Tipo <SortIcon field="contentType" />
                  </th>
                  <th className="px-3 py-3 text-right text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-700 select-none"
                    onClick={() => toggleSort('size')}>
                    Peso <SortIcon field="size" />
                  </th>
                  <th className="px-3 py-3 text-left text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-700 select-none"
                    onClick={() => toggleSort('timeCreated')}>
                    Fecha <SortIcon field="timeCreated" />
                  </th>
                  <th className="px-3 py-3 text-center text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider w-24">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.fullPath}
                    className={`group border-b border-zinc-50 dark:border-zinc-800/30 hover:bg-brand-50/40 dark:hover:bg-brand-950/10 transition-all ${
                      selectedFiles.has(file.fullPath) ? 'bg-brand-50/60 dark:bg-brand-950/20' : ''
                    }`}>
                    <td className="px-3 py-3 text-center">
                      <input type="checkbox" checked={selectedFiles.has(file.fullPath)}
                        onChange={() => toggleSelect(file.fullPath)}
                        className="rounded border-zinc-300 text-brand-500 focus:ring-brand-500 cursor-pointer" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center space-x-2">
                        <span className={getFileColor(file.contentType)}>
                          {getFileIcon(file.contentType)}
                        </span>
                        <div>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 text-[10px]">{file.name}</span>
                          <span className="block text-[8px] font-mono text-zinc-400">{file.fullPath}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[9px] font-mono text-zinc-500">{file.contentType}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300 text-[10px]">{formatBytes(file.size)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[9px] font-mono text-zinc-400">{formatDate(file.timeCreated)}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {file.downloadUrl && (
                          <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer" title="Abrir">
                            <ExternalLink className="h-3.5 w-3.5 text-zinc-400 hover:text-brand-500" />
                          </a>
                        )}
                        {confirmDelete === file.fullPath ? (
                          <div className="flex space-x-1">
                            <button onClick={() => handleDelete(file)} disabled={deleting === file.fullPath}
                              className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all cursor-pointer disabled:opacity-50" title="Confirmar">
                              {deleting === file.fullPath ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </button>
                            <button onClick={() => setConfirmDelete(null)}
                              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 rounded-lg transition-all cursor-pointer" title="Cancelar">
                              <X className="h-3 w-3 text-zinc-500" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(file.fullPath)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all cursor-pointer" title="Eliminar">
                            <Trash2 className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer summary */}
      {data && !loading && (
        <div className="text-center">
          <span className="text-[10px] font-mono text-zinc-400">
            Mostrando {files.length} de {data.totalFiles} archivo(s) · {formatBytes(data.totalSize)} en total
            {data.firebaseFiles && data.firebaseFiles.length > 0 && ` · ${data.firebaseFiles.length} en Firebase Storage`}
            {data.localFiles && data.localFiles.length > 0 && ` · ${data.localFiles.length} en servidor local`}
          </span>
        </div>
      )}

      {/* ── URL AUDIT PANEL ── */}
      {showAudit && auditData && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-brand-500" />
              <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-800 dark:text-white">
                Auditoría de URLs en Firestore
              </h4>
            </div>
            <button onClick={() => { setShowAudit(false); setAuditData(null); }}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">
              <X className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          {/* Stats chips */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-mono font-bold">
              Total: {auditData.counts.total}
            </span>
            <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-mono font-bold">
              ✅ Firebase: {auditData.counts.firebase}
            </span>
            <span className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-[10px] font-mono font-bold">
              ⚠️ Local: {auditData.counts.local}
            </span>
            <span className="px-3 py-1.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-lg text-[10px] font-mono font-bold">
              🖼️ Unsplash: {auditData.counts.unsplash}
            </span>
            <span className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-[10px] font-mono font-bold">
              🔗 Externas: {auditData.counts.external}
            </span>
            {auditData.counts.empty > 0 && (
              <span className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-lg text-[10px] font-mono font-bold">
                Vacías: {auditData.counts.empty}
              </span>
            )}
          </div>

          {/* Results table */}
          <div className="overflow-x-auto max-h-80 overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-2xl">
            <table className="w-full border-collapse text-[10px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-3 py-2.5 text-left font-mono font-bold text-zinc-400 uppercase tracking-wider">Colección</th>
                  <th className="px-3 py-2.5 text-left font-mono font-bold text-zinc-400 uppercase tracking-wider">Campo</th>
                  <th className="px-3 py-2.5 text-left font-mono font-bold text-zinc-400 uppercase tracking-wider">URL</th>
                  <th className="px-3 py-2.5 text-center font-mono font-bold text-zinc-400 uppercase tracking-wider w-20">Origen</th>
                </tr>
              </thead>
              <tbody>
                {auditData.urls.map((item, i) => (
                  <tr key={i} className={`border-b border-zinc-50 dark:border-zinc-800/30 ${
                    item.type === 'firebase' ? '' :
                    item.type === 'local' ? 'bg-amber-50/40 dark:bg-amber-950/10' :
                    item.type === 'unsplash' ? 'bg-sky-50/40 dark:bg-sky-950/10' :
                    item.type === 'empty' ? 'opacity-50' : ''
                  }`}>
                    <td className="px-3 py-2 font-mono text-zinc-600 dark:text-zinc-400">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{item.collection}</span>
                      <span className="text-zinc-400 ml-1">#{item.docId.slice(0, 12)}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-zinc-500">{item.field}</td>
                    <td className="px-3 py-2 max-w-[300px] truncate" title={item.url}>
                      <span className="font-mono text-zinc-600 dark:text-zinc-400">
                        {item.url || '(vacío)'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {item.type === 'firebase' ? (
                        <span className="inline-flex items-center px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded text-[8px] font-mono font-bold">Firebase</span>
                      ) : item.type === 'local' ? (
                        <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[8px] font-mono font-bold">Local ⚠️</span>
                      ) : item.type === 'unsplash' ? (
                        <span className="inline-flex items-center px-2 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded text-[8px] font-mono font-bold">Unsplash</span>
                      ) : item.type === 'empty' ? (
                        <span className="inline-flex items-center px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded text-[8px] font-mono font-bold">Vacío</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-[8px] font-mono font-bold">Externa</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {auditData.counts.unsplash > 0 && (
            <div className="bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/30 rounded-2xl p-4">
              <p className="text-[10px] font-mono text-sky-700 dark:text-sky-300 leading-relaxed">
                <strong>📸 URLs de Unsplash:</strong> {auditData.counts.unsplash} imagen(es) provienen de Unsplash. 
                Son las imágenes por defecto del sistema. Cuando subas tus fotos reales desde el panel, 
                estas URLs se reemplazarán automáticamente por URLs de Firebase Storage.
              </p>
            </div>
          )}

          {auditData.counts.local > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4">
              <p className="text-[10px] font-mono text-amber-700 dark:text-amber-300 leading-relaxed">
                <strong>⚠️ URLs locales detectadas:</strong> {auditData.counts.local} imagen(es) apuntan al servidor local (<code>/uploads/</code>). 
                Usa el botón <strong>"Migrar a Firebase"</strong> arriba para subirlas a Firebase Storage, 
                luego actualiza las URLs desde el panel de administración.
              </p>
            </div>
          )}

          {auditData.counts.firebase === auditData.counts.total && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-4">
              <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 leading-relaxed">
                <strong>✅ Todas las URLs apuntan a Firebase Storage.</strong> 
                No hay URLs locales ni de Unsplash en la base de datos.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
