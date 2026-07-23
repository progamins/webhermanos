/**
 * Domain types for Maison Rosas server
 *
 * These replace `any` usage across services and repositories.
 * Each interface matches the parsed shape returned by service methods
 * (after parseProduct, parseOrder, etc.)
 */

// ─── Product ───
export interface Product {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  category: string;
  preparationTime: string | null;
  active: boolean;
  stock: boolean;
  images: string[];
  flavors: string[];
  decorations: string[];
  tags: string[];
}

export interface ProductCreateInput {
  id?: string;
  name: string;
  description?: string;
  basePrice?: number;
  category?: string;
  preparationTime?: string;
  active?: boolean;
  stock?: boolean;
  images?: string[];
  flavors?: string[];
  decorations?: string[];
  tags?: string[];
}

export interface ProductUpdateInput {
  name?: string;
  description?: string;
  basePrice?: number;
  category?: string;
  preparationTime?: string;
  active?: boolean;
  stock?: boolean;
  images?: string[];
  flavors?: string[];
  decorations?: string[];
  tags?: string[];
}

// ─── Order ───
export interface Order {
  id: string;
  productName: string;
  productId: string | null;
  size: string;
  flavor: string;
  customerName: string;
  customerAge: number | null;
  customerEmail: string;
  customerPhone: string | null;
  message: string | null;
  selectedDecoration: string | null;
  customColor: string | null;
  totalPrice: number;
  montoPagado: number | null;
  status: string;
  date: string;
  deliveryDate: string | null;
  deliveryTime: string | null;
  deliveryAddress: string | null;
  deliveryType: string;
  theme: string | null;
  specialNotes: string | null;
  trackingCode: string;
  celebratedName: string | null;
  cancelReason: string | null;
  paymentStatus: string | null;
  paymentMethod: string | null;
  fechaPago: string | null;
  confirmedByAdmin: string | null;
  voucherUrl: string | null;
  voucherName: string | null;
  voucherUploadedAt: string | null;
  fulfilledFromStock: boolean;
  assignedStockId: string | null;
  progressPhotos: ProgressPhoto[];
  whatsappMessage: string | null;
}

export interface ProgressPhoto {
  id: string;
  url?: string;
  imageUrl?: string;
  caption: string;
  stage: string;
  date?: string;
  uploadedAt?: string;
}

export interface OrderCreateInput {
  id?: string;
  productName: string;
  productId?: string;
  size: string;
  flavor: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAge?: number;
  message?: string;
  selectedDecoration?: string;
  customColor?: string;
  totalPrice?: number;
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryAddress?: string;
  deliveryType?: string;
  theme?: string;
  specialNotes?: string;
  celebratedName?: string;
  whatsappMessage?: string;
}

export interface OrderUpdateInput {
  [key: string]: unknown;
  productName?: string;
  size?: string;
  flavor?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryAddress?: string;
  deliveryType?: string;
  totalPrice?: number;
  theme?: string;
  specialNotes?: string;
  selectedDecoration?: string;
  customColor?: string;
  message?: string;
  celebratedName?: string;
  cancelReason?: string;
  customerAge?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  montoPagado?: number;
  fechaPago?: string;
  confirmedByAdmin?: string;
  voucherUrl?: string;
  voucherName?: string;
  fulfilledFromStock?: boolean;
  assignedStockId?: string;
  progressPhotos?: ProgressPhoto[];
  status?: string;
}

// ─── Review ───
export interface Review {
  id: string;
  author: string;
  role: string | null;
  rating: number;
  comment: string;
  cakeModel: string | null;
  date: string | null;
  approved: boolean;
  response: string | null;
}

export interface ReviewCreateInput {
  id?: string;
  author: string;
  role?: string;
  rating: number;
  comment: string;
  cakeModel?: string;
  date?: string;
  approved?: boolean;
  response?: string;
}

export interface ReviewUpdateInput {
  approved?: boolean;
  response?: string;
  author?: string;
  rating?: number;
  comment?: string;
  date?: string;
}

// ─── Gallery ───
export interface GalleryItem {
  id: string;
  imageUrl: string;
  title: string | null;
  category: string | null;
  description: string | null;
  date: string | null;
}

export interface GalleryCreateInput {
  id?: string;
  imageUrl: string;
  title?: string;
  category?: string;
  description?: string;
  date?: string;
}

export interface GalleryUpdateInput {
  imageUrl?: string;
  title?: string;
  category?: string;
  description?: string;
  date?: string;
}

// ─── Cake Stock ───
export interface CakeStock {
  id: string;
  name: string;
  productId: string | null;
  flavor: string;
  size: string;
  decoration: string | null;
  quantity: number;
  notes: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface CakeStockCreateInput {
  id?: string;
  name: string;
  productId?: string;
  flavor: string;
  size: string;
  decoration?: string;
  quantity?: number;
  notes?: string;
  imageUrl?: string;
}

export interface CakeStockUpdateInput {
  name?: string;
  flavor?: string;
  size?: string;
  decoration?: string;
  quantity?: number;
  notes?: string;
  imageUrl?: string;
  productId?: string;
}

// ─── Admin Auth ───
export interface AdminSession {
  token: string;
  role: string;
  expires_at: string;
}

export interface AdminAuthRecord {
  role: string;
  password_hash: string;
  active_session_token?: string;
  credentials_emailed?: boolean;
}

// ─── Activity Log ───
export interface ActivityLog {
  id: string;
  action: string;
  details: string | null;
  role: string | null;
  timestamp: string;
}

// ─── Config ───
export interface AppConfig {
  whatsappNumber: string;
  facebookUrl: string;
  instagramUrl: string;
  email: string;
  address: string;
  openingHours: string;
  seoTitle: string;
  seoDescription: string;
  maintenanceMode: boolean;
  heroTitle: string;
  heroDescription: string;
  heroBadge: string;
  aboutTitle: string;
  aboutDescription: string;
  logoUrl?: string;
  faviconUrl?: string;
  heroImage?: string;
  aboutImage?: string;
  [key: string]: unknown;
}

// ─── Contact Message ───
export interface ContactMessage {
  id: string;
  name: string;
  email?: string;
  message: string;
  created_at: string;
}

// ─── Upload ───
export interface UploadRecord {
  id: string;
  url: string;
  original_name: string;
  mime_type: string;
  size: number;
  content_hash?: string;
  uploaded_by: string;
  created_at: string;
}

// ─── OTP ───
export interface OtpRecord {
  email: string;
  code: string;
  expires_at: string;
  used: boolean;
}
