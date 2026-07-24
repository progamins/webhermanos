import dotenv from 'dotenv';
dotenv.config();

import { getPool } from './config/db.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

function getRequiredPassword(envVar: string): string {
  const value = process.env[envVar];
  if (!value) {
    console.error(`[SEED] ERROR: Falta ${envVar} en el entorno. Defínelo en .env antes de ejecutar el seed.`);
    process.exit(1);
  }
  return value;
}

const INITIAL_PRODUCTS = [
  { id: 'prod-1', name: 'Maison Trufa Imperial', description: 'Exquisito pastel de chocolate belga con capas de ganache suave de cacao y cobertura texturizada coronada por trufas artesanales.', base_price: 120, category: 'Especiales', preparation_time: '48 horas', active: 1, stock: 1, images: '[]', flavors: '["Chocolate Belga","Fudge Intenso","Café Moca"]', decorations: '["Trufas de la Casa","Polvo de Oro Comestible","Salsa Fudge Caliente"]', tags: '["Chocolate","Premium","Trufas"]' },
  { id: 'prod-2', name: 'Rosado Floral Vintage', description: 'Diseño romántico con cobertura en crema de mantequilla vintage color pastel, adornado con rosas naturales seleccionadas y perlas de azúcar.', base_price: 135, category: 'Bodas', preparation_time: '72 horas', active: 1, stock: 1, images: '[]', flavors: '["Vainilla Francesa","Red Velvet","Manjar Blanco de Leche"]', decorations: '["Flores Frescas","Macarons de Frambuesa","Perlas Comestibles"]', tags: '["Boda","Vintage","Rosas"]' },
  { id: 'prod-3', name: 'Cielo de Macarons', description: 'Sutil y fina cobertura cremosa de degradado celeste y lila, coronado con crujientes macarons artesanales y merengues suizos.', base_price: 110, category: 'Infantiles', preparation_time: '48 horas', active: 1, stock: 1, images: '[]', flavors: '["Vainilla Francesa","Chocolate Blanco","Manjar de Lúcuma"]', decorations: '["Macarons de Colores","Destellos de Azúcar","Merengues Suizos"]', tags: '["Macarons","Lila","Infantil"]' },
  { id: 'prod-4', name: 'Elegancia de Oro & Velvet', description: 'Bizcocho aterciopelado Red Velvet con frosting de queso crema premium, decorado con pan de oro comestible de 24k.', base_price: 140, category: 'Aniversarios', preparation_time: '48 horas', active: 1, stock: 1, images: '[]', flavors: '["Red Velvet","Chocolate Amargo","Vainilla con Frutos Rojos"]', decorations: '["Pan de Oro 24K","Frutas del Bosque","Hojas de Menta"]', tags: '["Lujo","Red Velvet","Aniversario"]' },
  { id: 'prod-5', name: 'Cumpleaños Arcoíris Alegre', description: 'Pastel repleto de alegría con bizcochos coloridos y cobertura de crema sedosa de vainilla, coronado con minidonuts artesanales.', base_price: 95, category: 'Cumpleaños', preparation_time: '24 horas', active: 1, stock: 1, images: '[]', flavors: '["Vainilla Multicolor","Doble Chocolate","Dulce de Leche"]', decorations: '["Lluvia de Sprinkles","Minidonuts Artesanales","Chispas de Chocolate"]', tags: '["Fiesta","Cumpleaños","Arcoíris"]' },
  { id: 'prod-6', name: 'Chocolatier de Autor', description: 'Obra de arte geométrica para amantes del chocolate. Glaseado espejo brillante, decoraciones de chocolate templado y fresas frescas.', base_price: 115, category: 'Especiales', preparation_time: '48 horas', active: 1, stock: 1, images: '[]', flavors: '["Chocolate Belga","Ganache Semi-Amargo","Mousse de Chocolate"]', decorations: '["Láminas de Chocolate Templado","Fresas Bañadas en Fudge","Salsa de Frambuesa"]', tags: '["Especial","Espejo","Intenso"]' },
  { id: 'prod-7', name: 'Elegancia Rústica del Bosque', description: 'Pastel de estilo Naked Cake con crema ligera de mantequilla, decorado con romero fresco silvestre y bayas.', base_price: 150, category: 'Bodas', preparation_time: '72 horas', active: 1, stock: 1, images: '[]', flavors: '["Bizcocho de Zanahoria & Nueces","Vainilla Francesa","Manjar Casero"]', decorations: '["Arándanos y Fresas","Romero Fresco","Hojas de Azúcar rústicas"]', tags: '["Rústico","Naked","Romero"]' },
  { id: 'prod-8', name: 'Encanto Infantil Celestial', description: 'Dulce pastel de fresa con corona de merengues secos horneados a fuego lento y decoración tierna.', base_price: 105, category: 'Infantiles', preparation_time: '48 horas', active: 1, stock: 1, images: '[]', flavors: '["Dulce de Fresa","Chocolate con Leche","Vainilla Clásica"]', decorations: '["Merengues de Colores","Estrellitas de Fondant","Flores de Azúcar"]', tags: '["Infantil","Tierno","Estrellas"]' },
];

const INITIAL_REVIEWS = [
  { id: 'rev-1', author: 'Andrea Beltrán', role: 'Madre de cumpleañera', rating: 5, comment: '¡El pastel Cielo de Macarons fue la sensación del cumpleaños de mi hija! Carol tiene un talento increíble.', cake_model: 'Cielo de Macarons', date: '2026-06-15', approved: 1, response: '¡Muchísimas gracias Andrea!' },
  { id: 'rev-2', author: 'Carlos Alberto Rosas', role: 'Cliente frecuente', rating: 5, comment: 'Siempre confío en Maison Rosas para nuestras celebraciones familiares. El Maison Trufa Imperial es mi favorito.', cake_model: 'Maison Trufa Imperial', date: '2026-06-28', approved: 1, response: '¡Agradecemos tu preferencia Carlos!' },
  { id: 'rev-3', author: 'María José & Sebastián', role: 'Novios', rating: 5, comment: 'El pastel Rosado Floral Vintage superó nuestras expectativas para nuestra boda civil. ¡Muchas gracias Edwin y Carol!', cake_model: 'Rosado Floral Vintage', date: '2026-07-01', approved: 1, response: null },
];

const INITIAL_GALLERY = [
  { id: 'gal-1', image_url: '', title: 'Tarta de Boda Vintage', category: 'Bodas', date: '2026-05-10' },
  { id: 'gal-2', image_url: '', title: 'Imperial de Trufas', category: 'Especiales', date: '2026-05-24' },
  { id: 'gal-3', image_url: '', title: 'Fantasía de Cumpleaños Arcoíris', category: 'Cumpleaños', date: '2026-06-02' },
  { id: 'gal-4', image_url: '', title: 'Macaron Pastel Delight', category: 'Infantiles', date: '2026-06-14' },
  { id: 'gal-5', image_url: '', title: 'Elegancia de Oro 24K Red Velvet', category: 'Aniversarios', date: '2026-06-25' },
  { id: 'gal-6', image_url: '', title: 'Naked Cake de Romero y Bayas', category: 'Bodas', date: '2026-06-30' },
];

const DEFAULT_CONFIG = {
  whatsappNumber: '51902568187',
  facebookUrl: 'https://www.facebook.com/edwinraul.rosasalbines',
  instagramUrl: 'https://www.instagram.com/edwinraulrosas741/',
  email: 'edwinraulrosasalbines@gmail.com',
  address: 'Av. Ricardo Palma 213, Sánchez Cerro, Sullana, Piura',
  openingHours: 'Lunes a Sábado: 9:00 AM - 7:00 PM | Domingos: 10:00 AM - 2:00 PM',
  seoTitle: 'Maison Rosas | Pastelería de Autor & Repostería Fina',
  seoDescription: 'Deléitate con los pasteles personalizados de Carol Rosas Albines. Modelos exclusivos, ingredientes premium de alta repostería artesanal.',
  maintenanceMode: false,
  heroTitle: 'El Arte de Compartir',
  heroDescription: 'Diseños exclusivos creados por Carol Rosas para transformar tus momentos especiales en legados de sabor.',
  heroBadge: 'Por Carol & Edwin Rosas Albines',
  heroImage: '',
  aboutTitle: 'Nuestra Esencia Familiar',
  aboutDescription: 'En Maison Rosas, la repostería no es solo un oficio, sino un legado familiar de amor y dedicación.',
  aboutImage: '',
  faviconUrl: '',
  logoUrl: '',
  heroReviewText: 'El sabor es increíblemente suave y la presentación fue perfecta para mi boda civil.',
  heroReviewAuthor: 'María José',
  heroReviewRole: 'Novia',
  heroReviewRating: 5,
};

async function seed() {
  console.log('[SEED] Starting...');
  const pool = getPool();

  // 1. Products
  const [prodRows] = await pool.query('SELECT COUNT(*) as count FROM products');
  if ((prodRows as any[])[0].count === 0) {
    console.log('[SEED] Seeding products...');
    for (const p of INITIAL_PRODUCTS) {
      await pool.query(
        'INSERT INTO products (id, name, description, base_price, category, preparation_time, active, stock, images, flavors, decorations, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [p.id, p.name, p.description, p.base_price, p.category, p.preparation_time, p.active, p.stock, p.images, p.flavors, p.decorations, p.tags]
      );
    }
  }

  // 2. Reviews
  const [revRows] = await pool.query('SELECT COUNT(*) as count FROM reviews');
  if ((revRows as any[])[0].count === 0) {
    console.log('[SEED] Seeding reviews...');
    for (const r of INITIAL_REVIEWS) {
      await pool.query(
        'INSERT INTO reviews (id, author, role, rating, comment, cake_model, date, approved, response) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [r.id, r.author, r.role, r.rating, r.comment, r.cake_model, r.date, r.approved, r.response]
      );
    }
  }

  // 3. Gallery
  const [galRows] = await pool.query('SELECT COUNT(*) as count FROM gallery');
  if ((galRows as any[])[0].count === 0) {
    console.log('[SEED] Seeding gallery...');
    for (const g of INITIAL_GALLERY) {
      await pool.query(
        'INSERT INTO gallery (id, image_url, title, category, date) VALUES (?, ?, ?, ?, ?)',
        [g.id, g.image_url, g.title, g.category, g.date]
      );
    }
  }

  // 4. Config
  const [cfgRows] = await pool.query('SELECT COUNT(*) as count FROM config WHERE config_key = ?', ['app_config']);
  if ((cfgRows as any[])[0].count === 0) {
    console.log('[SEED] Seeding app config...');
    await pool.query(
      'INSERT INTO config (config_key, config_value) VALUES (?, ?)',
      ['app_config', JSON.stringify(DEFAULT_CONFIG)]
    );
  }

  // 5. Admin auth
  const [authRows] = await pool.query('SELECT COUNT(*) as count FROM admin_auth');
  if ((authRows as any[])[0].count === 0) {
    console.log('[SEED] Seeding admin auth...');
    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync(getRequiredPassword('ADMIN_DEFAULT_PASSWORD'), salt);
    const analystHash = bcrypt.hashSync(getRequiredPassword('ANALYST_DEFAULT_PASSWORD'), salt);
    const stockHash = bcrypt.hashSync(getRequiredPassword('STOCK_MANAGER_DEFAULT_PASSWORD'), salt);

    await pool.query('INSERT INTO admin_auth (role, password_hash) VALUES (?, ?)', ['admin', adminHash]);
    await pool.query('INSERT INTO admin_auth (role, password_hash) VALUES (?, ?)', ['analyst', analystHash]);
    await pool.query('INSERT INTO admin_auth (role, password_hash) VALUES (?, ?)', ['stock_manager', stockHash]);
  }

  console.log('[SEED] Complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[SEED] Error:', err);
  process.exit(1);
});
