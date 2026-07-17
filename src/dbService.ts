import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from './firebase';
import { compressImage } from './utils/images';
import { Product, Review, Order, GalleryItem, AppConfig, CakeStock } from './types';

// Standardized operation types for error handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  let currentUser = null;
  try {
    const auth = getAuth();
    currentUser = auth.currentUser;
  } catch (e) {
    // Auth might not be initialized yet
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || null,
      tenantId: currentUser?.tenantId || null,
      providerInfo: currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Colecciones de Firestore
const PRODUCTS_COL = 'products';
const REVIEWS_COL = 'reviews';
const ORDERS_COL = 'orders';
const GALLERY_COL = 'gallery';
const CONFIG_COL = 'config';

// Datos de semilla (Seed Data)
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Maison Trufa Imperial',
    description: 'Exquisito pastel de chocolate belga con capas de ganache suave de cacao y cobertura texturizada coronada por trufas artesanales elaboradas por Carol.',
    basePrice: 120,
    category: 'Especiales',
    images: [],
    flavors: ['Chocolate Belga', 'Fudge Intenso', 'Café Moca'],
    decorations: ['Trufas de la Casa', 'Polvo de Oro Comestible', 'Salsa Fudge Caliente'],
    preparationTime: '48 horas',
    active: true,
    stock: true,
    tags: ['Chocolate', 'Premium', 'Trufas']
  },
  {
    id: 'prod-2',
    name: 'Rosado Floral Vintage',
    description: 'Diseño romántico con cobertura en crema de mantequilla vintage color pastel, adornado con rosas naturales seleccionadas y perlas de azúcar.',
    basePrice: 135,
    category: 'Bodas',
    images: [],
    flavors: ['Vainilla Francesa', 'Red Velvet', 'Manjar Blanco de Leche'],
    decorations: ['Flores Frescas', 'Macarons de Frambuesa', 'Perlas Comestibles'],
    preparationTime: '72 horas',
    active: true,
    stock: true,
    tags: ['Boda', 'Vintage', 'Rosas']
  },
  {
    id: 'prod-3',
    name: 'Cielo de Macarons',
    description: 'Sutil y fina cobertura cremosa de degradado celeste y lila, coronado con crujientes macarons artesanales de Carol y merengues suizos.',
    basePrice: 110,
    category: 'Infantiles',
    images: [],
    flavors: ['Vainilla Francesa', 'Chocolate Blanco', 'Manjar de Lúcuma'],
    decorations: ['Macarons de Colores', 'Destellos de Azúcar', 'Merengues Suizos'],
    preparationTime: '48 horas',
    active: true,
    stock: true,
    tags: ['Macarons', 'Lila', 'Infantil']
  },
  {
    id: 'prod-4',
    name: 'Elegancia de Oro & Velvet',
    description: 'Bizcocho aterciopelado Red Velvet con frosting de queso crema premium de consistencia sedosa, decorado con pan de oro comestible de 24k.',
    basePrice: 140,
    category: 'Aniversarios',
    images: [],
    flavors: ['Red Velvet', 'Chocolate Amargo', 'Vainilla con Frutos Rojos'],
    decorations: ['Pan de Oro 24K', 'Frutas del Bosque', 'Hojas de Menta'],
    preparationTime: '48 horas',
    active: true,
    stock: true,
    tags: ['Lujo', 'Red Velvet', 'Aniversario']
  },
  {
    id: 'prod-5',
    name: 'Cumpleaños Arcoíris Alegre',
    description: 'Un pastel repleto de alegría con bizcochos coloridos y cobertura de crema sedosa de vainilla, coronado con minidonuts artesanales.',
    basePrice: 95,
    category: 'Cumpleaños',
    images: [],
    flavors: ['Vainilla Multicolor', 'Doble Chocolate', 'Dulce de Leche'],
    decorations: ['Lluvia de Sprinkles', 'Minidonuts Artesanales', 'Chispas de Chocolate'],
    preparationTime: '24 horas',
    active: true,
    stock: true,
    tags: ['Fiesta', 'Cumpleaños', 'Arcoíris']
  },
  {
    id: 'prod-6',
    name: 'Chocolatier de Autor',
    description: 'Una obra de arte geométrica para verdaderos amantes del chocolate. Glaseado espejo brillante, decoraciones de chocolate templado y fresas frescas.',
    basePrice: 115,
    category: 'Especiales',
    images: [],
    flavors: ['Chocolate Belga', 'Ganache Semi-Amargo', 'Mousse de Chocolate'],
    decorations: ['Láminas de Chocolate Templado', 'Fresas Bañadas en Fudge', 'Salsa de Frambuesa'],
    preparationTime: '48 horas',
    active: true,
    stock: true,
    tags: ['Especial', 'Espejo', 'Intenso']
  },
  {
    id: 'prod-7',
    name: 'Elegancia Rústica del Bosque',
    description: 'Pastel de estilo Naked Cake (semi-cubierto) con crema ligera de mantequilla, decorado delicadamente con romero fresco silvestre y bayas.',
    basePrice: 150,
    category: 'Bodas',
    images: [],
    flavors: ['Bizcocho de Zanahoria & Nueces', 'Vainilla Francesa', 'Manjar Casero'],
    decorations: ['Arándanos y Fresas', 'Romero Fresco', 'Hojas de Azúcar rústicas'],
    preparationTime: '72 horas',
    active: true,
    stock: true,
    tags: ['Rústico', 'Naked', 'Romero']
  },
  {
    id: 'prod-8',
    name: 'Encanto Infantil Celestial',
    description: 'Dulce pastel de fresa con corona de merengues secos horneados a fuego lento y decoración tierna ideal para los más pequeños de casa.',
    basePrice: 105,
    category: 'Infantiles',
    images: [],
    flavors: ['Dulce de Fresa', 'Chocolate con Leche', 'Vainilla Clásica'],
    decorations: ['Merengues de Colores', 'Estrellitas de Fondant', 'Flores de Azúcar'],
    preparationTime: '48 horas',
    active: true,
    stock: true,
    tags: ['Infantil', 'Tierno', 'Estrellas']
  }
];

const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    author: 'Andrea Beltrán',
    role: 'Madre de cumpleañera',
    rating: 5,
    comment: '¡El pastel Cielo de Macarons fue la sensación del cumpleaños de mi hija! Carol tiene un talento increíble, el sabor vainilla francesa estaba súper esponjoso y el dulzor en su punto exacto.',
    cakeModel: 'Cielo de Macarons',
    date: '2026-06-15',
    approved: true,
    response: '¡Muchísimas gracias Andrea! Nos alegra mucho haber formado parte del día especial de tu pequeña. Hecho con mucho amor.'
  },
  {
    id: 'rev-2',
    author: 'Carlos Alberto Rosas',
    role: 'Cliente frecuente',
    rating: 5,
    comment: 'Siempre confío en Maison Rosas para nuestras celebraciones familiares. El Maison Trufa Imperial es mi favorito absoluto. Edwin coordina todo súper rápido por WhatsApp y la entrega fue puntual.',
    cakeModel: 'Maison Trufa Imperial',
    date: '2026-06-28',
    approved: true,
    response: '¡Agradecemos tu preferencia Carlos! Es un gusto atenderte y garantizar que disfrutes el chocolate belga artesanal.'
  },
  {
    id: 'rev-3',
    author: 'María José & Sebastián',
    role: 'Novios',
    rating: 5,
    comment: 'El pastel Rosado Floral Vintage superó nuestras expectativas para nuestra boda civil. Lucía sumamente elegante con las flores naturales frescas y el bizcocho Red Velvet fue exquisito. ¡Muchas gracias Edwin y Carol!',
    cakeModel: 'Rosado Floral Vintage',
    date: '2026-07-01',
    approved: true
  }
];

const INITIAL_GALLERY: GalleryItem[] = [
  {
    id: 'gal-1',
    imageUrl: '',
    title: 'Tarta de Boda Vintage',
    category: 'Bodas',
    date: '2026-05-10'
  },
  {
    id: 'gal-2',
    imageUrl: '',
    title: 'Imperial de Trufas',
    category: 'Especiales',
    date: '2026-05-24'
  },
  {
    id: 'gal-3',
    imageUrl: '',
    title: 'Fantasía de Cumpleaños Arcoíris',
    category: 'Cumpleaños',
    date: '2026-06-02'
  },
  {
    id: 'gal-4',
    imageUrl: '',
    title: 'Macaron Pastel Delight',
    category: 'Infantiles',
    date: '2026-06-14'
  },
  {
    id: 'gal-5',
    imageUrl: '',
    title: 'Elegancia de Oro 24K Red Velvet',
    category: 'Aniversarios',
    date: '2026-06-25'
  },
  {
    id: 'gal-6',
    imageUrl: '',
    title: 'Naked Cake de Romero y Bayas',
    category: 'Bodas',
    date: '2026-06-30'
  }
];

const DEFAULT_CONFIG: AppConfig = {
  whatsappNumber: '51902568187',
  facebookUrl: 'https://www.facebook.com/edwinraul.rosasalbines',
  instagramUrl: 'https://www.instagram.com/edwinraulrosas741/',
  email: 'edwinraulrosasalbines@gmail.com',
  address: 'Av. Ricardo Palma 213, Sánchez Cerro, Sullana, Piura',
  openingHours: 'Lunes a Sábado: 9:00 AM - 7:00 PM | Domingos: 10:00 AM - 2:00 PM',
  seoTitle: 'Maison Rosas | Pastelería de Autor & Repostería Fina',
  seoDescription: 'Deléitate con los pasteles personalizados de Carol Rosas Albines. Modelos exclusivos, ingredientes premium de alta repostería artesanal. Haz tu pedido por WhatsApp.',
  maintenanceMode: false,
  maintenanceEndTime: '',
  maintenanceTitle: 'Volveremos muy pronto',
  maintenanceDescription: 'Estamos horneando nuevas sorpresas para ti. Mientras tanto, todos tus pedidos y operaciones continúan activos. No tienes nada de qué preocuparte.',
  maintenanceBadge: 'En mantenimiento',
  heroTitle: 'El Arte de Compartir',
  heroDescription: 'Diseños exclusivos creados por Carol Rosas para transformar tus momentos especiales en legados de sabor.',
  heroBadge: 'Por Carol & Edwin Rosas Albines',
  heroImage: '',
  aboutTitle: 'Nuestra Esencia Familiar',
  aboutDescription: 'En Maison Rosas, la repostería no es solo un oficio, sino un legado familiar de amor y dedicación. Cada pastel es esculpido a mano por Carol, cuidando texturas finas e ingredientes orgánicos de la más alta selección, mientras que Edwin garantiza una atención segura, coordinada y personalizada para que cada celebración en Piura y Sullana sea perfecta.',
  aboutImage: '',
  faviconUrl: ''
};

// Seeding inicial si la base de datos está vacía
export async function seedDatabaseIfNeeded() {
  try {
    // 1. Seed Products
    let prodSnap;
    try {
      prodSnap = await getDocs(collection(db, PRODUCTS_COL));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, PRODUCTS_COL);
      return;
    }
    if (prodSnap.empty) {
      console.log('Seeding products to Firestore...');
      for (const p of INITIAL_PRODUCTS) {
        try {
          await setDoc(doc(db, PRODUCTS_COL, p.id), p);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `${PRODUCTS_COL}/${p.id}`);
        }
      }
    }

    // 2. Seed Reviews
    let revSnap;
    try {
      revSnap = await getDocs(collection(db, REVIEWS_COL));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, REVIEWS_COL);
      return;
    }
    if (revSnap.empty) {
      console.log('Seeding reviews to Firestore...');
      for (const r of INITIAL_REVIEWS) {
        try {
          await setDoc(doc(db, REVIEWS_COL, r.id), r);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `${REVIEWS_COL}/${r.id}`);
        }
      }
    }

    // 3. Seed Gallery
    let galSnap;
    try {
      galSnap = await getDocs(collection(db, GALLERY_COL));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, GALLERY_COL);
      return;
    }
    if (galSnap.empty) {
      console.log('Seeding gallery items to Firestore...');
      for (const g of INITIAL_GALLERY) {
        try {
          await setDoc(doc(db, GALLERY_COL, g.id), g);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `${GALLERY_COL}/${g.id}`);
        }
      }
    }

    // 4. Seed Config
    let configDoc;
    try {
      configDoc = await getDoc(doc(db, CONFIG_COL, 'app_config'));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `${CONFIG_COL}/app_config`);
      return;
    }
    if (!configDoc.exists()) {
      console.log('Seeding initial app config...');
      try {
        await setDoc(doc(db, CONFIG_COL, 'app_config'), DEFAULT_CONFIG);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `${CONFIG_COL}/app_config`);
      }
    } else {
      const data = configDoc.data();
      if (data && (
        data.whatsappNumber === '51987654321' ||
        data.email === 'contacto@maisonrosas.pe' ||
        data.email === 'maisonrosas@gmail.com' ||
        data.facebookUrl?.includes('maisonrosas') ||
        data.instagramUrl?.includes('maisonrosas') ||
        data.address?.toLowerCase().includes('av ricardo palma 213 sanchez cerro')
      )) {
        console.log('Actualizando configuración legacy en Firestore...');
        try {
          await setDoc(doc(db, CONFIG_COL, 'app_config'), {
            ...data,
            whatsappNumber: DEFAULT_CONFIG.whatsappNumber,
            facebookUrl: DEFAULT_CONFIG.facebookUrl,
            instagramUrl: DEFAULT_CONFIG.instagramUrl,
            email: DEFAULT_CONFIG.email,
            address: DEFAULT_CONFIG.address,
            seoTitle: DEFAULT_CONFIG.seoTitle,
            seoDescription: DEFAULT_CONFIG.seoDescription
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `${CONFIG_COL}/app_config`);
        }
      }
    }
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Métodos de servicio para la App
export const dbService = {
  // Productos (Admin operations routed through secure server API)
  async getProducts(): Promise<Product[]> {
    try {
      const snap = await getDocs(collection(db, PRODUCTS_COL));
      const products: Product[] = [];
      snap.forEach((doc) => {
        products.push(doc.data() as Product);
      });
      return products;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, PRODUCTS_COL);
      return [];
    }
  },

  async saveProduct(product: Product): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ product })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error guardando pastel en el servidor.');
    }
  },

  async deleteProduct(id: string): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-token': token
      }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error eliminando pastel en el servidor.');
    }
  },

  // Opiniones (Reviews)
  async getReviews(): Promise<Review[]> {
    try {
      const snap = await getDocs(collection(db, REVIEWS_COL));
      const reviews: Review[] = [];
      snap.forEach((doc) => {
        reviews.push(doc.data() as Review);
      });
      return reviews;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, REVIEWS_COL);
      return [];
    }
  },

  async addReview(review: Review): Promise<void> {
    try {
      await setDoc(doc(db, REVIEWS_COL, review.id), review);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${REVIEWS_COL}/${review.id}`);
    }
  },

  async updateReview(review: Review): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    // Review updates can be approved or replied
    let endpoint = '/api/admin/reviews/reply';
    let body: any = { reviewId: review.id, replyText: review.response || '' };

    if (review.approved && !review.response) {
      endpoint = '/api/admin/reviews/approve';
      body = { reviewId: review.id };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error actualizando opinión en el servidor.');
    }
  },

  async deleteReview(id: string): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-token': token
      }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error eliminando opinión en el servidor.');
    }
  },

  // Pedidos (Orders)
  async getOrders(): Promise<Order[]> {
    try {
      const snap = await getDocs(collection(db, ORDERS_COL));
      const orders: Order[] = [];
      snap.forEach((doc) => {
        orders.push(doc.data() as Order);
      });
      // Ordenar por fecha descendente
      return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, ORDERS_COL);
      return [];
    }
  },

  // AJAX submission to Backend with SSE Broadcast trigger
  async addOrder(order: Order): Promise<void> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ order })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al guardar el pedido en el servidor.');
    }
  },

  async updateOrderStatus(id: string, status: Order['status']): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch('/api/admin/orders/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ orderId: id, status })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al actualizar estado de pedido en el servidor.');
    }
  },

  async deleteOrder(id: string): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-token': token
      }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al eliminar el pedido en el servidor.');
    }
  },

  async updateOrder(order: Order): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch('/api/admin/orders/update-full', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ order })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al actualizar el pedido en el servidor.');
    }
  },

  async uploadVoucher(orderId: string, file: File): Promise<any> {
    const token = localStorage.getItem('maison_admin_token') || '';

    // Comprimir el comprobante antes de subir para optimizar almacenamiento
    let fileToUpload = file;
    try {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file, { maxWidth: 1200 });
        fileToUpload = new File([compressed], file.name.replace(/\.[^.]+$/, '.webp'), {
          type: compressed.type || 'image/webp'
        });
      }
    } catch (e) {
      console.warn('[uploadVoucher] Error al comprimir, se usará el original:', e);
      // Si falla la compresión, usar el archivo original
    }

    const formData = new FormData();
    formData.append('orderId', orderId);
    formData.append('voucher', fileToUpload);

    const res = await fetch('/api/admin/orders/upload-voucher', {
      method: 'POST',
      headers: {
        'x-admin-token': token
      },
      body: formData
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al subir comprobante al servidor.');
    }
    return res.json();
  },

  async deleteVoucher(orderId: string, voucherPath?: string): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch('/api/admin/orders/delete-voucher', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ orderId, voucherPath })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al eliminar comprobante.');
    }
  },

  async updateOrderPayment(orderId: string, paymentDetails: {
    paymentStatus: string;
    paymentMethod: string;
    montoPagado: number;
    fechaPago: string;
    confirmedByAdmin: string;
  }): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch('/api/admin/orders/update-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ orderId, ...paymentDetails })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al actualizar información de pago.');
    }
  },

  // Galería
  async getGallery(): Promise<GalleryItem[]> {
    try {
      const snap = await getDocs(collection(db, GALLERY_COL));
      const items: GalleryItem[] = [];
      snap.forEach((doc) => {
        items.push(doc.data() as GalleryItem);
      });
      return items;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, GALLERY_COL);
      return [];
    }
  },

  async saveGalleryItem(item: GalleryItem): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch('/api/admin/gallery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ item })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al guardar imagen en la galería.');
    }
  },

  async deleteGalleryItem(id: string): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch(`/api/admin/gallery/${id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-token': token
      }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al eliminar imagen de la galería.');
    }
  },

  // Configuración de la App
  async getConfig(): Promise<AppConfig> {
    try {
      const configDoc = await getDoc(doc(db, CONFIG_COL, 'app_config'));
      if (configDoc.exists()) {
        return configDoc.data() as AppConfig;
      }
      return DEFAULT_CONFIG;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${CONFIG_COL}/app_config`);
      return DEFAULT_CONFIG;
    }
  },

  async saveConfig(config: AppConfig): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ config })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al guardar la configuración.');
    }
  },

  // Secure Authentication API Proxy Methods
  async adminLogin(password: string, role?: string): Promise<{ success: boolean; token?: string; expiresAt?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, role: role || 'admin' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('maison_admin_token', data.token);
        localStorage.setItem('maison_admin_logged', 'true');
        return { success: true, token: data.token, expiresAt: data.expiresAt };
      } else {
        return { success: false, error: data.error || 'Contraseña incorrecta.' };
      }
    } catch (error) {
      return { success: false, error: 'No se pudo conectar con el servidor de seguridad.' };
    }
  },

  async adminVerifyToken(): Promise<boolean> {
    const token = localStorage.getItem('maison_admin_token');
    if (!token) return false;
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'x-admin-token': token
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return true;
      } else {
        localStorage.removeItem('maison_admin_token');
        localStorage.removeItem('maison_admin_logged');
        return false;
      }
    } catch (error) {
      return false;
    }
  },

  async adminLogout(): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
          'x-admin-token': token
        }
      });
    } catch (e) {
      // Ignorar errores de red en logout
    }
    localStorage.removeItem('maison_admin_token');
    localStorage.removeItem('maison_admin_logged');
  },

  // ── Role Passwords Management ──
  async getRolePasswordsStatus(): Promise<{ success: boolean; roles?: any; credentials_emailed?: boolean; error?: string }> {
    const token = localStorage.getItem('maison_admin_token') || '';
    try {
      const res = await fetch('/api/admin/role-passwords', {
        headers: { 'x-admin-token': token }
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Error al obtener estado de contraseñas de roles.' };
    }
  },

  async saveRolePasswords(analystPassword: string, stockManagerPassword: string): Promise<{ success: boolean; error?: string }> {
    const token = localStorage.getItem('maison_admin_token') || '';
    try {
      const res = await fetch('/api/admin/role-passwords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: JSON.stringify({ analystPassword, stockManagerPassword })
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Error al guardar contraseñas de roles.' };
    }
  },

  // ── Activity Log ──
  async getActivityLogs(): Promise<{ success: boolean; logs?: any[]; error?: string }> {
    const token = localStorage.getItem('maison_admin_token') || '';
    try {
      const res = await fetch('/api/admin/activity-log', {
        headers: { 'x-admin-token': token }
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Error al obtener registro de actividades.' };
    }
  },

  // ── Change Admin Master Password ──
  async changeAdminPassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const token = localStorage.getItem('maison_admin_token') || '';
    try {
      const res = await fetch('/api/admin/change-admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Error al cambiar la contraseña.' };
      }
    } catch {
      return { success: false, error: 'Error de conexión con el servidor.' };
    }
  },

  // ── Send One-Time Credentials Email ──
  async sendCredentialsEmail(): Promise<{ success: boolean; alreadySent?: boolean; message?: string; error?: string }> {
    const token = localStorage.getItem('maison_admin_token') || '';
    try {
      const res = await fetch('/api/admin/send-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        }
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Error al enviar correo de credenciales.' };
    }
  },

  async getCakeStock(): Promise<CakeStock[]> {
    try {
      const res = await fetch('/api/admin/stock', {
        headers: {
          'x-admin-token': localStorage.getItem('maison_admin_token') || ''
        }
      });
      if (!res.ok) throw new Error('Error al obtener el stock de pasteles');
      const data = await res.json();
      return data.success ? data.stock : [];
    } catch (error) {
      console.error("Error fetching cake stock:", error);
      return [];
    }
  },

  async saveCakeStock(item: CakeStock): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch('/api/admin/stock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ item })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al guardar el stock de pasteles.');
    }
  },

  async deleteCakeStock(id: string): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch(`/api/admin/stock/${id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-token': token
      }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al eliminar el stock de pasteles.');
    }
  },

  async assignStockToOrder(orderId: string, stockId: string): Promise<any> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch('/api/admin/orders/assign-stock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ orderId, stockId })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al asignar el stock al pedido.');
    }
    return data;
  },

  // Add a progress photo to an order (routed through server API for Firestore rules compliance)
  async addProgressPhoto(orderId: string, imageUrl: string, caption: string, stage: string): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch('/api/admin/orders/progress-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ orderId, imageUrl, caption, stage })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al agregar foto de progreso en el servidor.');
    }
  },

  // Delete a progress photo from an order (routed through server API for Firestore rules compliance)
  async deleteProgressPhoto(orderId: string, photoId: string): Promise<void> {
    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch('/api/admin/orders/delete-progress-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ orderId, photoId })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al eliminar foto de progreso en el servidor.');
    }
  },

  // Upload image through the server API — saves to local /uploads/ for fastest loading
  // (same-origin = no SSL handshake, no DNS lookup, 7-day cache via Express static)
  async uploadImageToStorage(file: File): Promise<string> {
    let fileToUpload = file;
    try {
      const compressed = await compressImage(file, { maxWidth: 1200 });
      fileToUpload = new File([compressed], file.name.replace(/\.[^.]+$/, '.webp'), {
        type: compressed.type || 'image/webp'
      });
    } catch (e) {
      console.warn('[uploadImageToStorage] Error al comprimir, se usará el original:', e);
    }

    const formData = new FormData();
    formData.append('image', fileToUpload);

    const token = localStorage.getItem('maison_admin_token') || '';
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'x-admin-token': token
      },
      body: formData
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Error al subir la imagen al servidor.');
    }

    const data = await res.json();
    return data.imageUrl; // ← Ahora devuelve URL local (/uploads/filename.webp)
  }
};
