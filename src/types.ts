export interface SizeOption {
  name: string; // e.g., "Pequeño (10 porciones)", "Mediano (20 porciones)", "Grande (30 porciones)"
  priceModifier: number; // added to base price
}

export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  category: string; // e.g., "Bodas", "Cumpleaños", "Infantiles", "Aniversarios", "Especiales"
  images: string[];
  flavors: string[]; // e.g., ["Chocolate", "Vainilla Francesa", "Red Velvet", "Manjar Blanco"]
  decorations: string[]; // e.g., ["Flores Naturales", "Fudge de Chocolate", "Macarons", "Hojas de Oro", "Sprinkles Premium"]
  preparationTime: string; // e.g., "48 horas", "72 horas"
  active: boolean;
  stock: boolean;
  tags: string[];
}

export interface Review {
  id: string;
  author: string;
  role?: string; // e.g., "Madre de cumpleañera", "Novia"
  rating: number; // 1 to 5
  comment: string;
  cakeModel: string; // which cake they ordered
  date: string;
  approved: boolean;
  response?: string;
}

export interface Order {
  id: string;
  productName: string;
  productId: string;
  size: string;
  flavor: string;
  customerName: string;
  customerAge?: string;
  message?: string;
  selectedDecoration: string;
  customColor?: string;
  totalPrice: number;
  status: 'Pendiente' | 'Confirmado' | 'Preparando' | 'Decoración' | 'Listo' | 'En camino' | 'Entregado' | 'Cancelado';
  date: string;
  whatsappMessage?: string;
  
  // New specific fields from corrections
  customerEmail: string;
  customerPhone: string;
  deliveryDate: string;
  deliveryTime: string;
  deliveryAddress?: string;
  deliveryType: 'recojo' | 'domicilio';
  theme?: string;
  specialNotes?: string;
  trackingCode: string;
  celebratedName?: string;
  cancelReason?: string;

  // Payment Tracking
  paymentStatus?: 'pendiente' | 'confirmado' | 'rechazado' | 'parcial';
  paymentMethod?: 'Yape' | 'Plin' | 'Transferencia' | 'Efectivo' | 'Ninguno';
  montoPagado?: number;
  fechaPago?: string;
  confirmedByAdmin?: string;
  voucherUrl?: string;
  voucherName?: string;
  voucherUploadedAt?: string;
  fulfilledFromStock?: boolean;
  assignedStockId?: string;

  // Progress photos (added by Carol during preparation)
  progressPhotos?: {
    id: string;
    imageUrl: string;
    caption: string;
    stage: string; // e.g. 'bizcocho', 'decoracion', 'final'
    uploadedAt: string;
  }[];
}

export interface GalleryItem {
  id: string;
  imageUrl: string;
  title: string;
  category: string;
  date: string;
  description?: string;
}

export interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  linkText: string;
  active: boolean;
}

export interface AppConfig {
  whatsappNumber: string; // e.g., "+51999999999"
  facebookUrl: string;
  instagramUrl: string;
  email: string;
  address: string;
  openingHours: string;
  seoTitle: string;
  seoDescription: string;
  maintenanceMode: boolean;
  maintenanceEndTime?: string; // ISO timestamp for when maintenance ends (countdown target)
  maintenanceTitle?: string; // Customizable title on the maintenance screen
  maintenanceDescription?: string; // Customizable description on the maintenance screen
  maintenanceBadge?: string; // Customizable badge text on the maintenance screen
  // Customizable website content fields
  heroTitle?: string;
  heroDescription?: string;
  heroBadge?: string;
  heroImage?: string;
  aboutTitle?: string;
  aboutDescription?: string;
  aboutImage?: string;
  logoUrl?: string;
  faviconUrl?: string;
}

export type AdminRole = 'admin' | 'analyst' | 'stock_manager';

export interface CakeStock {
  id: string;          // e.g. "stock-1"
  name: string;        // e.g. "Selva Negra"
  productId: string;   // referenced Product ID (or "custom" if it's a generic cake not in catalog)
  flavor: string;      // e.g. "Chocolate Belga"
  size: string;        // e.g. "Mediano (20 porciones)"
  decoration: string;  // e.g. "Trufas de la Casa"
  quantity: number;    // numeric physical stock quantity (e.g. 2)
  createdAt: string;   // ISO timestamp
  notes?: string;      // notes e.g. "Hecho el viernes para vitrina"
  imageUrl?: string;   // image url
}

