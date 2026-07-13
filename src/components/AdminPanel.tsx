import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  LayoutDashboard, 
  Cake, 
  ShoppingBag, 
  MessageSquare, 
  Settings, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  RefreshCw, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Clock, 
  Eye, 
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Image,
  Layers,
  Paperclip,
  Calendar,
  CreditCard,
  Printer,
  FileCheck
} from 'lucide-react';
import { Product, Order, Review, AppConfig, GalleryItem } from '../types';
import { dbService } from '../dbService';
import VoucherModal from './VoucherModal';
import ScreenshotModal from './ScreenshotModal';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

const ImageUploader = ({ 
  value, 
  onChange, 
  placeholder 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string;
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('maison_admin_token') || '';
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-admin-token': token
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onChange(data.imageUrl);
      } else {
        setError(data.error || 'Error subiendo archivo');
      }
    } catch (err) {
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
};

const getMonthlyOrderData = (orders: Order[]) => {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const counts: Record<string, number> = {};
  const sales: Record<string, number> = {};
  const currentYear = new Date().getFullYear();

  for (let m = 0; m < 12; m++) {
    const key = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
    counts[key] = 0;
    sales[key] = 0;
  }

  orders.forEach(o => {
    if (!o.date) return;
    const parts = o.date.split('-');
    if (parts.length >= 2) {
      const yr = parts[0];
      const mo = parts[1];
      const key = `${yr}-${mo}`;
      if (counts[key] !== undefined) {
        counts[key] = (counts[key] || 0) + 1;
        if (o.status === 'Entregado') {
          sales[key] = (sales[key] || 0) + o.totalPrice;
        }
      } else {
        counts[key] = 1;
        sales[key] = o.status === 'Entregado' ? o.totalPrice : 0;
      }
    }
  });

  return Object.keys(counts).sort().map(key => {
    const [yr, mo] = key.split('-');
    const monthIndex = parseInt(mo, 10) - 1;
    const monthName = months[monthIndex] || mo;
    return {
      month: `${monthName} ${yr.substring(2)}`,
      "Pedidos": counts[key],
      "Ventas": sales[key],
      key
    };
  });
};

interface AdminPanelProps {
  products: Product[];
  orders: Order[];
  setOrders?: React.Dispatch<React.SetStateAction<Order[]>>;
  reviews: Review[];
  galleryItems: GalleryItem[];
  config: AppConfig;
  onRefreshData: () => void;
  onLoginSuccess: () => void;
  isLoggedIn: boolean;
}

export default function AdminPanel({ 
  products, 
  orders, 
  setOrders,
  reviews, 
  galleryItems = [],
  config, 
  onRefreshData,
  onLoginSuccess,
  isLoggedIn 
}: AdminPanelProps) {
  
  // Modern Toast notification state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning'; title?: string }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success', title?: string) => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };
  
  // Auth state
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Navigation tab state inside Admin Panel
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'reviews' | 'settings' | 'images' | 'payments' | 'stock'>('dashboard');

  // State to manage viewing the dynamic auto-generated voucher modal
  const [voucherModalOrder, setVoucherModalOrder] = useState<Order | null>(null);

  // States to manage viewing verified payment screenshots inside a modal pop-up
  const [screenshotUrlToView, setScreenshotUrlToView] = useState<string | null>(null);
  const [screenshotTitleToView, setScreenshotTitleToView] = useState<string>('');

  // Excel Sheet Interactive States for Orders Log
  const [ordersSortField, setOrdersSortField] = useState<keyof Order | ''>('');
  const [ordersSortDirection, setOrdersSortDirection] = useState<'asc' | 'desc'>('desc');
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('Todos');
  const [ordersSizeFilter, setOrdersSizeFilter] = useState('Todos');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingOrderData, setEditingOrderData] = useState<Partial<Order>>({});
  
  // Manual order insertion row state
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState<Partial<Order>>({
    customerName: '',
    productName: '',
    size: 'Mediano (20 porciones)',
    flavor: 'Vainilla',
    customColor: '',
    selectedDecoration: 'Ninguna',
    totalPrice: 150,
    status: 'Pendiente',
    message: ''
  });

  // Gallery item form state
  const [newGalleryTitle, setNewGalleryTitle] = useState('');
  const [newGalleryCategory, setNewGalleryCategory] = useState('Bodas');
  const [newGalleryDate, setNewGalleryDate] = useState(new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }));
  const [newGalleryImageUrl, setNewGalleryImageUrl] = useState('');
  const [newGalleryDescription, setNewGalleryDescription] = useState('');
  const [isSavingGallery, setIsSavingGallery] = useState(false);
  const [editingGalleryItem, setEditingGalleryItem] = useState<GalleryItem | null>(null);

  // Payment Tracking States
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState<Order | null>(null);
  const [paymentStatusInput, setPaymentStatusInput] = useState<'pendiente' | 'confirmado' | 'rechazado' | 'parcial'>('pendiente');
  const [paymentMethodInput, setPaymentMethodInput] = useState<'Yape' | 'Plin' | 'Transferencia' | 'Efectivo' | 'Ninguno'>('Ninguno');
  const [montoPagadoInput, setMontoPagadoInput] = useState<number>(0);
  const [fechaPagoInput, setFechaPagoInput] = useState<string>('');
  const [confirmedByAdminInput, setConfirmedByAdminInput] = useState<string>('');
  const [voucherFileInput, setVoucherFileInput] = useState<File | null>(null);
  const [voucherPreviewUrl, setVoucherPreviewUrl] = useState<string | null>(null);
  const [isUploadingVoucher, setIsUploadingVoucher] = useState<boolean>(false);

  // States for exclusive Payments tab
  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [paymentsFilter, setPaymentsFilter] = useState<'all' | 'no_screenshot' | 'has_screenshot'>('all');
  const [uploadingReceiptOrderId, setUploadingReceiptOrderId] = useState<string | null>(null);

  // Physical Cake Stock States
  const [stockList, setStockList] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState<boolean>(false);
  const [isCreatingStock, setIsCreatingStock] = useState<boolean>(false);
  const [editingStockItem, setEditingStockItem] = useState<any | null>(null);

  // Stock Form States
  const [stockName, setStockName] = useState<string>('');
  const [stockProductId, setStockProductId] = useState<string>('custom');
  const [stockFlavor, setStockFlavor] = useState<string>('Vainilla');
  const [stockSize, setStockSize] = useState<string>('Mediano (20 porciones)');
  const [stockDecoration, setStockDecoration] = useState<string>('Estándar de la Casa');
  const [stockQuantity, setStockQuantity] = useState<number>(1);
  const [stockNotes, setStockNotes] = useState<string>('');
  const [stockImageUrl, setStockImageUrl] = useState<string>('');

  // Stock Assignment state
  const [orderToAssignStock, setOrderToAssignStock] = useState<Order | null>(null);
  const [isAssigningStock, setIsAssigningStock] = useState<boolean>(false);

  // Fetch stock handler
  const handleFetchStock = async () => {
    try {
      setLoadingStock(true);
      const data = await dbService.getCakeStock();
      setStockList(data);
    } catch (err) {
      console.error("Error loading stock:", err);
    } finally {
      setLoadingStock(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      handleFetchStock();
    }
  }, [isLoggedIn]);

  // Handle Save Stock Item
  const handleSaveStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockName) {
      showToast('Por favor, ingresa el nombre identificador.', 'warning', 'Formulario incompleto');
      return;
    }
    try {
      const targetId = editingStockItem ? editingStockItem.id : `stock-${Date.now()}`;
      const defaultImg = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80';
      const finalImg = stockImageUrl || defaultImg;

      const newItem = {
        id: targetId,
        name: stockName,
        productId: stockProductId,
        flavor: stockFlavor,
        size: stockSize,
        decoration: stockDecoration,
        quantity: Number(stockQuantity) || 0,
        createdAt: editingStockItem ? editingStockItem.createdAt : new Date().toISOString(),
        notes: stockNotes,
        imageUrl: finalImg
      };

      await dbService.saveCakeStock(newItem);
      showToast(
        editingStockItem ? `El pastel en stock "${stockName}" ha sido actualizado.` : `Se ha agregado "${stockName}" al stock físico.`,
        'success',
        'Stock Físico'
      );
      setEditingStockItem(null);
      setIsCreatingStock(false);
      clearStockForm();
      handleFetchStock();
    } catch (err) {
      console.error(err);
      showToast('Error al guardar el pastel en stock.', 'error', 'Error');
    }
  };

  const clearStockForm = () => {
    setStockName('');
    setStockProductId('custom');
    setStockFlavor('Vainilla');
    setStockSize('Mediano (20 porciones)');
    setStockDecoration('Estándar de la Casa');
    setStockQuantity(1);
    setStockNotes('');
    setStockImageUrl('');
  };

  const handleStartEditStock = (item: any) => {
    setEditingStockItem(item);
    setStockName(item.name);
    setStockProductId(item.productId || 'custom');
    setStockFlavor(item.flavor);
    setStockSize(item.size);
    setStockDecoration(item.decoration);
    setStockQuantity(item.quantity);
    setStockNotes(item.notes || '');
    setStockImageUrl(item.imageUrl || '');
    setIsCreatingStock(true);
  };

  const handleDeleteStock = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas retirar este pastel del stock físico?')) {
      try {
        await dbService.deleteCakeStock(id);
        showToast('Pastel eliminado del stock físico.', 'info', 'Inventario');
        handleFetchStock();
      } catch (err) {
        showToast('Error al intentar eliminar del stock.', 'error', 'Error');
      }
    }
  };

  const handleConfirmAssignStock = async (stockId: string) => {
    if (!orderToAssignStock) return;
    try {
      setIsAssigningStock(true);
      const res = await dbService.assignStockToOrder(orderToAssignStock.id, stockId);
      showToast(res.message || 'Pedido completado con éxito desde stock físico.', 'success', 'Despacho Expreso');
      setOrderToAssignStock(null);
      onRefreshData(); // reload orders list
      handleFetchStock(); // reload stock quantities
    } catch (err: any) {
      showToast(err.message || 'Ocurrió un error al asignar el stock.', 'error', 'Error de asignación');
    } finally {
      setIsAssigningStock(false);
    }
  };

  const handleStartEditGallery = (item: GalleryItem) => {
    setEditingGalleryItem(item);
    setNewGalleryTitle(item.title);
    setNewGalleryCategory(item.category);
    setNewGalleryDate(item.date);
    setNewGalleryImageUrl(item.imageUrl);
    setNewGalleryDescription(item.description || '');
  };

  const handleCancelEditGallery = () => {
    setEditingGalleryItem(null);
    setNewGalleryTitle('');
    setNewGalleryCategory('Bodas');
    setNewGalleryDate(new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }));
    setNewGalleryImageUrl('');
    setNewGalleryDescription('');
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
      title: newGalleryTitle,
      category: newGalleryCategory,
      date: newGalleryDate,
      imageUrl: newGalleryImageUrl,
      description: newGalleryDescription,
    };

    try {
      await dbService.saveGalleryItem(itemData);
      handleCancelEditGallery();
      onRefreshData();
      showToast(
        editingGalleryItem ? 'Imagen de la galería actualizada correctamente.' : 'Imagen agregada a la galería familiar con éxito.',
        'success',
        'Galería de Arte'
      );
    } catch (err) {
      console.error('Error saving gallery item:', err);
      showToast('Ocurrió un error al intentar guardar la imagen en la galería.', 'error', 'Error');
    } finally {
      setIsSavingGallery(false);
    }
  };

  const handleDeleteGalleryItem = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta imagen de la galería?')) {
      try {
        await dbService.deleteGalleryItem(id);
        if (editingGalleryItem && editingGalleryItem.id === id) {
          handleCancelEditGallery();
        }
        onRefreshData();
        showToast('Imagen retirada de la galería de fotos.', 'info', 'Galería');
      } catch (err) {
        console.error('Error deleting gallery item:', err);
        showToast('Ocurrió un error al eliminar la imagen de la galería.', 'error', 'Error');
      }
    }
  };

  // Products CRUD form states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState(100);
  const [prodCategory, setProdCategory] = useState('Cumpleaños');
  const [prodFlavors, setProdFlavors] = useState('');
  const [prodDecorations, setProdDecorations] = useState('');
  const [prodPrepTime, setProdPrepTime] = useState('48 horas');
  const [prodImage, setProdImage] = useState('');

  // Settings form states
  const [setWhatsapp, setSetWhatsapp] = useState(config.whatsappNumber);
  const [setFb, setSetFb] = useState(config.facebookUrl);
  const [setIg, setSetIg] = useState(config.instagramUrl);
  const [setEmail, setSetEmail] = useState(config.email);
  const [setAddress, setSetAddress] = useState(config.address);
  const [setHours, setSetHours] = useState(config.openingHours);
  const [setSeoTitle, setSetSeoTitle] = useState(config.seoTitle);
  const [setSeoDesc, setSetSeoDesc] = useState(config.seoDescription);
  const [heroTitle, setHeroTitle] = useState(config.heroTitle || '');
  const [heroDescription, setHeroDescription] = useState(config.heroDescription || '');
  const [heroBadge, setHeroBadge] = useState(config.heroBadge || '');
  const [heroImage, setHeroImage] = useState(config.heroImage || '');
  const [aboutTitle, setAboutTitle] = useState(config.aboutTitle || '');
  const [aboutDescription, setAboutDescription] = useState(config.aboutDescription || '');
  const [aboutImage, setAboutImage] = useState(config.aboutImage || '');
  const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');

  // Sync state when config updates asynchronously from parent Firestore load
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
      setHeroTitle(config.heroTitle || '');
      setHeroDescription(config.heroDescription || '');
      setHeroBadge(config.heroBadge || '');
      setHeroImage(config.heroImage || '');
      setAboutTitle(config.aboutTitle || '');
      setAboutDescription(config.aboutDescription || '');
      setAboutImage(config.aboutImage || '');
      setLogoUrl(config.logoUrl || '');
    }
  }, [config]);

  // Review reply state
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [reviewReplyText, setReviewReplyText] = useState('');

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const result = await dbService.adminLogin(password);
    if (result.success) {
      onLoginSuccess();
      showToast('Sesión de administración autorizada. ¡Hola Edwin!', 'success', 'Acceso Concedido');
    } else {
      const errorMsg = result.error || 'Contraseña incorrecta. Inténtalo de nuevo.';
      setLoginError(errorMsg);
      showToast('Credenciales incorrectas.', 'error', 'Acceso Denegado');
    }
  };

  // Stats calculation
  const totalOrders = orders.length;
  const acceptedOrders = orders.filter(o => o.status === 'Entregado');
  const totalSales = acceptedOrders.reduce((acc, o) => acc + o.totalPrice, 0);
  const pendingOrdersCount = orders.filter(o => o.status === 'Pendiente').length;
  const inPrepOrdersCount = orders.filter(o => o.status === 'Preparando').length;

  // Most sold cake analysis
  const cakeCountMap: Record<string, number> = {};
  orders.forEach(o => {
    if (o.status !== 'Cancelado') {
      cakeCountMap[o.productName] = (cakeCountMap[o.productName] || 0) + 1;
    }
  });
  const sortedCakes = Object.entries(cakeCountMap).sort((a, b) => b[1] - a[1]);

  // Handle Save Product (Create or Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodPrice) {
      showToast('Por favor, ingresa el nombre y el precio base.', 'warning', 'Formulario incompleto');
      return;
    }

    const flavorsArray = prodFlavors.split(',').map(s => s.trim()).filter(Boolean);
    const decorationsArray = prodDecorations.split(',').map(s => s.trim()).filter(Boolean);

    const targetId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;
    const targetImages = prodImage ? [prodImage] : (editingProduct ? editingProduct.images : ['https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80']);

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
      showToast(
        editingProduct ? `El modelo "${prodName}" se ha guardado correctamente.` : `Pastel "${prodName}" creado y agregado al catálogo público.`,
        'success',
        'Catálogo de Pasteles'
      );
      // Reset forms
      setEditingProduct(null);
      setIsCreatingProduct(false);
      clearProductForm();
    } catch (err) {
      console.error('Error saving product:', err);
      showToast('Ocurrió un error al guardar el producto.', 'error', 'Error');
    }
  };

  const clearProductForm = () => {
    setProdName('');
    setProdDesc('');
    setProdPrice(100);
    setProdCategory('Cumpleaños');
    setProdFlavors('');
    setProdDecorations('');
    setProdPrepTime('48 horas');
    setProdImage('');
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
    setProdImage((prod.images && prod.images[0]) || '');
    setIsCreatingProduct(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este modelo de pastel de forma permanente?')) {
      try {
        await dbService.deleteProduct(id);
        onRefreshData();
        showToast('El pastel se ha eliminado permanentemente del catálogo.', 'info', 'Pastel retirado');
      } catch (err) {
        showToast('Error al intentar eliminar el pastel.', 'error', 'Error');
      }
    }
  };

  // Handle Save Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: AppConfig = {
      whatsappNumber: setWhatsapp,
      facebookUrl: setFb,
      instagramUrl: setIg,
      email: setEmail,
      address: setAddress,
      openingHours: setHours,
      seoTitle: setSeoTitle,
      seoDescription: setSeoDesc,
      maintenanceMode: config.maintenanceMode,
      heroTitle,
      heroDescription,
      heroBadge,
      heroImage,
      aboutTitle,
      aboutDescription,
      aboutImage,
      logoUrl
    };

    try {
      await dbService.saveConfig(newConfig);
      onRefreshData();
      showToast('Configuración del negocio actualizada en tiempo real.', 'success', 'Ajustes guardados');
    } catch (err) {
      console.error('Error saving config:', err);
      showToast('Ocurrió un error al guardar los ajustes.', 'error', 'Error');
    }
  };

  // Handle Save Images from Images Tab
  const handleSaveImagesConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: AppConfig = {
      whatsappNumber: setWhatsapp,
      facebookUrl: setFb,
      instagramUrl: setIg,
      email: setEmail,
      address: setAddress,
      openingHours: setHours,
      seoTitle: setSeoTitle,
      seoDescription: setSeoDesc,
      maintenanceMode: config.maintenanceMode,
      heroTitle,
      heroDescription,
      heroBadge,
      heroImage,
      aboutTitle,
      aboutDescription,
      aboutImage,
      logoUrl
    };

    try {
      await dbService.saveConfig(newConfig);
      onRefreshData();
      showToast('Imágenes del hero e historia guardadas correctamente.', 'success', 'Imágenes guardadas');
    } catch (err) {
      console.error('Error saving config images:', err);
      showToast('Error al intentar actualizar las imágenes de cabecera.', 'error', 'Error');
    }
  };

  // Handle Review Actions (Approve, Reject/Delete, Reply)
  const handleApproveReview = async (rev: Review) => {
    const updated = { ...rev, approved: true };
    try {
      await dbService.updateReview(updated);
      onRefreshData();
      showToast(`Opinión de "${rev.author}" aprobada para visualización pública.`, 'success', 'Opinión autorizada');
    } catch (err) {
      showToast('Error al intentar aprobar la opinión.', 'error', 'Error');
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (confirm('¿Deseas descartar o eliminar esta opinión?')) {
      try {
        await dbService.deleteReview(id);
        onRefreshData();
        showToast('La opinión ha sido eliminada permanentemente.', 'info', 'Opinión eliminada');
      } catch (err) {
        showToast('Error al intentar eliminar la opinión.', 'error', 'Error');
      }
    }
  };

  const handleReplyReview = async (rev: Review) => {
    const updated = { ...rev, response: reviewReplyText };
    try {
      await dbService.updateReview(updated);
      setReplyingReviewId(null);
      setReviewReplyText('');
      onRefreshData();
      showToast('Respuesta oficial publicada correctamente.', 'success', 'Respuesta guardada');
    } catch (err) {
      showToast('Error al guardar la respuesta.', 'error', 'Error');
    }
  };

  // Toggle Stock or Active state
  const handleToggleProductStock = async (prod: Product) => {
    const currentStock = prod.stock !== false;
    const updated = { ...prod, stock: !currentStock };
    try {
      await dbService.saveProduct(updated);
      onRefreshData();
      showToast(`Stock de "${prod.name}" marcado como ${updated.stock ? 'Con Stock' : 'Sin Stock'}.`, 'info', 'Stock actualizado');
    } catch (err) {
      showToast('Error al cambiar stock.', 'error', 'Error');
    }
  };

  const handleToggleProductActive = async (prod: Product) => {
    const currentActive = prod.active !== false;
    const updated = { ...prod, active: !currentActive };
    try {
      await dbService.saveProduct(updated);
      onRefreshData();
      showToast(`Visibilidad de "${prod.name}" está ahora ${updated.active ? 'Pública (Activo)' : 'Oculta (Inactivo)'}.`, 'info', 'Estado de Catálogo');
    } catch (err) {
      showToast('Error al cambiar visibilidad.', 'error', 'Error');
    }
  };

  // Update order status with immediate optimistic response
  const handleUpdateOrderStatus = async (id: string, status: Order['status']) => {
    const previousOrders = [...orders];
    
    // Perform optimistic update instantly
    if (setOrders) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    }
    
    try {
      await dbService.updateOrderStatus(id, status);
      // Quiet background refresh
      onRefreshData();
      showToast(`Pedido #${id.substring(0, 8)} actualizado a "${status}".`, 'success', 'Pedido de WhatsApp');
    } catch (err) {
      // Revert optimistic update
      if (setOrders) {
        setOrders(previousOrders);
      }
      showToast('Error al actualizar el estado de pedido.', 'error', 'Error');
    }
  };

  // Delete order with immediate optimistic response
  const handleDeleteOrder = async (id: string) => {
    if (!confirm('¿Eliminar el registro de este pedido?')) return;
    
    const previousOrders = [...orders];
    
    // Perform optimistic delete
    if (setOrders) {
      setOrders(prev => prev.filter(o => o.id !== id));
    }
    
    try {
      await dbService.deleteOrder(id);
      // Background sync
      onRefreshData();
      showToast(`Pedido #${id.substring(0, 8)} eliminado correctamente.`, 'info', 'Admin');
    } catch (err) {
      // Revert optimistic delete
      if (setOrders) {
        setOrders(previousOrders);
      }
      showToast('Error al eliminar el pedido.', 'error', 'Error');
    }
  };

  // Save edited order inline (Excel mode)
  const handleSaveInlineEdit = async (id: string) => {
    const originalOrder = orders.find(o => o.id === id);
    if (!originalOrder) return;

    const updatedOrder: Order = {
      ...originalOrder,
      ...editingOrderData,
      id // guarantee ID doesn't change
    };

    // Optimistic Update
    const previousOrders = [...orders];
    if (setOrders) {
      setOrders(prev => prev.map(o => o.id === id ? updatedOrder : o));
    }

    try {
      await dbService.updateOrder(updatedOrder);
      setEditingOrderId(null);
      setEditingOrderData({});
      showToast(`Pedido #${id.substring(0, 8)} actualizado con éxito.`, 'success', 'Planilla Excel');
      onRefreshData();
    } catch (err) {
      if (setOrders) {
        setOrders(previousOrders);
      }
      showToast('Error al actualizar el pedido.', 'error', 'Error Excel');
    }
  };

  // Insert a new order manually (Excel row insertion)
  const handleInsertManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRowData.customerName || !newRowData.productName) {
      showToast('Por favor, ingresa el nombre de cliente y el pastel elegido.', 'warning', 'Inserción inválida');
      return;
    }

    const manualId = 'ord-' + Date.now();
    const manualOrder: Order = {
      id: manualId,
      productName: newRowData.productName || '',
      productId: 'manual-cake',
      size: newRowData.size || 'Mediano (20 porciones)',
      flavor: newRowData.flavor || 'Vainilla',
      customerName: newRowData.customerName || '',
      customerEmail: newRowData.customerEmail || 'correo@simulado.com',
      customerPhone: newRowData.customerPhone || '999999999',
      deliveryDate: newRowData.deliveryDate || new Date().toISOString().split('T')[0],
      deliveryTime: newRowData.deliveryTime || '12:00',
      deliveryType: (newRowData.deliveryType as any) || 'recojo',
      deliveryAddress: newRowData.deliveryAddress || undefined,
      trackingCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      customerAge: newRowData.customerAge || '',
      message: newRowData.message || '',
      selectedDecoration: newRowData.selectedDecoration || 'Ninguna',
      customColor: newRowData.customColor || 'Estándar',
      totalPrice: Number(newRowData.totalPrice) || 150,
      status: (newRowData.status as any) || 'Pendiente',
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    };

    // Optimistic insert
    if (setOrders) {
      setOrders(prev => [manualOrder, ...prev]);
    }

    try {
      await dbService.addOrder(manualOrder);
      setIsAddingRow(false);
      setNewRowData({
        customerName: '',
        productName: '',
        size: 'Mediano (20 porciones)',
        flavor: 'Vainilla',
        customColor: '',
        selectedDecoration: 'Ninguna',
        totalPrice: 150,
        status: 'Pendiente',
        message: ''
      });
      showToast('Fila insertada correctamente en la planilla.', 'success', 'Excel Inserción');
      onRefreshData();
    } catch (err) {
      showToast('Error al insertar fila en la planilla.', 'error', 'Error');
      onRefreshData();
    }
  };

  // Open Payment Tracking Management modal
  const handleOpenPaymentModal = (ord: Order) => {
    setSelectedPaymentOrder(ord);
    setPaymentStatusInput(ord.paymentStatus || 'pendiente');
    setPaymentMethodInput(ord.paymentMethod || 'Ninguno');
    setMontoPagadoInput(ord.montoPagado ?? ord.totalPrice);
    
    // Set payment date, default to today if not set
    const today = new Date().toISOString().split('T')[0];
    setFechaPagoInput(ord.fechaPago || today);
    setConfirmedByAdminInput(ord.confirmedByAdmin || 'Carol Rosas');
    
    // Reset file uploads
    setVoucherFileInput(null);
    setVoucherPreviewUrl(null);
  };

  // Submit payment parameters to backend
  const handleSavePaymentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentOrder) return;

    try {
      await dbService.updateOrderPayment(selectedPaymentOrder.id, {
        paymentStatus: paymentStatusInput,
        paymentMethod: paymentMethodInput,
        montoPagado: Number(montoPagadoInput) || 0,
        fechaPago: fechaPagoInput,
        confirmedByAdmin: confirmedByAdminInput
      });

      // Update in-memory list state for immediate UI feedback
      if (setOrders) {
        setOrders(prev => prev.map(o => o.id === selectedPaymentOrder.id ? {
          ...o,
          paymentStatus: paymentStatusInput,
          paymentMethod: paymentMethodInput,
          montoPagado: Number(montoPagadoInput) || 0,
          fechaPago: fechaPagoInput,
          confirmedByAdmin: confirmedByAdminInput
        } : o));
      }

      showToast(`Pago de pedido #${selectedPaymentOrder.id.substring(0, 8)} actualizado.`, 'success', 'Gestión de Pago');
      setSelectedPaymentOrder(null);
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar los detalles de pago.', 'error', 'Error de Pago');
    }
  };

  // Handle voucher file selection and create a temporary browser preview
  const handleVoucherFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVoucherFileInput(file);
      // Create local URL for previewing image before saving
      const url = URL.createObjectURL(file);
      setVoucherPreviewUrl(url);
    }
  };

  // Upload voucher to Firebase Storage via memory buffers
  const handleUploadVoucher = async () => {
    if (!selectedPaymentOrder || !voucherFileInput) return;

    setIsUploadingVoucher(true);
    try {
      const result = await dbService.uploadVoucher(selectedPaymentOrder.id, voucherFileInput);
      
      // Update local and modal states
      const updatedOrder: Order = {
        ...selectedPaymentOrder,
        voucherUrl: result.voucherUrl,
        voucherName: result.voucherName,
        voucherUploadedAt: result.voucherUploadedAt
      };

      setSelectedPaymentOrder(updatedOrder);
      if (setOrders) {
        setOrders(prev => prev.map(o => o.id === selectedPaymentOrder.id ? updatedOrder : o));
      }

      setVoucherFileInput(null);
      setVoucherPreviewUrl(null);
      showToast('Comprobante subido correctamente a Firebase Storage.', 'success', 'Voucher Guardado');
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Error al subir el comprobante de pago.', 'error', 'Error de Carga');
    } finally {
      setIsUploadingVoucher(false);
    }
  };

  // Delete voucher from Storage and database
  const handleDeleteVoucher = async () => {
    if (!selectedPaymentOrder) return;
    if (!confirm('¿Estás seguro de eliminar el comprobante de este pedido?')) return;

    try {
      // Find relative path or use saved url to identify storage ref
      // In the backend, we handle the storage path, we just pass the orderId
      await dbService.deleteVoucher(selectedPaymentOrder.id, selectedPaymentOrder.voucherUrl);

      const updatedOrder: Order = {
        ...selectedPaymentOrder,
        voucherUrl: undefined,
        voucherName: undefined,
        voucherUploadedAt: undefined
      };

      setSelectedPaymentOrder(updatedOrder);
      if (setOrders) {
        setOrders(prev => prev.map(o => o.id === selectedPaymentOrder.id ? updatedOrder : o));
      }

      showToast('Comprobante eliminado correctamente de la base de datos.', 'info', 'Voucher Removido');
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar el comprobante.', 'error', 'Error');
    }
  };

  // Export orders list to a highly professional, beautifully styled Excel spreadsheet
  const handleExportCSV = (filteredOrdersList: Order[]) => {
    // Calculate stats
    const totalSales = filteredOrdersList.reduce((acc, o) => acc + (o.totalPrice || 0), 0);
    const totalPaid = filteredOrdersList.reduce((acc, o) => acc + (o.montoPagado || 0), 0);
    
    // Header names and metadata
    const columnsConfig = [
      { label: 'Pedido ID', width: '130px' },
      { label: 'Fecha Registro', width: '100px' },
      { label: 'Cliente', width: '150px' },
      { label: 'Celular', width: '100px' },
      { label: 'Correo Electrónico', width: '160px' },
      { label: 'Celebrado / Edad', width: '140px' },
      { label: 'Modelo Pastel', width: '160px' },
      { label: 'Sabor', width: '130px' },
      { label: 'Tamaño', width: '140px' },
      { label: 'Color', width: '100px' },
      { label: 'Decoración', width: '150px' },
      { label: 'Mensaje de Azúcar', width: '200px' },
      { label: 'Método Pago', width: '110px' },
      { label: 'Estado Pago', width: '110px' },
      { label: 'Monto Pagado', width: '115px' },
      { label: 'Tipo Entrega', width: '100px' },
      { label: 'Fecha Entrega', width: '110px' },
      { label: 'Hora Entrega', width: '90px' },
      { label: 'Dirección Entrega', width: '220px' },
      { label: 'Notas / Indicaciones', width: '250px' },
      { label: 'Origen de Fabricación', width: '180px' },
      { label: 'Precio Total', width: '115px' },
      { label: 'Estado Pedido', width: '115px' }
    ];

    const totalColumns = columnsConfig.length;

    // Excel XML definitions and inline CSS styles for high fidelity rendering in MS Excel
    let excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/html; charset=UTF-8"/>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Maison Rosas Pedidos</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table {
            border-collapse: collapse;
            font-family: 'Segoe UI', Arial, sans-serif;
          }
          td, th {
            border: 1px solid #e4e4e7;
            padding: 8px 10px;
            font-size: 11px;
            vertical-align: middle;
            color: #3f3f46;
          }
          th {
            background-color: #be185d;
            color: #ffffff;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            border: 1px solid #9d174d;
            height: 32px;
            text-align: center;
          }
          .title-row {
            font-family: 'Georgia', serif;
            font-size: 18px;
            font-weight: bold;
            color: #be185d;
            height: 35px;
          }
          .subtitle-row {
            font-size: 10px;
            color: #71717a;
            font-style: italic;
            height: 20px;
          }
          .meta-label {
            font-weight: bold;
            color: #4b5563;
            font-size: 10px;
            background-color: #f9fafb;
          }
          .meta-value {
            color: #1f2937;
            font-size: 10px;
            background-color: #f9fafb;
          }
          .row-even {
            background-color: #fdf2f8;
          }
          .row-odd {
            background-color: #ffffff;
          }
          .text-center {
            text-align: center;
          }
          .text-left {
            text-align: left;
          }
          .text-right {
            text-align: right;
          }
          .font-bold {
            font-weight: bold;
          }
          .mono {
            font-family: 'Consolas', 'Courier New', monospace;
            mso-number-format: "\\@";
          }
          .price-cell {
            text-align: right;
            font-weight: bold;
            color: #0f172a;
            mso-number-format: '"S/."\\ #\\,\\#\\#0\\.00';
          }
          .status-badge {
            font-weight: bold;
            text-align: center;
            border-radius: 4px;
          }
          /* Colors for order states */
          .status-pendiente {
            background-color: #fef3c7;
            color: #92400e;
          }
          .status-confirmado {
            background-color: #e0f2fe;
            color: #0369a1;
          }
          .status-preparando {
            background-color: #dbeafe;
            color: #1e40af;
          }
          .status-decoracion {
            background-color: #fae8ff;
            color: #86198f;
          }
          .status-listo {
            background-color: #d1fae5;
            color: #065f46;
          }
          .status-en_camino {
            background-color: #f3e8ff;
            color: #581c87;
          }
          .status-entregado {
            background-color: #e0e7ff;
            color: #3730a3;
          }
          .status-cancelado {
            background-color: #fee2e2;
            color: #991b1b;
          }
          /* Colors for payment states */
          .pay-pendiente {
            background-color: #fef3c7;
            color: #92400e;
          }
          .pay-confirmado {
            background-color: #d1fae5;
            color: #065f46;
          }
          .pay-rechazado {
            background-color: #fee2e2;
            color: #991b1b;
          }
          .pay-parcial {
            background-color: #ffedd5;
            color: #9a3412;
          }
          .stock-origin {
            background-color: #ecfdf5;
            color: #047857;
            font-weight: bold;
          }
          .standard-origin {
            background-color: #f3f4f6;
            color: #4b5563;
          }
          .totals-row {
            background-color: #f1f5f9;
            border-top: 2px solid #be185d;
            font-weight: bold;
            height: 30px;
          }
        </style>
      </head>
      <body>
        <table>
          <!-- Column widths definition -->
          <colgroup>
            ${columnsConfig.map(col => `<col style="width: ${col.width};" />`).join('')}
          </colgroup>

          <!-- Top Executive Summary Header -->
          <tr>
            <td colspan="${totalColumns}" class="title-row text-left">MAISON ROSAS • PASTELERÍA BOUTIQUE</td>
          </tr>
          <tr>
            <td colspan="${totalColumns}" class="subtitle-row text-left">Planilla Inteligente de Control, Logística e Inventario</td>
          </tr>
          
          <!-- Metadata block (2 column info lines) -->
          <tr>
            <td colspan="3" class="meta-label">Fecha de Reporte:</td>
            <td colspan="4" class="meta-value">${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}</td>
            <td colspan="3" class="meta-label">Total Pedidos Exportados:</td>
            <td colspan="4" class="meta-value font-bold">${filteredOrdersList.length} pedidos</td>
            <td colspan="3" class="meta-label">Total Ingresos Totales:</td>
            <td colspan="5" class="meta-value font-bold" style="color: #be185d;">S/. ${totalSales.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" class="meta-label">Exportado por:</td>
            <td colspan="4" class="meta-value">Maison Admin System</td>
            <td colspan="3" class="meta-label">Monto Total Cobrado:</td>
            <td colspan="4" class="meta-value font-bold" style="color: #047857;">S/. ${totalPaid.toFixed(2)}</td>
            <td colspan="3" class="meta-label">Monto Pendiente Cobro:</td>
            <td colspan="5" class="meta-value font-bold" style="color: #b45309;">S/. ${(totalSales - totalPaid).toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="${totalColumns}" style="height: 15px;"></td>
          </tr>

          <!-- Table Headers -->
          <tr>
            ${columnsConfig.map(col => `<th>${col.label}</th>`).join('')}
          </tr>

          <!-- Table Body -->
          ${filteredOrdersList.map((o, idx) => {
            const isEven = idx % 2 === 0;
            const rowClass = isEven ? 'row-even' : 'row-odd';
            
            // Format state classes dynamically
            const statusClass = `status-${(o.status || 'pendiente').toLowerCase().replace(' ', '_')}`;
            const payStatusClass = `pay-${(o.paymentStatus || 'pendiente').toLowerCase()}`;
            
            // Celebrated details
            const celebratedDetail = o.celebratedName 
              ? `${o.celebratedName} ${o.customerAge ? `(${o.customerAge} años)` : ''}`
              : (o.customerAge ? `${o.customerAge} años` : '-');

            // Stock source detail
            const originClass = o.fulfilledFromStock ? 'stock-origin' : 'standard-origin';
            const originText = o.fulfilledFromStock ? 'Vitrina / Stock Físico' : 'Elaboración Fábrica';

            return `
              <tr class="${rowClass}">
                <td class="mono text-left">${o.id}</td>
                <td class="text-center">${o.date || ''}</td>
                <td class="text-left font-bold" style="color: #1e293b;">${o.customerName || ''}</td>
                <td class="mono text-center">${o.customerPhone || ''}</td>
                <td class="text-left">${o.customerEmail || ''}</td>
                <td class="text-left">${celebratedDetail}</td>
                <td class="text-left font-bold" style="color: #be185d;">${o.productName || ''}</td>
                <td class="text-left">${o.flavor || ''}</td>
                <td class="text-left">${o.size || ''}</td>
                <td class="text-left">${o.customColor || '-'}</td>
                <td class="text-left">${o.selectedDecoration || ''}</td>
                <td class="text-left" style="font-style: italic;">${o.message ? `"${o.message.replace(/"/g, '&quot;')}"` : '-'}</td>
                <td class="text-center font-bold">${o.paymentMethod || 'Ninguno'}</td>
                <td class="text-center"><span class="status-badge ${payStatusClass}">${(o.paymentStatus || 'pendiente').toUpperCase()}</span></td>
                <td class="price-cell">${o.montoPagado || 0}</td>
                <td class="text-center font-bold" style="text-transform: uppercase;">${o.deliveryType === 'recojo' ? '📦 RECOJO' : '🚚 DOMICILIO'}</td>
                <td class="text-center">${o.deliveryDate || '-'}</td>
                <td class="text-center">${o.deliveryTime || '-'}</td>
                <td class="text-left">${o.deliveryAddress || '-'}</td>
                <td class="text-left" style="color: #6b7280; font-size: 10px;">${o.specialNotes || '-'}</td>
                <td class="text-center"><span class="status-badge ${originClass}">${originText}</span></td>
                <td class="price-cell">${o.totalPrice || 0}</td>
                <td class="text-center"><span class="status-badge ${statusClass}">${(o.status || 'Pendiente').toUpperCase()}</span></td>
              </tr>
            `;
          }).join('')}

          <!-- Totals/Summary Row at the bottom -->
          <tr class="totals-row">
            <td colspan="14" class="text-right font-bold" style="padding-right: 15px;">TOTAL DE LA PLANILLA:</td>
            <td class="price-cell" style="background-color: #f1f5f9; border-top: 2px solid #be185d;">${totalPaid}</td>
            <td colspan="6" class="text-right font-bold">SUMATORIA VENTAS:</td>
            <td class="price-cell" style="background-color: #fdf2f8; border-top: 2px solid #be185d; color: #be185d;">${totalSales}</td>
            <td style="background-color: #f1f5f9;"></td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Process file download
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `maison_rosas_planilla_ventas_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Planilla de Excel Profesional exportada con éxito.', 'success', 'Exportación Exitosa');
  };

  // Render Login page if not authenticated
  if (!isLoggedIn) {
    return (
      <section className="min-h-screen flex items-center justify-center pt-24 bg-brand-bg dark:bg-zinc-950 px-4 relative overflow-hidden">
        {/* Animated fluid background nodes */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-75">
          <div className="absolute top-[20%] left-[15%] w-[350px] h-[350px] rounded-full bg-brand-200/40 dark:bg-brand-950/20 blur-3xl animate-blob-1" />
          <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-brand-300/35 dark:bg-brand-900/15 blur-3xl animate-blob-2" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md liquid-glass liquid-glass-sheen p-8 text-center space-y-6 z-10 relative border border-white/40 dark:border-zinc-800/60 shadow-xl"
          id="admin-login-card"
        >
          <div className="mx-auto w-12 h-12 bg-white/40 dark:bg-zinc-800/40 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center border border-white/60 dark:border-zinc-700/60 shadow-sm">
            <Lock className="h-5 w-5" />
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 font-bold">
              PORTAL DE GESTIÓN
            </span>
            <h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white mt-1">
              Maison Rosas Admin
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Ingresa la contraseña de la familia Rosas Albines para acceder al panel.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              required
              placeholder="Contraseña del panel"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 liquid-glass-input text-sm placeholder-zinc-400/80 focus:outline-none text-zinc-800 dark:text-white text-center shadow-inner"
              id="admin-password-input"
            />

            {loginError && (
              <p className="text-xs text-red-500 font-medium" id="login-error-msg">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider btn-glow transition-all duration-300 hover:scale-[1.01] cursor-pointer"
              id="admin-login-submit"
            >
              Entrar al Panel
            </button>
          </form>

          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Passphrase demo: <code className="bg-white/40 dark:bg-zinc-800/40 px-1.5 py-0.5 rounded font-mono">ADMIN_PASSWORD_PLACEHOLDER</code>
          </p>
        </motion.div>

        {/* Modern Liquid Glass Toast Container for Login Screen */}
        <div className="fixed top-6 right-6 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none" id="toasts-portal-login">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.9, rotate: -1 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                layout
                className="pointer-events-auto liquid-glass liquid-glass-sheen border border-white/40 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xl flex items-start space-x-3 backdrop-blur-xl"
                id={`toast-${toast.id}`}
              >
                <div className="mt-0.5 shrink-0">
                  {toast.type === 'success' && (
                    <div className="w-5 h-5 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  {toast.type === 'error' && (
                    <div className="w-5 h-5 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </div>
                  )}
                  {toast.type === 'info' && (
                    <div className="w-5 h-5 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center">
                      <Sparkles className="h-3 w-3" />
                    </div>
                  )}
                  {toast.type === 'warning' && (
                    <div className="w-5 h-5 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center">
                      <Clock className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {toast.title && (
                    <h5 className="text-[10px] font-mono font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                      {toast.title}
                    </h5>
                  )}
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 leading-relaxed font-sans">
                    {toast.message}
                  </p>
                </div>
                <button
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-brand-bg dark:bg-zinc-950 min-h-screen relative overflow-hidden">
      {/* Animated fluid background nodes */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-75">
        <div className="absolute top-[10%] left-[5%] w-[450px] h-[450px] rounded-full bg-brand-100/40 dark:bg-brand-950/15 blur-3xl animate-blob-1" />
        <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] rounded-full bg-brand-200/30 dark:bg-brand-900/10 blur-3xl animate-blob-2" />
        <div className="absolute top-[40%] right-[30%] w-[350px] h-[350px] rounded-full bg-rose-100/30 dark:bg-rose-950/10 blur-3xl animate-blob-3" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Admin Header with navigation */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/20 dark:border-zinc-800 pb-6 mb-8 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1 bg-brand-500 text-white rounded-md text-[9px] font-mono uppercase font-bold tracking-wider shadow-sm">
                PRO
              </span>
              <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">
                Sesión Segura • Edwin Raúl Rosas Albines
              </span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-zinc-950 dark:text-white mt-1">
              Panel Administrativo Maison
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => { 
                onRefreshData(); 
                showToast('Datos sincronizados correctamente con Cloud Firestore.', 'info', 'Sincronizado');
              }}
              className="p-2.5 border border-white/30 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/40 rounded-xl hover:bg-white/60 dark:hover:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 transition-all hover:scale-[1.03] shadow-sm flex items-center justify-center cursor-pointer"
              title="Sincronizar Firestore"
              id="admin-refresh-data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap md:space-x-2 gap-2 p-2 mb-8 liquid-glass border border-white/35 dark:border-zinc-800/40 rounded-3xl shadow-sm" id="admin-panel-tabs">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'products', label: 'Cakes / Plantillas', icon: Cake },
            { id: 'stock', label: 'Gestión de Stock', icon: Layers },
            { id: 'orders', label: 'Pedidos WhatsApp', icon: ShoppingBag },
            { id: 'payments', label: 'Comprobantes WhatsApp', icon: CreditCard },
            { id: 'reviews', label: 'Opiniones Clientes', icon: MessageSquare },
            { id: 'images', label: 'Imágenes & Galería', icon: Image },
            { id: 'settings', label: 'Ajustes Tienda', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center justify-center md:justify-start space-x-2 px-3 py-3 md:px-5 md:py-3.5 rounded-2xl text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 scale-[1.02]'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white/40 dark:hover:bg-zinc-800/40'
                }`}
                id={`admin-tab-btn-${tab.id}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* CONTENT SWITCHES */}
        <div id="admin-tab-content">
          
          {/* 1. DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats bento boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="dashboard-stats-grid">
                
                <div className="liquid-glass liquid-glass-sheen p-6 rounded-3xl border border-white/30 dark:border-zinc-800/40 shadow-md flex items-center justify-between transition-all duration-300 hover:scale-[1.01]">
                  <div>
                    <span className="text-xs font-mono font-semibold text-zinc-400 dark:text-zinc-400 block uppercase">Ventas de Pedidos</span>
                    <span className="text-2xl font-serif font-bold text-zinc-900 dark:text-white mt-1 block">S/. {totalSales}</span>
                    <span className="text-[10px] text-emerald-500 font-medium flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" /> {acceptedOrders.length} {acceptedOrders.length === 1 ? 'pedido entregado' : 'pedidos entregados'}
                    </span>
                  </div>
                  <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>

                <div className="liquid-glass liquid-glass-sheen p-6 rounded-3xl border border-white/30 dark:border-zinc-800/40 shadow-md flex items-center justify-between transition-all duration-300 hover:scale-[1.01]">
                  <div>
                    <span className="text-xs font-mono font-semibold text-zinc-400 dark:text-zinc-400 block uppercase">Total Pedidos</span>
                    <span className="text-2xl font-serif font-bold text-zinc-900 dark:text-white mt-1 block">{totalOrders}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-1">Registrados en la plataforma</span>
                  </div>
                  <div className="p-4 bg-brand-500/10 text-brand-500 rounded-2xl border border-brand-500/20">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                </div>

                <div className="liquid-glass liquid-glass-sheen p-6 rounded-3xl border border-white/30 dark:border-zinc-800/40 shadow-md flex items-center justify-between transition-all duration-300 hover:scale-[1.01]">
                  <div>
                    <span className="text-xs font-mono font-semibold text-zinc-400 dark:text-zinc-400 block uppercase">Pendientes de Charla</span>
                    <span className="text-2xl font-serif font-bold text-zinc-900 dark:text-white mt-1 block">{pendingOrdersCount}</span>
                    <span className="text-[10px] text-amber-500 block mt-1">Requieren coordinar</span>
                  </div>
                  <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>

                <div className="liquid-glass liquid-glass-sheen p-6 rounded-3xl border border-white/30 dark:border-zinc-800/40 shadow-md flex items-center justify-between transition-all duration-300 hover:scale-[1.01]">
                  <div>
                    <span className="text-xs font-mono font-semibold text-zinc-400 dark:text-zinc-400 block uppercase">En Preparación</span>
                    <span className="text-2xl font-serif font-bold text-zinc-900 dark:text-white mt-1 block">{inPrepOrdersCount}</span>
                    <span className="text-[10px] text-blue-500 block mt-1">En el horno de Carol</span>
                  </div>
                  <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/20">
                    <Cake className="h-5 w-5" />
                  </div>
                </div>

              </div>

              {/* recharts Monthly Orders Volume & Sales Chart */}
              <div className="liquid-glass liquid-glass-sheen p-6 rounded-3xl border border-white/30 dark:border-zinc-800/40 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-brand-500 animate-pulse" />
                      Crecimiento de Ventas & Volumen de Pedidos
                    </h3>
                    <p className="text-xs text-zinc-400">Volumen mensual total recibido y facturación estimada (S/.) para Maison Rosas</p>
                  </div>
                  <div className="flex items-center space-x-4 text-[10px] font-mono font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                      <span className="w-2.5 h-2.5 bg-brand-500 rounded-full inline-block"></span>
                      Pedidos Recibidos
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
                      Ventas Entregadas (S/.)
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full animate-fade-in" style={{ minHeight: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={getMonthlyOrderData(orders)}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef728e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef728e" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800/40" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#888888" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10}
                        fontFamily="JetBrains Mono, ui-monospace, monospace"
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="#ef728e" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false} 
                        dx={-5}
                        fontFamily="JetBrains Mono, ui-monospace, monospace"
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="#10b981" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false} 
                        dx={5}
                        fontFamily="JetBrains Mono, ui-monospace, monospace"
                        tickFormatter={(v) => `S/.${v}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          border: '1px solid #e4e4e7',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                          color: '#18181b',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Area yAxisId="left" type="monotone" dataKey="Pedidos" stroke="#ef728e" strokeWidth={2} fillOpacity={1} fill="url(#colorOrders)" name="Total Pedidos" />
                      <Area yAxisId="right" type="monotone" dataKey="Ventas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" name="Ventas Entregadas" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Graphical Analysis & popular cakes */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Custom Stylized Progress Bars of Cake popularity */}
                <div className="lg:col-span-7 liquid-glass liquid-glass-sheen p-6 border border-white/30 dark:border-zinc-800/40 shadow-md">
                  <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-white mb-6">
                    Rendimiento de Modelos Más Pedidos
                  </h3>

                  {sortedCakes.length === 0 ? (
                    <div className="text-center py-12 text-zinc-400 text-xs font-mono">
                      Aún no hay pedidos suficientes para calcular estadísticas.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sortedCakes.map(([cakeName, count], idx) => {
                        const maxCount = Math.max(...sortedCakes.map(c => c[1]));
                        const percentage = (count / maxCount) * 100;
                        return (
                          <div key={cakeName} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-sans font-semibold text-zinc-800 dark:text-zinc-200">{cakeName}</span>
                              <span className="font-mono text-zinc-400">{count} pedidos</span>
                            </div>
                            <div className="w-full h-3 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-full overflow-hidden border border-white/10">
                              <div 
                                className="h-full bg-brand-500 rounded-full shadow-[0_0_8px_rgba(239,114,142,0.4)]" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick actions panel */}
                <div className="lg:col-span-5 liquid-glass liquid-glass-sheen p-6 border border-white/30 dark:border-zinc-800/40 shadow-md flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-white mb-2">
                      Accesos Rápidos
                    </h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-400 leading-relaxed font-sans mb-6">
                      Maison Rosas funciona con sincronización en tiempo real. Utiliza estos accesos para gestionar los estados comerciales.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => { setActiveTab('products'); setIsCreatingProduct(true); }}
                      className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-brand-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left transition-all"
                    >
                      <Plus className="h-5 w-5 text-brand-500 mb-2" />
                      <span className="text-xs font-mono font-bold uppercase block text-zinc-800 dark:text-zinc-200">Nuevo Pastel</span>
                      <span className="text-[10px] text-zinc-400 mt-1 block">Agregar al catálogo</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('orders')}
                      className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-brand-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left transition-all"
                    >
                      <ShoppingBag className="h-5 w-5 text-brand-500 mb-2" />
                      <span className="text-xs font-mono font-bold uppercase block text-zinc-800 dark:text-zinc-200">Pedidos ({pendingOrdersCount})</span>
                      <span className="text-[10px] text-zinc-400 mt-1 block">Pendientes de charla</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 2. PRODUCTS / TEMPLATES CRUD */}
          {activeTab === 'products' && (
            <div className="space-y-8">
              
              {/* Product list or Form switcher */}
              {isCreatingProduct || editingProduct ? (
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm max-w-2xl mx-auto">
                  <h3 className="text-xl font-serif font-bold text-zinc-900 dark:text-white mb-6">
                    {editingProduct ? `Editar Pastel: ${editingProduct.name}` : 'Crear Nuevo Modelo de Pastel'}
                  </h3>

                  <form onSubmit={handleSaveProduct} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Nombre del Pastel</label>
                        <input
                          type="text"
                          required
                          value={prodName}
                          onChange={(e) => setProdName(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Precio Base (S/.)</label>
                        <input
                          type="number"
                          required
                          value={prodPrice}
                          onChange={(e) => setProdPrice(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Descripción de Autor (Carol)</label>
                      <textarea
                        rows={4}
                        value={prodDesc}
                        onChange={(e) => setProdDesc(e.target.value)}
                        placeholder="Describe la receta, texturas, rellenos y la presentación artística de Carol para este modelo de pastel..."
                        className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800 dark:text-white resize-y"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Categoría</label>
                        <select
                          value={prodCategory}
                          onChange={(e) => setProdCategory(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                        >
                          <option value="Bodas">Bodas</option>
                          <option value="Cumpleaños">Cumpleaños</option>
                          <option value="Infantiles">Infantiles</option>
                          <option value="Aniversarios">Aniversarios</option>
                          <option value="Especiales">Especiales</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Tiempo de Preparación</label>
                        <input
                          type="text"
                          value={prodPrepTime}
                          onChange={(e) => setProdPrepTime(e.target.value)}
                          placeholder="Ej: 48 horas"
                          className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Sabores (Separados por coma)</label>
                        <input
                          type="text"
                          placeholder="Chocolate, Vainilla, Red Velvet"
                          value={prodFlavors}
                          onChange={(e) => setProdFlavors(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Decoraciones (Separadas por coma)</label>
                        <input
                          type="text"
                          placeholder="Flores Frescas, Macarons, Trufas"
                          value={prodDecorations}
                          onChange={(e) => setProdDecorations(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Imagen del Pastel</label>
                      <ImageUploader
                        value={prodImage}
                        onChange={setProdImage}
                        placeholder="Escribe URL de imagen o sube un archivo local..."
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <button
                        type="button"
                        onClick={() => { setEditingProduct(null); setIsCreatingProduct(false); clearProductForm(); }}
                        className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 hover:bg-zinc-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider"
                      >
                        Guardar Pastel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-white">
                      Catálogo Activo en Web ({products.length} modelos)
                    </h3>
                    <button
                      onClick={() => setIsCreatingProduct(true)}
                      className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-sm"
                      id="create-product-btn"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Agregar Pastel</span>
                    </button>
                  </div>

                  {/* Products list grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="admin-products-list">
                    {products.map((prod) => (
                      <div
                        key={prod.id}
                        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 flex flex-col justify-between"
                        id={`admin-product-item-${prod.id}`}
                      >
                        <div className="flex space-x-4">
                          <img
                            src={(prod.images && prod.images[0]) || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80'}
                            alt={prod.name}
                            className="w-16 h-16 rounded-xl object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-mono font-bold text-brand-600 dark:text-brand-400 uppercase">
                              {prod.category}
                            </span>
                            <h4 className="font-serif font-bold text-sm text-zinc-900 dark:text-white truncate">
                              {prod.name}
                            </h4>
                            <span className="font-mono text-xs font-bold text-zinc-500 mt-0.5 block">
                              S/. {prod.basePrice}
                            </span>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed italic">
                              {prod.description}
                            </p>
                          </div>
                        </div>

                        {/* Interactive toggles */}
                        <div className="grid grid-cols-2 gap-4 my-4 py-3 border-y border-zinc-100 dark:border-zinc-800/50 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500">Stock:</span>
                            <button
                              onClick={() => handleToggleProductStock(prod)}
                              className={`flex items-center ${prod.stock ? 'text-emerald-500' : 'text-red-500'}`}
                            >
                              {prod.stock ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500">Activo:</span>
                            <button
                              onClick={() => handleToggleProductActive(prod)}
                              className={`flex items-center ${prod.active ? 'text-emerald-500' : 'text-zinc-400'}`}
                            >
                              {prod.active ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                            </button>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => startEditProduct(prod)}
                            className="p-2 border border-zinc-100 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 text-zinc-500 hover:text-brand-500"
                            title="Editar pastel"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="p-2 border border-zinc-100 dark:border-zinc-800 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500"
                            title="Eliminar de Firestore"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>

                </div>
              )}

            </div>
          )}

          {/* 3. ORDERS LOG TABLE (SOPHISTICATED EXCEL-LIKE SPREADSHEET) */}
          {activeTab === 'orders' && (() => {
            // Apply filtering
            const filteredOrders = orders.filter(ord => {
              const searchLower = ordersSearch.toLowerCase();
              const matchesSearch = !ordersSearch || 
                ord.id.toLowerCase().includes(searchLower) ||
                (ord.customerName || '').toLowerCase().includes(searchLower) ||
                (ord.productName || '').toLowerCase().includes(searchLower) ||
                (ord.flavor || '').toLowerCase().includes(searchLower) ||
                (ord.customColor || '').toLowerCase().includes(searchLower) ||
                (ord.selectedDecoration || '').toLowerCase().includes(searchLower) ||
                (ord.message || '').toLowerCase().includes(searchLower);

              const matchesStatus = ordersStatusFilter === 'Todos' || ord.status === ordersStatusFilter;
              const matchesSize = ordersSizeFilter === 'Todos' || ord.size.includes(ordersSizeFilter);

              return matchesSearch && matchesStatus && matchesSize;
            });

            // Apply sorting
            const sortedAndFilteredOrders = [...filteredOrders].sort((a, b) => {
              if (!ordersSortField) return 0;
              let aVal = a[ordersSortField] ?? '';
              let bVal = b[ordersSortField] ?? '';
              if (typeof aVal === 'string') aVal = aVal.toLowerCase();
              if (typeof bVal === 'string') bVal = bVal.toLowerCase();
              if (aVal < bVal) return ordersSortDirection === 'asc' ? -1 : 1;
              if (aVal > bVal) return ordersSortDirection === 'asc' ? 1 : -1;
              return 0;
            });

            const totalFilteredSales = filteredOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

            const toggleSort = (field: keyof Order) => {
              if (ordersSortField === field) {
                setOrdersSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
              } else {
                setOrdersSortField(field);
                setOrdersSortDirection('desc');
              }
            };

            return (
              <div className="space-y-6">
                
                {/* Excel Ribbon Control Panel */}
                <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h4 className="text-base font-serif font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <span className="bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase">EXCEL PRO</span>
                        Planilla Inteligente de Pedidos (Maison Sheet)
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1">Soporta ordenamiento, filtros avanzados, inserción rápida, exportación a Excel Profesional con diseño y edición directa inline.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => handleExportCSV(filteredOrders)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                        title="Exportar Planilla Excel Profesional con Diseño, Colores y Estadísticas"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        <span>Exportar Excel Pro</span>
                      </button>

                      <button
                        onClick={() => setIsAddingRow(prev => !prev)}
                        className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer ${
                          isAddingRow 
                            ? 'bg-zinc-500 hover:bg-zinc-600 text-white' 
                            : 'bg-brand-500 hover:bg-brand-600 text-white'
                        }`}
                      >
                        {isAddingRow ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        <span>{isAddingRow ? 'Cancelar Fila' : 'Nueva Fila'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Search and Filters Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <div>
                      <label className="block text-[9px] font-mono font-bold uppercase text-zinc-400 mb-1">Buscador General</label>
                      <input
                        type="text"
                        value={ordersSearch}
                        onChange={(e) => setOrdersSearch(e.target.value)}
                        placeholder="Buscar por ID, Cliente, Pastel..."
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono font-bold uppercase text-zinc-400 mb-1">Filtrar por Estado</label>
                      <select
                        value={ordersStatusFilter}
                        onChange={(e) => setOrdersStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                      >
                        <option value="Todos">Todos los Estados</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="En conversación">Charlando</option>
                        <option value="Aceptado">Aceptado</option>
                        <option value="Preparando">Preparando</option>
                        <option value="Listo">Listo</option>
                        <option value="Entregado">Entregado</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono font-bold uppercase text-zinc-400 mb-1">Filtrar por Tamaño</label>
                      <select
                        value={ordersSizeFilter}
                        onChange={(e) => setOrdersSizeFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                      >
                        <option value="Todos">Todos los Tamaños</option>
                        <option value="Pequeño">Pequeño</option>
                        <option value="Mediano">Mediano</option>
                        <option value="Grande">Grande</option>
                      </select>
                    </div>

                    {/* Quick KPIs inside the ribbon */}
                    <div className="flex items-center justify-around bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2">
                      <div className="text-center">
                        <span className="block text-[8px] font-mono uppercase text-zinc-400">Pedidos Filtrados</span>
                        <span className="text-xs font-mono font-bold text-zinc-800 dark:text-white">{filteredOrders.length}</span>
                      </div>
                      <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800"></div>
                      <div className="text-center">
                        <span className="block text-[8px] font-mono uppercase text-zinc-400">Total S/. (Filtrado)</span>
                        <span className="text-xs font-mono font-bold text-brand-500">S/. {totalFilteredSales}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spreadsheet Table Container */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-md">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs table-fixed min-w-[1200px]">
                      {/* Excel column labels (A, B, C...) */}
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-zinc-400">
                          <th className="w-12 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">#</th>
                          <th className="w-24 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">A (ID)</th>
                          <th className="w-28 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">B (Fecha)</th>
                          <th className="w-44 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">C (Cliente / Edad)</th>
                          <th className="w-48 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">D (Pastel Elegido)</th>
                          <th className="w-32 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">E (Tamaño)</th>
                          <th className="w-32 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">F (Sabor)</th>
                          <th className="w-36 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">G (Detalles / Color)</th>
                          <th className="w-48 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">H (Mensaje Azúcar)</th>
                          <th className="w-28 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">I (Precio)</th>
                          <th className="w-36 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">J (Estado)</th>
                          <th className="w-36 border-r border-zinc-200 dark:border-zinc-800/60 p-1 text-center font-normal">K (Pago)</th>
                          <th className="w-24 p-1 text-center font-normal">L (Acción)</th>
                        </tr>
                        
                        {/* Interactive Excel Column Headers */}
                        <tr className="bg-zinc-100/80 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 font-mono text-zinc-500 select-none">
                          <th className="border-r border-zinc-200 dark:border-zinc-800/60 p-2 text-center text-[10px]">Row</th>
                          <th className="border-r border-zinc-200 dark:border-zinc-800/60 p-2 text-left cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-850" onClick={() => toggleSort('id')}>
                            ID {ordersSortField === 'id' ? (ordersSortDirection === 'asc' ? '▲' : '▼') : ''}
                          </th>
                          <th className="border-r border-zinc-200 dark:border-zinc-800/60 p-2 text-left cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-850" onClick={() => toggleSort('date')}>
                            Fecha {ordersSortField === 'date' ? (ordersSortDirection === 'asc' ? '▲' : '▼') : ''}
                          </th>
                          <th className="border-r border-zinc-200 dark:border-zinc-800/60 p-2 text-left cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-850" onClick={() => toggleSort('customerName')}>
                            Cliente {ordersSortField === 'customerName' ? (ordersSortDirection === 'asc' ? '▲' : '▼') : ''}
                          </th>
                          <th className="border-r border-zinc-200 dark:border-zinc-800/60 p-2 text-left cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-850" onClick={() => toggleSort('productName')}>
                            Pastel Modelo {ordersSortField === 'productName' ? (ordersSortDirection === 'asc' ? '▲' : '▼') : ''}
                          </th>
                          <th className="border-r border-zinc-200 dark:border-zinc-800/60 p-2 text-left cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-850" onClick={() => toggleSort('size')}>
                            Tamaño {ordersSortField === 'size' ? (ordersSortDirection === 'asc' ? '▲' : '▼') : ''}
                          </th>
                          <th className="border-r border-zinc-200 dark:border-zinc-800/60 p-2 text-left cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-850" onClick={() => toggleSort('flavor')}>
                            Sabor {ordersSortField === 'flavor' ? (ordersSortDirection === 'asc' ? '▲' : '▼') : ''}
                          </th>
                          <th className="border-r border-zinc-200 dark:border-zinc-800/60 p-2 text-left">Decor / Color</th>
                          <th className="border-r border-zinc-200 dark:border-zinc-800/60 p-2 text-left">Mensaje Azúcar</th>
                          <th className="border-r border-zinc-200 dark:border-zinc-800/60 p-2 text-left cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-850" onClick={() => toggleSort('totalPrice')}>
                            S/. Total {ordersSortField === 'totalPrice' ? (ordersSortDirection === 'asc' ? '▲' : '▼') : ''}
                          </th>
                          <th className="border-r border-zinc-200 dark:border-zinc-800/60 p-2 text-left cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-850" onClick={() => toggleSort('status')}>
                            Estado {ordersSortField === 'status' ? (ordersSortDirection === 'asc' ? '▲' : '▼') : ''}
                          </th>
                          <th className="border-r border-zinc-200 dark:border-zinc-800/60 p-2 text-left cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-850" onClick={() => toggleSort('paymentStatus')}>
                            Pago {ordersSortField === 'paymentStatus' ? (ordersSortDirection === 'asc' ? '▲' : '▼') : ''}
                          </th>
                          <th className="p-2 text-center">Acción</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                        
                        {/* Blank Quick Insertion Row (Insert Row Like Excel) */}
                        {isAddingRow && (
                          <tr className="bg-emerald-50/40 dark:bg-emerald-950/20 border-b border-emerald-200 dark:border-emerald-900/60">
                            <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60 text-center text-emerald-600 font-bold font-mono">NEW</td>
                            
                            {/* A: ID */}
                            <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60 italic text-zinc-400">auto-gen</td>
                            
                            {/* B: Date */}
                            <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60 text-zinc-400">Hoy (auto)</td>
                            
                            {/* C: Customer */}
                            <td className="p-1 border-r border-zinc-200 dark:border-zinc-800/60">
                              <input
                                type="text"
                                placeholder="Cliente..."
                                value={newRowData.customerName || ''}
                                onChange={(e) => setNewRowData(prev => ({ ...prev, customerName: e.target.value }))}
                                className="w-full px-1.5 py-1 bg-white dark:bg-zinc-950 border border-emerald-300 dark:border-emerald-800 rounded font-sans text-xs focus:outline-none"
                              />
                            </td>

                            {/* D: Product */}
                            <td className="p-1 border-r border-zinc-200 dark:border-zinc-800/60">
                              <select
                                value={newRowData.productName || ''}
                                onChange={(e) => setNewRowData(prev => ({ ...prev, productName: e.target.value }))}
                                className="w-full px-1.5 py-1 bg-white dark:bg-zinc-950 border border-emerald-300 dark:border-emerald-800 rounded font-sans text-xs focus:outline-none"
                              >
                                <option value="">Selecciona pastel...</option>
                                {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                <option value="Pastel Especial Rosas">Pastel Especial Rosas</option>
                              </select>
                            </td>

                            {/* E: Size */}
                            <td className="p-1 border-r border-zinc-200 dark:border-zinc-800/60">
                              <select
                                value={newRowData.size || ''}
                                onChange={(e) => setNewRowData(prev => ({ ...prev, size: e.target.value }))}
                                className="w-full px-1.5 py-1 bg-white dark:bg-zinc-950 border border-emerald-300 dark:border-emerald-800 rounded font-sans text-xs focus:outline-none"
                              >
                                <option value="Pequeño (10 porciones)">Pequeño (10p)</option>
                                <option value="Mediano (20 porciones)">Mediano (20p)</option>
                                <option value="Grande (30 porciones)">Grande (30p)</option>
                              </select>
                            </td>

                            {/* F: Flavor */}
                            <td className="p-1 border-r border-zinc-200 dark:border-zinc-800/60">
                              <select
                                value={newRowData.flavor || ''}
                                onChange={(e) => setNewRowData(prev => ({ ...prev, flavor: e.target.value }))}
                                className="w-full px-1.5 py-1 bg-white dark:bg-zinc-950 border border-emerald-300 dark:border-emerald-800 rounded font-sans text-xs focus:outline-none"
                              >
                                <option value="Vainilla">Vainilla</option>
                                <option value="Chocolate">Chocolate</option>
                                <option value="Red Velvet">Red Velvet</option>
                                <option value="Manjar Blanco">Manjar Blanco</option>
                                <option value="Tres Leches">Tres Leches</option>
                              </select>
                            </td>

                            {/* G: Decoration / Color */}
                            <td className="p-1 border-r border-zinc-200 dark:border-zinc-800/60 space-y-1">
                              <input
                                type="text"
                                placeholder="Decoración..."
                                value={newRowData.selectedDecoration || ''}
                                onChange={(e) => setNewRowData(prev => ({ ...prev, selectedDecoration: e.target.value }))}
                                className="w-full px-1 py-0.5 bg-white dark:bg-zinc-950 border border-emerald-300 dark:border-emerald-800 rounded text-[10px] focus:outline-none"
                              />
                              <input
                                type="text"
                                placeholder="Color..."
                                value={newRowData.customColor || ''}
                                onChange={(e) => setNewRowData(prev => ({ ...prev, customColor: e.target.value }))}
                                className="w-full px-1 py-0.5 bg-white dark:bg-zinc-950 border border-emerald-300 dark:border-emerald-800 rounded text-[10px] focus:outline-none"
                              />
                            </td>

                            {/* H: Sugar message */}
                            <td className="p-1 border-r border-zinc-200 dark:border-zinc-800/60">
                              <input
                                type="text"
                                placeholder="Mensaje..."
                                value={newRowData.message || ''}
                                onChange={(e) => setNewRowData(prev => ({ ...prev, message: e.target.value }))}
                                className="w-full px-1.5 py-1 bg-white dark:bg-zinc-950 border border-emerald-300 dark:border-emerald-800 rounded font-sans text-xs focus:outline-none"
                              />
                            </td>

                            {/* I: Price */}
                            <td className="p-1 border-r border-zinc-200 dark:border-zinc-800/60">
                              <input
                                type="number"
                                value={newRowData.totalPrice || 150}
                                onChange={(e) => setNewRowData(prev => ({ ...prev, totalPrice: Number(e.target.value) }))}
                                className="w-full px-1.5 py-1 bg-white dark:bg-zinc-950 border border-emerald-300 dark:border-emerald-800 rounded text-xs font-mono font-bold text-zinc-900 dark:text-white focus:outline-none"
                              />
                            </td>

                            {/* J: Status */}
                            <td className="p-1 border-r border-zinc-200 dark:border-zinc-800/60">
                              <select
                                value={newRowData.status || 'Pendiente'}
                                onChange={(e) => setNewRowData(prev => ({ ...prev, status: e.target.value as any }))}
                                className="w-full px-1 py-1 bg-white dark:bg-zinc-950 border border-emerald-300 dark:border-emerald-800 rounded text-[10px] uppercase font-bold focus:outline-none"
                              >
                                <option value="Pendiente">Pendiente</option>
                                <option value="En conversación">Charlando</option>
                                <option value="Aceptado">Aceptado</option>
                                <option value="Preparando">Preparando</option>
                                <option value="Listo">Listo</option>
                                <option value="Entregado">Entregado</option>
                                <option value="Cancelado">Cancelado</option>
                              </select>
                            </td>

                            {/* K: Action */}
                            <td className="p-1 text-center">
                              <button
                                onClick={handleInsertManualOrder}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-sm text-[10px] font-bold uppercase cursor-pointer"
                                title="Insertar Fila en base"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        )}

                        {/* Order Rows */}
                        {sortedAndFilteredOrders.map((ord, index) => {
                          const isEditing = editingOrderId === ord.id;
                          return (
                            <tr 
                              key={ord.id} 
                              className={`border-b border-zinc-200 dark:border-zinc-800/60 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/15 ${
                                ord.status === 'Cancelado' ? 'opacity-60 bg-red-50/5 dark:bg-red-950/2' :
                                ord.status === 'Entregado' ? 'bg-emerald-50/10 dark:bg-emerald-950/5' : ''
                              }`}
                              id={`order-row-${ord.id}`}
                            >
                              {/* Excel index labels on left margin */}
                              <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/80 dark:bg-zinc-950/60 text-center font-mono text-zinc-400 select-none">
                                {index + 1}
                              </td>

                              {/* A: ID (Click to copy) */}
                              <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60 font-mono text-zinc-500 font-semibold select-all cursor-pointer hover:text-brand-500" title="Click para copiar ID" onClick={() => {
                                navigator.clipboard.writeText(ord.id);
                                showToast('ID de pedido copiado al portapapeles.', 'info', 'Copiado');
                              }}>
                                {ord.id.substring(0, 8)}
                              </td>

                              {/* B: Date */}
                              <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60 font-mono text-zinc-500">
                                {isEditing ? (
                                  <input
                                    type="date"
                                    value={editingOrderData.date || ord.date || ''}
                                    onChange={(e) => setEditingOrderData(prev => ({ ...prev, date: e.target.value }))}
                                    className="px-1.5 py-0.5 bg-white dark:bg-zinc-950 border border-brand-300 rounded font-mono text-[10px] w-full"
                                  />
                                ) : (
                                  ord.date
                                )}
                              </td>

                              {/* C: Customer / Contact */}
                              <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60">
                                {isEditing ? (
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      value={editingOrderData.customerName || ''}
                                      onChange={(e) => setEditingOrderData(prev => ({ ...prev, customerName: e.target.value }))}
                                      className="px-1.5 py-0.5 bg-white dark:bg-zinc-950 border border-brand-300 rounded font-sans text-xs w-full"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Edad (ej: 25)"
                                      value={editingOrderData.customerAge || ''}
                                      onChange={(e) => setEditingOrderData(prev => ({ ...prev, customerAge: e.target.value }))}
                                      className="px-1.5 py-0.5 bg-white dark:bg-zinc-950 border border-brand-300 rounded text-[10px] w-full"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <span className="font-bold text-zinc-900 dark:text-white font-sans">{ord.customerName}</span>
                                    {ord.customerAge && (
                                      <span className="block text-[9px] text-brand-600 font-mono mt-0.5">Edad: {ord.customerAge} años</span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* D: Product Chosen */}
                              <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingOrderData.productName || ''}
                                    onChange={(e) => setEditingOrderData(prev => ({ ...prev, productName: e.target.value }))}
                                    className="px-1.5 py-0.5 bg-white dark:bg-zinc-950 border border-brand-300 rounded font-sans text-xs w-full"
                                  />
                                ) : (
                                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{ord.productName}</span>
                                )}
                              </td>

                              {/* E: Size */}
                              <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60">
                                {isEditing ? (
                                  <select
                                    value={editingOrderData.size || ord.size}
                                    onChange={(e) => setEditingOrderData(prev => ({ ...prev, size: e.target.value }))}
                                    className="px-1 py-0.5 bg-white dark:bg-zinc-950 border border-brand-300 rounded text-[10px] w-full"
                                  >
                                    <option value="Pequeño (10 porciones)">Pequeño (10p)</option>
                                    <option value="Mediano (20 porciones)">Mediano (20p)</option>
                                    <option value="Grande (30 porciones)">Grande (30p)</option>
                                  </select>
                                ) : (
                                  <span className="text-zinc-500 font-medium">{ord.size}</span>
                                )}
                              </td>

                              {/* F: Flavor */}
                              <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60">
                                {isEditing ? (
                                  <select
                                    value={editingOrderData.flavor || ord.flavor}
                                    onChange={(e) => setEditingOrderData(prev => ({ ...prev, flavor: e.target.value }))}
                                    className="px-1 py-0.5 bg-white dark:bg-zinc-950 border border-brand-300 rounded text-[10px] w-full"
                                  >
                                    <option value="Vainilla">Vainilla</option>
                                    <option value="Chocolate">Chocolate</option>
                                    <option value="Red Velvet">Red Velvet</option>
                                    <option value="Manjar Blanco">Manjar Blanco</option>
                                    <option value="Tres Leches">Tres Leches</option>
                                  </select>
                                ) : (
                                  <span className="text-zinc-500 font-semibold">{ord.flavor}</span>
                                )}
                              </td>

                              {/* G: Decoration details / Color */}
                              <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60">
                                {isEditing ? (
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      placeholder="Decoración"
                                      value={editingOrderData.selectedDecoration || ''}
                                      onChange={(e) => setEditingOrderData(prev => ({ ...prev, selectedDecoration: e.target.value }))}
                                      className="px-1 py-0.5 bg-white dark:bg-zinc-950 border border-brand-300 rounded text-[10px] w-full"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Color"
                                      value={editingOrderData.customColor || ''}
                                      onChange={(e) => setEditingOrderData(prev => ({ ...prev, customColor: e.target.value }))}
                                      className="px-1 py-0.5 bg-white dark:bg-zinc-950 border border-brand-300 rounded text-[10px] w-full"
                                    />
                                  </div>
                                ) : (
                                  <div className="space-y-0.5 text-zinc-500 text-[10px]">
                                    <div>Decor: <span className="text-zinc-800 dark:text-zinc-300 font-medium">{ord.selectedDecoration || 'Estándar'}</span></div>
                                    <div>Color: <span className="text-zinc-800 dark:text-zinc-300 font-medium">{ord.customColor || 'Estándar'}</span></div>
                                  </div>
                                )}
                              </td>

                              {/* H: Message */}
                              <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60 italic text-zinc-550 dark:text-zinc-350">
                                {isEditing ? (
                                  <textarea
                                    value={editingOrderData.message || ''}
                                    onChange={(e) => setEditingOrderData(prev => ({ ...prev, message: e.target.value }))}
                                    className="px-1.5 py-0.5 bg-white dark:bg-zinc-950 border border-brand-300 rounded font-sans text-[10px] w-full"
                                    rows={2}
                                  />
                                ) : (
                                  ord.message ? `"${ord.message}"` : <span className="text-zinc-300 font-sans">—</span>
                                )}
                              </td>

                              {/* I: Price */}
                              <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60 text-right font-mono font-bold text-zinc-900 dark:text-white">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editingOrderData.totalPrice ?? ord.totalPrice}
                                    onChange={(e) => setEditingOrderData(prev => ({ ...prev, totalPrice: Number(e.target.value) }))}
                                    className="px-1.5 py-0.5 bg-white dark:bg-zinc-950 border border-brand-300 rounded font-mono text-xs w-full text-right"
                                  />
                                ) : (
                                  `S/. ${ord.totalPrice}`
                                )}
                              </td>

                              {/* J: Status Dropdown */}
                              <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60">
                                <select
                                  value={isEditing ? (editingOrderData.status || ord.status) : ord.status}
                                  onChange={(e) => {
                                    const val = e.target.value as any;
                                    if (isEditing) {
                                      setEditingOrderData(prev => ({ ...prev, status: val }));
                                    } else {
                                      handleUpdateOrderStatus(ord.id, val);
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase cursor-pointer border border-zinc-200 dark:border-zinc-700/80 w-full text-center outline-none ${
                                    (isEditing ? (editingOrderData.status || ord.status) : ord.status) === 'Pendiente' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
                                    (isEditing ? (editingOrderData.status || ord.status) : ord.status) === 'En conversación' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400' :
                                    (isEditing ? (editingOrderData.status || ord.status) : ord.status) === 'Aceptado' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' :
                                    (isEditing ? (editingOrderData.status || ord.status) : ord.status) === 'Preparando' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400' :
                                    (isEditing ? (editingOrderData.status || ord.status) : ord.status) === 'Listo' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400' :
                                    (isEditing ? (editingOrderData.status || ord.status) : ord.status) === 'Entregado' ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400' :
                                    'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                                  }`}
                                >
                                  <option value="Pendiente">Pendiente</option>
                                  <option value="En conversación">Charlando</option>
                                  <option value="Aceptado">Aceptado</option>
                                  <option value="Preparando">Preparando</option>
                                  <option value="Listo">Listo</option>
                                  <option value="Entregado">Entregado</option>
                                  <option value="Cancelado">Cancelado</option>
                                </select>
                              </td>

                              {/* K: Pago */}
                              <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60 text-center">
                                <button
                                  onClick={() => handleOpenPaymentModal(ord)}
                                  className={`px-2 py-1 rounded text-[10px] font-sans font-bold flex items-center justify-center gap-1 cursor-pointer border border-zinc-200 dark:border-zinc-700/80 w-full hover:scale-102 transition-all shadow-sm ${
                                    ord.paymentStatus === 'confirmado' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300' :
                                    ord.paymentStatus === 'rechazado' ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border-red-300' :
                                    ord.paymentStatus === 'parcial' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-300' :
                                    'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300'
                                  }`}
                                >
                                  <span className="truncate">
                                    {ord.paymentStatus === 'confirmado' ? `S/. ${ord.montoPagado ?? ord.totalPrice} Conf.` :
                                     ord.paymentStatus === 'rechazado' ? 'Rechazado' :
                                     ord.paymentStatus === 'parcial' ? `S/. ${ord.montoPagado ?? 0} Parc.` :
                                     'Pendiente'}
                                  </span>
                                  {ord.voucherUrl && (
                                    <Paperclip className="h-3 w-3 shrink-0 text-zinc-500 dark:text-zinc-400" />
                                  )}
                                </button>
                              </td>

                              {/* L: Actions */}
                              <td className="p-2 text-center">
                                <div className="flex items-center justify-center space-x-1.5">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleSaveInlineEdit(ord.id)}
                                        className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded cursor-pointer"
                                        title="Guardar fila"
                                      >
                                        <Check className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingOrderId(null);
                                          setEditingOrderData({});
                                        }}
                                        className="p-1 bg-zinc-400 hover:bg-zinc-500 text-white rounded cursor-pointer"
                                        title="Cancelar edición"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {ord.status !== 'Listo' && ord.status !== 'Entregado' && ord.status !== 'Cancelado' && (
                                        <button
                                          onClick={() => setOrderToAssignStock(ord)}
                                          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-brand-500 hover:text-brand-600 rounded cursor-pointer transition-colors"
                                          title="Asignar desde Stock Físico"
                                        >
                                          <Layers className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          setEditingOrderId(ord.id);
                                          setEditingOrderData({ ...ord });
                                        }}
                                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-brand-500 rounded cursor-pointer"
                                        title="Editar fila"
                                      >
                                        <Edit3 className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteOrder(ord.id)}
                                        className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-400 hover:text-red-500 rounded cursor-pointer"
                                        title="Eliminar fila"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {sortedAndFilteredOrders.length === 0 && (
                          <tr>
                            <td colSpan={13} className="text-center py-12 text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/30">
                              No se encontraron registros que coincidan con la búsqueda o los filtros aplicados.
                            </td>
                          </tr>
                        )}
                      </tbody>

                      {/* Excel-style summary row at the bottom */}
                      <tfoot>
                        <tr className="bg-zinc-100 dark:bg-zinc-950 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 font-bold border-t border-zinc-300 dark:border-zinc-800">
                          <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60 bg-zinc-200 dark:bg-zinc-900/60"></td>
                          <td colSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800/60 uppercase">Planilla Resumen</td>
                          <td colSpan={6} className="p-2 border-r border-zinc-200 dark:border-zinc-800/60 text-right uppercase">
                            Recuento: <span className="text-brand-500 font-mono font-bold">{filteredOrders.length} pedidos</span>
                          </td>
                          <td className="p-2 border-r border-zinc-200 dark:border-zinc-800/60 text-right text-emerald-600 font-mono font-bold text-xs bg-emerald-500/5">
                            S/. {totalFilteredSales}
                          </td>
                          <td colSpan={2} className="p-2 bg-zinc-200/50 dark:bg-zinc-900/50">SUMA (Filtrado)</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Spreadsheet Helper Disclaimer */}
                <div className="flex items-center space-x-2 text-[10px] text-zinc-400 font-mono leading-relaxed bg-zinc-50 dark:bg-zinc-900/30 p-3.5 border border-zinc-100 dark:border-zinc-800/60 rounded-2xl">
                  <span className="text-amber-500">💡</span>
                  <p>Maison Sheet se auto-guarda en tiempo real en la nube segura de Firebase Firestore de Maison Rosas. Haz clic en el ícono de lápiz (<Edit3 className="h-2.5 w-2.5 inline" />) para abrir una fila entera y editar cualquier celda de forma directa, tal como en Microsoft Excel.</p>
                </div>
              </div>
            );
          })()}

          {/* 4. REVIEWS MANAGEMENT */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-white">
                Opiniones y Calificaciones de Clientes ({reviews.length} total)
              </h3>

              <div className="grid grid-cols-1 gap-4" id="admin-reviews-list">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-serif font-bold text-zinc-950 dark:text-white">
                            {rev.author}
                          </h4>
                          <span className="text-[10px] text-zinc-400 font-sans">
                            {rev.role}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-amber-400 font-mono text-xs">{'★'.repeat(rev.rating)}</span>
                          <span className="text-[10px] font-mono text-zinc-400">{rev.date}</span>
                          <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold">
                            Pastel: {rev.cakeModel}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {!rev.approved && (
                          <button
                            onClick={() => handleApproveReview(rev)}
                            className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] font-mono uppercase tracking-wider font-bold flex items-center space-x-1 hover:bg-emerald-600 shadow-sm"
                          >
                            <Check className="h-3 w-3" />
                            <span>Aprobar</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReview(rev.id)}
                          className="p-1.5 border border-zinc-100 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-300 italic mt-4 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-900 leading-relaxed font-sans">
                      "{rev.comment}"
                    </p>

                    {/* Replies */}
                    <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                      {rev.response ? (
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-bold text-brand-600 uppercase">Respuesta de Carol & Edwin:</span>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">"{rev.response}"</p>
                        </div>
                      ) : (
                        <div>
                          {replyingReviewId === rev.id ? (
                            <div className="space-y-2 mt-2">
                              <textarea
                                placeholder="Escribe tu respuesta con amor..."
                                value={reviewReplyText}
                                onChange={(e) => setReviewReplyText(e.target.value)}
                                className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
                                rows={2}
                              />
                              <div className="flex space-x-1 justify-end">
                                <button
                                  onClick={() => { setReplyingReviewId(null); setReviewReplyText(''); }}
                                  className="px-2.5 py-1.5 border rounded-lg text-[10px]"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleReplyReview(rev)}
                                  className="px-2.5 py-1.5 bg-brand-500 text-white rounded-lg text-[10px]"
                                >
                                  Responder
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReplyingReviewId(rev.id)}
                              className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-600 hover:text-brand-700"
                            >
                              + Escribir Respuesta
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                ))}
              </div>

            </div>
          )}

          {/* EXCLUSIVE SECTION FOR MANAGING WHATSAPP RECEIPTS / SCREENSHOTS */}
          {activeTab === 'payments' && (() => {
            // Local upload handler for this exclusive section
            const handleUploadReceiptForOrder = async (orderId: string, file: File) => {
              setUploadingReceiptOrderId(orderId);
              try {
                const result = await dbService.uploadVoucher(orderId, file);
                
                // Update in-memory orders list state
                if (setOrders) {
                  setOrders(prev => prev.map(o => o.id === orderId ? {
                    ...o,
                    voucherUrl: result.voucherUrl,
                    voucherName: result.voucherName,
                    voucherUploadedAt: result.voucherUploadedAt
                  } : o));
                }
                
                showToast('Captura de pago de WhatsApp archivada correctamente.', 'success', 'Comprobante Guardado');
                onRefreshData();
              } catch (err: any) {
                showToast(err.message || 'Error al subir la captura de pago.', 'error', 'Error de Subida');
              } finally {
                setUploadingReceiptOrderId(null);
              }
            };

            // Local delete handler for this exclusive section
            const handleDeleteReceiptForOrder = async (order: Order) => {
              if (!confirm(`¿Estás seguro de eliminar la captura de pago de WhatsApp del cliente ${order.customerName}?`)) return;
              
              setUploadingReceiptOrderId(order.id);
              try {
                await dbService.deleteVoucher(order.id, order.voucherUrl);
                
                // Update in-memory orders list state
                if (setOrders) {
                  setOrders(prev => prev.map(o => o.id === order.id ? {
                    ...o,
                    voucherUrl: undefined,
                    voucherName: undefined,
                    voucherUploadedAt: undefined
                  } : o));
                }
                
                showToast('Captura de pago eliminada del archivo.', 'success', 'Captura Eliminada');
                onRefreshData();
              } catch (err: any) {
                showToast(err.message || 'Error al eliminar la captura de pago.', 'error', 'Error al Eliminar');
              } finally {
                setUploadingReceiptOrderId(null);
              }
            };

            // Filter orders:
            // 1) Filter only orders with confirmed status ('confirmado') OR keep all orders but let them see confirmed ones by default
            const paymentsOrders = orders.filter(o => {
              // Search query filter
              const matchesSearch = 
                o.customerName.toLowerCase().includes(paymentsSearch.toLowerCase()) ||
                o.id.toLowerCase().includes(paymentsSearch.toLowerCase()) ||
                (o.trackingCode && o.trackingCode.toLowerCase().includes(paymentsSearch.toLowerCase()));
              
              if (!matchesSearch) return false;

              // Tab filters
              if (paymentsFilter === 'no_screenshot') {
                return o.paymentStatus === 'confirmado' && !o.voucherUrl;
              }
              if (paymentsFilter === 'has_screenshot') {
                return o.paymentStatus === 'confirmado' && o.voucherUrl;
              }
              
              // By default return all confirmed ones or ones with screenshots
              return o.paymentStatus === 'confirmado' || o.voucherUrl;
            });

            return (
              <div className="space-y-6">
                {/* Header card */}
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/85 shadow-sm">
                  <div className="flex items-center space-x-2 text-brand-500 font-mono text-[10px] font-bold uppercase tracking-wider mb-2">
                    <span>💵 Archivo de Pagos Verificados</span>
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">
                    Comprobantes & Capturas de WhatsApp
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 font-sans leading-relaxed max-w-2xl">
                    Este es un apartado exclusivo para el administrador. Una vez que confirmas el pago de un cliente desde la sección "Pedidos WhatsApp", puedes archivar aquí la captura de pantalla real (Yape, Plin o Transferencia) para llevar un registro histórico perfecto del negocio. El cliente también podrá visualizarla en su portal de seguimiento.
                  </p>
                </div>

                {/* Filters Row */}
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                  {/* Search */}
                  <div className="relative w-full md:max-w-xs">
                    <input
                      type="text"
                      placeholder="Buscar por cliente o código..."
                      value={paymentsSearch}
                      onChange={(e) => setPaymentsSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white outline-none focus:border-brand-500 transition-colors font-sans"
                    />
                    <Eye className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-3" />
                  </div>

                  {/* Status Buttons */}
                  <div className="flex space-x-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    {[
                      { id: 'all', label: 'Todos los confirmados' },
                      { id: 'no_screenshot', label: '⚠️ Sin Captura (Pendientes)' },
                      { id: 'has_screenshot', label: '✅ Con Captura (Archivados)' },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => setPaymentsFilter(btn.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                          paymentsFilter === btn.id
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950'
                            : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid list of confirmed orders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {paymentsOrders.length > 0 ? (
                    paymentsOrders.map((ord) => {
                      const isUploadingThis = uploadingReceiptOrderId === ord.id;
                      
                      return (
                        <div
                          key={ord.id}
                          className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5 hover:border-zinc-300 dark:hover:border-zinc-750 transition-colors"
                        >
                          {/* Order metadata */}
                          <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800 pb-3">
                            <div>
                              <h4 className="font-serif font-bold text-zinc-900 dark:text-white text-sm">
                                {ord.customerName}
                              </h4>
                              <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                                Cod: {ord.trackingCode} • Tel: {ord.customerPhone}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono font-bold bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 px-2.5 py-1 rounded-lg uppercase">
                              S/. {ord.totalPrice}
                            </span>
                          </div>

                          {/* Order content brief */}
                          <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400 font-sans">
                            <div>
                              <strong className="block text-[9px] font-mono text-zinc-400 uppercase">Modelo elegido</strong>
                              <span className="truncate block font-medium text-zinc-800 dark:text-zinc-200">{ord.productName}</span>
                            </div>
                            <div>
                              <strong className="block text-[9px] font-mono text-zinc-400 uppercase">Confirmado por</strong>
                              <span className="truncate block italic text-zinc-800 dark:text-zinc-200">{ord.confirmedByAdmin || 'Carol Rosas'}</span>
                            </div>
                            <div>
                              <strong className="block text-[9px] font-mono text-zinc-400 uppercase">Fecha de Confirmación</strong>
                              <span className="truncate block text-zinc-800 dark:text-zinc-200 font-mono">{ord.fechaPago || ord.date}</span>
                            </div>
                            <div>
                              <strong className="block text-[9px] font-mono text-zinc-400 uppercase">Método elegido</strong>
                              <span className="truncate block text-zinc-800 dark:text-zinc-200">{ord.paymentMethod || 'Yape / Plin'}</span>
                            </div>
                          </div>

                          {/* Screenshot evidence archiving uploader */}
                          <div className="bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl p-4 border border-zinc-150 dark:border-zinc-850 space-y-3.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-serif font-bold text-zinc-800 dark:text-zinc-300 flex items-center gap-1.5">
                                <Image className="h-4 w-4 text-zinc-500" />
                                Captura de Transacción (WhatsApp)
                              </span>
                              
                              {ord.voucherUrl ? (
                                <span className="text-[9px] font-mono bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                  ARCHIVADO
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">
                                  SIN CAPTURA
                                </span>
                              )}
                            </div>

                            {isUploadingThis ? (
                              <div className="py-6 flex flex-col items-center justify-center space-y-2 text-xs text-zinc-500">
                                <RefreshCw className="h-5 w-5 animate-spin text-brand-500" />
                                <span>Guardando en Firebase Storage...</span>
                              </div>
                            ) : ord.voucherUrl ? (
                              /* File has been uploaded preview */
                              <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm text-xs">
                                <div className="flex items-center space-x-2.5 min-w-0">
                                  <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shrink-0">
                                    <img
                                      src={ord.voucherUrl}
                                      alt="Captura WhatsApp"
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                  <div className="truncate">
                                    <span className="block font-medium text-zinc-800 dark:text-zinc-300 truncate font-mono text-[10px]">
                                      {ord.voucherName || 'captura-whatsapp.jpg'}
                                    </span>
                                    {ord.voucherUploadedAt && (
                                      <span className="block text-[9px] text-zinc-400 font-mono mt-0.5">
                                        Subido el {new Date(ord.voucherUploadedAt).toLocaleDateString('es-ES')}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1.5 shrink-0">
                                  {/* View Screenshot */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setScreenshotUrlToView(ord.voucherUrl);
                                      setScreenshotTitleToView(`Captura de Pago - Cliente: ${ord.customerName} (Cod: ${ord.trackingCode})`);
                                    }}
                                    className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors cursor-pointer"
                                    title="Ver captura en pantalla completa"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  {/* Delete Screenshot */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteReceiptForOrder(ord)}
                                    className="p-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-600 rounded-lg transition-colors cursor-pointer"
                                    title="Eliminar captura del archivo"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Dash uploader box */
                              <div className="border border-dashed border-zinc-300 dark:border-zinc-750 hover:border-brand-400 rounded-xl p-4 text-center cursor-pointer relative bg-white dark:bg-zinc-950 transition-all hover:bg-zinc-50/50">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadReceiptForOrder(ord.id, file);
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <Image className="h-5 w-5 mx-auto text-zinc-400 mb-1.5" />
                                <span className="block text-[11px] text-zinc-500 font-medium">
                                  Subir captura de pantalla de WhatsApp
                                </span>
                                <span className="block text-[9px] text-zinc-400 mt-1 font-mono">
                                  Formatos: JPEG, PNG • Máx: 10MB
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Quick printable action button */}
                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-850 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setVoucherModalOrder(ord)}
                              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Ver / Imprimir Boleta de Venta</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-1 md:col-span-2 bg-white dark:bg-zinc-900 p-12 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400">
                      <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                      <p className="text-xs font-mono">No se encontraron pedidos confirmados que coincidan con el filtro.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 5. WEB IMAGES AND GALLERY MANAGEMENT */}
          {activeTab === 'images' && (
            <div className="space-y-12">
              {/* Header */}
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm" id="admin-images-header">
                <span className="text-[10px] tracking-[0.3em] uppercase opacity-75 text-brand-500 block font-bold font-mono">
                  DISEÑO & IDENTIDAD VISUAL
                </span>
                <h3 className="text-2xl font-serif font-light italic text-zinc-900 dark:text-white mt-1">
                  Administrador de Imágenes de la Web
                </h3>
                <p className="text-xs text-zinc-500 mt-2 max-w-xl leading-relaxed">
                  Reemplaza y gestiona fácilmente las imágenes principales del sitio web, incluyendo las portadas de inicio, nuestra historia y las fotos reales de la galería de creaciones de Carol Rosas.
                </p>
              </div>

              {/* SECTION 1: COVER IMAGES (HERO & HISTORY) */}
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm" id="admin-cover-images-section">
                <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-500 mb-6 flex items-center">
                  <Image className="h-4 w-4 mr-2 text-brand-500" />
                  1. Imágenes de Portada Principal
                </h4>

                <form onSubmit={handleSaveImagesConfig} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Hero Image Block */}
                    <div className="space-y-4">
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-900">
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1 font-bold">Imagen de Inicio (Hero Image)</label>
                        <ImageUploader
                          value={heroImage}
                          onChange={setHeroImage}
                          placeholder="Escribe la URL o sube una imagen de portada..."
                        />
                        <p className="text-[10px] text-zinc-400 mt-1.5 leading-normal">
                          Esta imagen se muestra en el banner principal al entrar a la web. Se recomienda usar una foto vertical de alta calidad.
                        </p>
                      </div>

                      {/* Live Preview */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-mono uppercase text-zinc-400 block font-semibold">Vista Previa Real-Time:</span>
                        <div className="aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative flex items-center justify-center">
                          {heroImage ? (
                            <img
                              src={heroImage}
                              alt="Vista previa de Portada"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535141192574-5d4897c13636?w=600&auto=format&fit=crop&q=80';
                              }}
                            />
                          ) : (
                            <span className="text-zinc-400 text-xs font-mono">Sin imagen configurada</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* About Image Block */}
                    <div className="space-y-4">
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-900">
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1 font-bold">Imagen de Historia (Nosotros)</label>
                        <ImageUploader
                          value={aboutImage}
                          onChange={setAboutImage}
                          placeholder="Escribe la URL o sube una imagen de historia..."
                        />
                        <p className="text-[10px] text-zinc-400 mt-1.5 leading-normal">
                          Esta imagen se muestra en la sección de "Nuestra Historia de Sabor Familiar". Se recomienda una foto horizontal que exprese taller o repostería.
                        </p>
                      </div>

                      {/* Live Preview */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-mono uppercase text-zinc-400 block font-semibold">Vista Previa Real-Time:</span>
                        <div className="aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative flex items-center justify-center">
                          {aboutImage ? (
                            <img
                              src={aboutImage}
                              alt="Vista previa de Historia"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop&q=80';
                              }}
                            />
                          ) : (
                            <span className="text-zinc-400 text-xs font-mono">Sin imagen configurada</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-sm transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                      id="btn-save-cover-images"
                    >
                      Guardar Portadas Principales
                    </button>
                  </div>
                </form>
              </div>

              {/* SECTION 2: MAISON GALLERY */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="admin-gallery-section">
                {/* Add/Edit Image Form */}
                <div className="lg:col-span-5 bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm h-fit">
                  <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-500 mb-6 flex items-center">
                    {editingGalleryItem ? (
                      <>
                        <Edit3 className="h-4 w-4 mr-2 text-brand-500 animate-pulse" />
                        2. Editar Imagen de la Galería
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2 text-brand-500" />
                        2. Agregar a la Galería
                      </>
                    )}
                  </h4>

                  <form onSubmit={handleSaveGalleryItem} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Título del Pastel / Creación</label>
                      <input
                        type="text"
                        required
                        value={newGalleryTitle}
                        onChange={(e) => setNewGalleryTitle(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                        placeholder="Ej: Pastel de Rosas de Azúcar 3 Pisos"
                        id="input-gallery-title"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Categoría</label>
                        <select
                          value={newGalleryCategory}
                          onChange={(e) => setNewGalleryCategory(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                          id="select-gallery-category"
                        >
                          <option value="Bodas">Bodas</option>
                          <option value="Cumpleaños">Cumpleaños</option>
                          <option value="Infantiles">Infantiles</option>
                          <option value="Aniversarios">Aniversarios</option>
                          <option value="Especiales">Especiales</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Fecha descriptiva</label>
                        <input
                          type="text"
                          required
                          value={newGalleryDate}
                          onChange={(e) => setNewGalleryDate(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                          placeholder="Ej: Julio de 2026"
                          id="input-gallery-date"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Imagen de la Creación</label>
                      <ImageUploader
                        value={newGalleryImageUrl}
                        onChange={setNewGalleryImageUrl}
                        placeholder="Escribe la URL o sube una foto de la creación..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Descripción del Pastel / Creación</label>
                      <textarea
                        value={newGalleryDescription}
                        onChange={(e) => setNewGalleryDescription(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                        placeholder="Ej: Pastel de tres pisos con flores de azúcar hechas a mano y glaseado sedoso."
                        rows={3}
                        id="input-gallery-description"
                      />
                    </div>

                    {/* Temporary view preview of new gallery photo */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[9px] font-mono uppercase text-zinc-400 block font-semibold">Previsualización de la Foto:</span>
                      <div className="aspect-[4/5] w-full bg-zinc-50 dark:bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative flex items-center justify-center">
                        {newGalleryImageUrl ? (
                          <img
                            src={newGalleryImageUrl}
                            alt="Previsualización"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535141192574-5d4897c13636?w=600&auto=format&fit=crop&q=80';
                            }}
                          />
                        ) : (
                          <div className="text-center p-4">
                            <Image className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                            <span className="text-zinc-400 text-[10px] font-mono block">Escribe una URL para previsualizar aquí</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 pt-2">
                      <button
                        type="submit"
                        disabled={isSavingGallery}
                        className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-zinc-400 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center justify-center space-x-2"
                        id="btn-add-gallery"
                      >
                        {isSavingGallery ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <span>{editingGalleryItem ? 'Actualizar Imagen' : 'Agregar a la Galería'}</span>
                        )}
                      </button>

                      {editingGalleryItem && (
                        <button
                          type="button"
                          onClick={handleCancelEditGallery}
                          className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                          id="btn-cancel-gallery-edit"
                        >
                          Cancelar Edición
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* List and manage current gallery images */}
                <div className="lg:col-span-7 bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-500 flex items-center">
                      <Layers className="h-4 w-4 mr-2 text-brand-500" />
                      Galería Activa ({galleryItems.length} Fotos)
                    </h4>
                  </div>

                  {galleryItems.length === 0 ? (
                    <div className="text-center py-12 text-zinc-400 text-xs font-mono">
                      No hay fotos en la galería de creaciones familiares.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[750px] overflow-y-auto pr-2 scrollbar-thin">
                      {galleryItems.map((item) => (
                        <div 
                          key={item.id} 
                          className={`p-3 bg-zinc-50 dark:bg-zinc-950 border rounded-2xl flex items-start space-x-3 transition-colors group relative ${
                            editingGalleryItem?.id === item.id 
                              ? 'border-brand-500/50 shadow-sm bg-brand-50/5 dark:bg-brand-950/5' 
                              : 'border-zinc-100 dark:border-zinc-900 hover:border-zinc-200 dark:hover:border-zinc-800'
                          }`}
                        >
                          <div className="w-16 h-20 bg-zinc-200 rounded-xl overflow-hidden flex-shrink-0 relative">
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          
                          <div className="flex-1 min-w-0 pr-12 font-sans">
                            <span className="inline-block px-2 py-0.5 bg-brand-50 dark:bg-brand-950/40 text-brand-500 dark:text-brand-300 text-[8px] font-mono font-bold uppercase tracking-wide rounded-md">
                              {item.category}
                            </span>
                            <h5 className="text-xs font-bold text-zinc-800 dark:text-white truncate mt-1">
                              {item.title}
                            </h5>
                            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              {item.date}
                            </p>
                            {item.description && (
                              <p className="text-[9px] text-zinc-500 line-clamp-2 mt-1 leading-normal italic font-sans">
                                "{item.description}"
                              </p>
                            )}
                          </div>

                          <div className="absolute top-2 right-2 flex items-center space-x-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm p-1 rounded-lg border border-zinc-100 dark:border-zinc-850 shadow-sm opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200">
                            <button
                              onClick={() => handleStartEditGallery(item)}
                              className="p-1 rounded text-zinc-500 hover:text-brand-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Editar imagen"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteGalleryItem(item.id)}
                              className="p-1 rounded text-zinc-500 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Eliminar de la galería"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 5. APP SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm max-w-2xl mx-auto">
              <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-white mb-6">
                Ajustes Comerciales de Maison Rosas
              </h3>

              {/* Logo de la Marca customizable con vista previa de alta fidelidad */}
              <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-150 dark:border-zinc-800/60 mb-6" id="logo-customizer-section">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-500 mb-3 flex items-center gap-1.5">
                  <Cake className="h-4 w-4" />
                  Logo de la Marca
                </h4>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center justify-center bg-white dark:bg-zinc-900 h-14 w-14 rounded-full overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt="Logo Preview" 
                        referrerPolicy="no-referrer" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Cake className="h-6 w-6 text-brand-500" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="block text-[10px] font-mono uppercase text-zinc-400">Personalizar Ícono / Logo de la Tienda</span>
                    <ImageUploader 
                      value={logoUrl}
                      onChange={(val) => setLogoUrl(val)}
                      placeholder="URL de tu logo o sube uno"
                    />
                    <p className="text-[10px] text-zinc-400 font-sans mt-1">
                      Sube una imagen cuadrada para reemplazar el ícono de pastel por defecto en la barra de navegación manteniendo la forma y las proporciones.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Número de WhatsApp de Edwin</label>
                    <input
                      type="text"
                      required
                      value={setWhatsapp}
                      onChange={(e) => setSetWhatsapp(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Correo de Negocio</label>
                    <input
                      type="email"
                      required
                      value={setEmail}
                      onChange={(e) => setSetEmail(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Dirección del Taller Familiar</label>
                  <input
                    type="text"
                    required
                    value={setAddress}
                    onChange={(e) => setSetAddress(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Horarios de Atención</label>
                  <input
                    type="text"
                    required
                    value={setHours}
                    onChange={(e) => setSetHours(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Facebook URL</label>
                    <input
                      type="text"
                      value={setFb}
                      onChange={(e) => setSetFb(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Instagram URL</label>
                    <input
                      type="text"
                      value={setIg}
                      onChange={(e) => setSetIg(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-4" />

                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">SEO Title</label>
                  <input
                    type="text"
                    value={setSeoTitle}
                    onChange={(e) => setSetSeoTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">SEO Description</label>
                  <textarea
                    rows={2}
                    value={setSeoDesc}
                    onChange={(e) => setSetSeoDesc(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white resize-none"
                  />
                </div>

                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-4" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-500 mb-2">Personalización de Inicio / Hero</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Badge de Hero</label>
                    <input
                      type="text"
                      value={heroBadge}
                      onChange={(e) => setHeroBadge(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                      placeholder="Ej: Por Carol & Edwin Rosas Albines"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Imagen de Hero (URL)</label>
                    <input
                      type="text"
                      value={heroImage}
                      onChange={(e) => setHeroImage(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                      placeholder="URL de Unsplash u otra imagen"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Título de Hero</label>
                  <input
                    type="text"
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                    placeholder="Ej: El Arte de Compartir"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Descripción de Hero</label>
                  <textarea
                    rows={2}
                    value={heroDescription}
                    onChange={(e) => setHeroDescription(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white resize-none"
                    placeholder="Escribe la descripción del Hero..."
                  />
                </div>

                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-4" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-500 mb-2">Personalización de Sección Historia / Nosotros</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Título de Historia</label>
                    <input
                      type="text"
                      value={aboutTitle}
                      onChange={(e) => setAboutTitle(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                      placeholder="Ej: Nuestra Esencia Familiar"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Imagen de Historia (URL)</label>
                    <input
                      type="text"
                      value={aboutImage}
                      onChange={(e) => setAboutImage(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white"
                      placeholder="URL de la foto de historia"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Descripción de Historia</label>
                  <textarea
                    rows={4}
                    value={aboutDescription}
                    onChange={(e) => setAboutDescription(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white resize-none"
                    placeholder="Escribe la historia o descripción de Nosotros..."
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-sm"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-serif font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Layers className="h-5 w-5 text-brand-500" />
                    Inventario de Pasteles Listos (Vitrina / Stock Físico)
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Gestiona pasteles ya preparados físicamente que puedes asignar directamente a pedidos de clientes para entrega inmediata, saltando la etapa de horneado y decoración.
                  </p>
                </div>
                {!isCreatingStock && (
                  <button
                    onClick={() => {
                      clearStockForm();
                      setIsCreatingStock(true);
                    }}
                    className="flex items-center justify-center space-x-1.5 px-5 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-xs font-mono font-bold uppercase tracking-wider shadow-md hover:scale-[1.01] transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Agregar Pastel Listo</span>
                  </button>
                )}
              </div>

              {isCreatingStock && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-md"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-500">
                      {editingStockItem ? 'Editar Pastel en Stock Físico' : 'Registrar Nuevo Pastel en Stock Físico'}
                    </h4>
                    <button
                      onClick={() => {
                        setEditingStockItem(null);
                        setIsCreatingStock(false);
                        clearStockForm();
                      }}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveStockItem} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Pastel Base (Catálogo)</label>
                        <select
                          value={stockProductId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStockProductId(val);
                            if (val !== 'custom') {
                              const found = products.find(p => p.id === val);
                              if (found) {
                                setStockName(found.name);
                                setStockFlavor(found.flavors?.[0] || 'Vainilla');
                                setStockDecoration(found.decorations?.[0] || 'Estándar');
                                setStockImageUrl(found.images?.[0] || '');
                              }
                            } else {
                              setStockName('');
                            }
                          }}
                          className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white outline-none focus:border-brand-500 cursor-pointer"
                        >
                          <option value="custom">✦ Pastel Personalizado / Vitrina</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Nombre / Identificador del Pastel</label>
                        <input
                          type="text"
                          required
                          value={stockName}
                          onChange={(e) => setStockName(e.target.value)}
                          placeholder="Ej: Selva Negra Clásico con Cerezas"
                          className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Sabor de Bizcocho</label>
                        <select
                          value={stockFlavor}
                          onChange={(e) => setStockFlavor(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white cursor-pointer"
                        >
                          <option value="Vainilla">Vainilla</option>
                          <option value="Chocolate">Chocolate</option>
                          <option value="Chocolate Belga">Chocolate Belga</option>
                          <option value="Red Velvet">Red Velvet</option>
                          <option value="Manjar Blanco">Manjar Blanco</option>
                          <option value="Tres Leches">Tres Leches</option>
                          <option value="Lúcuma">Lúcuma</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Tamaño (Porciones)</label>
                        <select
                          value={stockSize}
                          onChange={(e) => setStockSize(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white cursor-pointer"
                        >
                          <option value="Pequeño (10 porciones)">Pequeño (10 porciones)</option>
                          <option value="Mediano (20 porciones)">Mediano (20 porciones)</option>
                          <option value="Grande (30 porciones)">Grande (30 porciones)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Decoración Acabada</label>
                        <input
                          type="text"
                          value={stockDecoration}
                          onChange={(e) => setStockDecoration(e.target.value)}
                          placeholder="Ej: Trufas y Cerezas"
                          className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white outline-none focus:border-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Cantidad de Unidades</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={stockQuantity}
                          onChange={(e) => setStockQuantity(Number(e.target.value) || 1)}
                          className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white outline-none focus:border-brand-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Notas de Vitrina</label>
                        <input
                          type="text"
                          value={stockNotes}
                          onChange={(e) => setStockNotes(e.target.value)}
                          placeholder="Ej: Elaborado el viernes, cobertura de chantilly, fresas frescas en el tope"
                          className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white outline-none focus:border-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Imagen del Pastel (URL)</label>
                        <ImageUploader
                          value={stockImageUrl}
                          onChange={(val) => setStockImageUrl(val)}
                          placeholder="URL o subir foto real"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStockItem(null);
                          setIsCreatingStock(false);
                          clearStockForm();
                        }}
                        className="px-5 py-2.5 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-sm cursor-pointer"
                      >
                        {editingStockItem ? 'Actualizar Stock' : 'Registrar en Stock'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {loadingStock ? (
                <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
                  <RefreshCw className="h-8 w-8 animate-spin text-brand-500 mb-2" />
                  <p className="text-xs font-mono">Buscando pasteles en stock físico...</p>
                </div>
              ) : stockList.length === 0 ? (
                <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-3xl">
                  <Layers className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-zinc-500">No hay pasteles registrados actualmente en el stock físico.</p>
                  <p className="text-xs text-zinc-400 mt-1">Usa el botón superior para ingresar pasteles listos para asignación inmediata.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {stockList.map((item) => {
                    const isLowStock = item.quantity === 1;
                    const isOutOfStock = item.quantity === 0;

                    return (
                      <div
                        key={item.id}
                        className={`bg-white dark:bg-zinc-900 border rounded-3xl shadow-sm overflow-hidden flex flex-col relative transition-all duration-300 hover:shadow-md ${
                          isOutOfStock ? 'border-red-200/50 dark:border-red-950/20 opacity-70' : 'border-zinc-200 dark:border-zinc-800/80'
                        }`}
                      >
                        {/* Quantity overlay */}
                        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                          <span className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-full uppercase tracking-wider shadow-sm text-white ${
                            isOutOfStock ? 'bg-red-500' :
                            isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}>
                            {isOutOfStock ? 'Agotado' : `${item.quantity} unidades`}
                          </span>
                        </div>

                        {/* Cake Image */}
                        <div className="h-44 w-full bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden">
                          <img
                            src={item.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80'}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Card body */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <h4 className="font-serif font-bold text-zinc-900 dark:text-white text-base leading-snug">
                              {item.name}
                            </h4>

                            {item.notes && (
                              <p className="text-xs text-zinc-500 italic font-sans line-clamp-2">
                                "{item.notes}"
                              </p>
                            )}

                            <div className="grid grid-cols-2 gap-2.5 pt-2 text-[11px] font-sans">
                              <div className="bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                <span className="block text-[8px] font-mono text-zinc-400 uppercase">Sabor</span>
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate block">{item.flavor}</span>
                              </div>
                              <div className="bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                <span className="block text-[8px] font-mono text-zinc-400 uppercase">Tamaño</span>
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate block">{item.size}</span>
                              </div>
                            </div>

                            <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 text-[11px]">
                              <span className="block text-[8px] font-mono text-zinc-400 uppercase">Decoración</span>
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300 block">{item.decoration}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <button
                              onClick={() => handleStartEditStock(item)}
                              className="flex-1 py-2 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1 border border-zinc-200 dark:border-zinc-700/60"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => handleDeleteStock(item.id)}
                              className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-500 rounded-xl text-xs cursor-pointer transition-all border border-red-100 dark:border-red-950/40"
                              title="Retirar del stock"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Modal de Gestión de Pagos */}
      <AnimatePresence>
        {selectedPaymentOrder && (
          <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-zinc-900 dark:text-white text-base">
                    Gestión de Pago
                  </h3>
                  <p className="text-[10px] font-mono text-zinc-400 mt-0.5 uppercase tracking-wider">
                    Pedido #{selectedPaymentOrder.id.substring(0, 8)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentOrder(null)}
                  className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSavePaymentDetails} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
                {/* Order Summary banner */}
                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl p-4 flex justify-between items-center text-xs">
                  <div>
                    <span className="block text-[9px] font-mono text-zinc-400 uppercase">Cliente</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedPaymentOrder.customerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] font-mono text-zinc-400 uppercase">Total Pedido</span>
                    <span className="font-mono font-bold text-brand-500">S/. {selectedPaymentOrder.totalPrice}</span>
                  </div>
                </div>

                {/* Grid Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-semibold">Estado de Pago</label>
                    <select
                      value={paymentStatusInput}
                      onChange={(e) => setPaymentStatusInput(e.target.value as any)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white font-medium outline-none focus:border-brand-500 transition-colors cursor-pointer"
                    >
                      <option value="pendiente">🟡 Pago pendiente</option>
                      <option value="confirmado">🟢 Pago confirmado</option>
                      <option value="rechazado">🔴 Pago rechazado</option>
                      <option value="parcial">🔵 Pago parcial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-semibold">Método de Pago</label>
                    <select
                      value={paymentMethodInput}
                      onChange={(e) => setPaymentMethodInput(e.target.value as any)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white font-medium outline-none focus:border-brand-500 transition-colors cursor-pointer"
                    >
                      <option value="Ninguno">Ninguno</option>
                      <option value="Yape">Yape</option>
                      <option value="Plin">Plin</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Efectivo">Efectivo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-semibold">Monto Pagado (S/.)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={montoPagadoInput}
                      onChange={(e) => setMontoPagadoInput(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-zinc-800 dark:text-white outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-semibold">Fecha de Confirmación</label>
                    <input
                      type="date"
                      required
                      value={fechaPagoInput}
                      onChange={(e) => setFechaPagoInput(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-zinc-800 dark:text-white outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1.5 font-semibold">Confirmado Por (Administrador)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Carol Rosas"
                    value={confirmedByAdminInput}
                    onChange={(e) => setConfirmedByAdminInput(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                 {/* Voucher management section */}
                <div className="border border-zinc-150 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-serif font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <FileCheck className="h-4 w-4 text-emerald-500" />
                      Comprobante Digital Maison Rosas
                    </h4>
                    <span className="text-[9px] font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase">
                      Auto-Generación Activa
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                    Una vez verificado el pago en WhatsApp, al guardar el pedido como <strong className="text-zinc-700 dark:text-zinc-300">"Pago confirmado"</strong>, el sistema auto-generará de forma inmediata una boleta/ticket oficial descargable e imprimible para el cliente. No es necesario subir imágenes aquí.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    {/* View/Print auto-generated voucher */}
                    <button
                      type="button"
                      onClick={() => {
                        // Create a temporary order object with current inputs to preview it instantly
                        const previewOrder: Order = {
                          ...selectedPaymentOrder,
                          paymentStatus: paymentStatusInput,
                          paymentMethod: paymentMethodInput,
                          montoPagado: Number(montoPagadoInput) || 0,
                          fechaPago: fechaPagoInput,
                          confirmedByAdmin: confirmedByAdminInput
                        };
                        setVoucherModalOrder(previewOrder);
                      }}
                      className="flex-1 py-2 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/30 dark:hover:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Ver / Imprimir Boleta</span>
                    </button>

                    {/* Go to WhatsApp receipts manager tab */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPaymentOrder(null);
                        setActiveTab('payments');
                      }}
                      className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Image className="h-3.5 w-3.5" />
                      <span>Subir Captura WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentOrder(null)}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-md"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Asignación Expresa desde Stock Físico */}
      <AnimatePresence>
        {orderToAssignStock && (
          <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="assign-stock-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-zinc-900 dark:text-white text-base">
                    Asignación Expresa desde Stock Físico
                  </h3>
                  <p className="text-[10px] font-mono text-zinc-400 mt-0.5 uppercase tracking-wider">
                    Fulfill Pedido #{orderToAssignStock.id.substring(0, 8)} desde pasteles listos
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderToAssignStock(null)}
                  className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                {/* Info block */}
                <div className="bg-brand-50/45 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-950/30 rounded-2xl p-4 text-xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase block">Pedido del Cliente</span>
                      <strong className="text-zinc-800 dark:text-zinc-200 text-sm font-serif">{orderToAssignStock.customerName}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase block">Total</span>
                      <strong className="text-brand-500 font-mono text-sm">S/. {orderToAssignStock.totalPrice}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-[11px] font-sans border-t border-brand-100/30">
                    <div>
                      <span className="text-[8px] font-mono text-zinc-400 block uppercase">Modelo Solicitado</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{orderToAssignStock.productName}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-mono text-zinc-400 block uppercase">Sabor Solicitado</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{orderToAssignStock.flavor}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-mono text-zinc-400 block uppercase">Tamaño Solicitado</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{orderToAssignStock.size}</span>
                    </div>
                  </div>
                </div>

                {/* List of physical stock items to select */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                    Pasteles Físicos en Stock Disponibles
                  </h4>

                  {stockList.filter(item => item.quantity > 0).length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 text-xs font-sans">
                      No hay pasteles en stock físico actualmente con unidades disponibles.
                      <p className="mt-1 text-[10px] text-zinc-400">Por favor, registra primero un pastel en la pestaña "Gestión de Stock".</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stockList.filter(item => item.quantity > 0).map((item) => {
                        const isExactMatch = item.flavor.toLowerCase().trim() === orderToAssignStock.flavor.toLowerCase().trim() && 
                                             item.size.toLowerCase().trim() === orderToAssignStock.size.toLowerCase().trim();

                        return (
                          <div
                            key={item.id}
                            className={`p-4 border rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-200 ${
                              isExactMatch 
                                ? 'bg-emerald-500/5 border-emerald-500/35 dark:border-emerald-500/20 shadow-sm shadow-emerald-500/5' 
                                : 'bg-zinc-50/50 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-950 overflow-hidden shrink-0 border border-zinc-200/40">
                                <img src={item.imageUrl} alt={item.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h5 className="font-serif font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                                    {item.name}
                                  </h5>
                                  {isExactMatch && (
                                    <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[8px] font-mono font-bold uppercase rounded">
                                      Coincidencia de Sabor & Tamaño
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400 flex-wrap">
                                  <span>Sabor: <strong className="text-zinc-600 dark:text-zinc-300">{item.flavor}</strong></span>
                                  <span>•</span>
                                  <span>Tamaño: <strong className="text-zinc-600 dark:text-zinc-300">{item.size}</strong></span>
                                  <span>•</span>
                                  <span>Cant: <strong className="text-brand-500 font-mono font-bold">{item.quantity}</strong></span>
                                </div>
                              </div>
                            </div>

                            <button
                              disabled={isAssigningStock}
                              onClick={() => handleConfirmAssignStock(item.id)}
                              className="sm:shrink-0 py-2 px-4 bg-zinc-900 hover:bg-black dark:bg-zinc-850 dark:hover:bg-zinc-700 text-white disabled:opacity-50 rounded-xl text-[11px] font-semibold cursor-pointer transition-all flex items-center justify-center gap-1"
                            >
                              {isAssigningStock ? 'Asignando...' : 'Asignar & Listo'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setOrderToAssignStock(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic auto-generated voucher ticket viewer modal */}
      <VoucherModal
        order={voucherModalOrder}
        isOpen={voucherModalOrder !== null}
        onClose={() => setVoucherModalOrder(null)}
      />

      {/* Verified payment screenshot popup modal */}
      <ScreenshotModal
        imageUrl={screenshotUrlToView}
        title={screenshotTitleToView}
        isOpen={screenshotUrlToView !== null}
        onClose={() => {
          setScreenshotUrlToView(null);
          setScreenshotTitleToView('');
        }}
      />

      {/* Modern Liquid Glass Toast Container */}
      <div className="fixed top-6 right-6 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none" id="toasts-portal-main">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9, rotate: -1 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              layout
              className="pointer-events-auto liquid-glass liquid-glass-sheen border border-white/40 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xl flex items-start space-x-3 backdrop-blur-xl"
              id={`toast-${toast.id}`}
            >
              <div className="mt-0.5 shrink-0">
                {toast.type === 'success' && (
                  <div className="w-5 h-5 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                {toast.type === 'error' && (
                  <div className="w-5 h-5 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </div>
                )}
                {toast.type === 'info' && (
                  <div className="w-5 h-5 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center">
                    <Sparkles className="h-3 w-3" />
                  </div>
                )}
                {toast.type === 'warning' && (
                  <div className="w-5 h-5 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center">
                    <Clock className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h5 className="text-[10px] font-mono font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    {toast.title}
                  </h5>
                )}
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 leading-relaxed font-sans">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
