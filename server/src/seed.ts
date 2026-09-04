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

const U = (id: string, w = 800) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
// Fotos reales verificadas por sabor (Wikimedia Commons, licencia libre).
// Se eligen para que el keke mostrado corresponda al nombre (ej. zanahoria →
// carrot cake con glaseado de queso, maracuyá → tarta con semillas, etc.).
const W = (path: string) => `https://upload.wikimedia.org/wikipedia/commons/${path}`;

const INITIAL_PRODUCTS = [
  { id: 'prod-1', name: 'Keke de Chocolate', description: 'Keke húmedo de cacao peruano, con chispas de chocolate oscuro y un toque de canela. Horneado cada mañana.', base_price: 35, category: 'Kekes Clásicos', preparation_time: '24 horas', active: 1, stock: 1, images: JSON.stringify([U('photo-1578985545062-69928b1d9587'), U('photo-1541783245831-57d6fb0926d3')]), flavors: '["Chocolate Intenso","Doble Chocolate","Chocolate con Nuez"]', decorations: '["Chips de Chocolate","Glaseado de Cacao","Nueces Tostadas"]', tags: '["Chocolate","Clásico","Cacao Peruano"]' },
  { id: 'prod-2', name: 'Keke de Vainilla', description: 'Keke esponjoso con aroma de vainilla peruana y un ligero toque de azúcar perlada. Suave y delicado.', base_price: 30, category: 'Kekes Clásicos', preparation_time: '24 horas', active: 1, stock: 1, images: JSON.stringify([W('6/6e/3f39a0206f0451b485d227484331b25b--vanilla-buttercream-icing-vanilla-cake.jpg')]), flavors: '["Vainilla Peruana","Vainilla con Chispas","Vainilla y Canela"]', decorations: '["Azúcar Perlada","Glaseado de Vainilla","Chispas de Colores"]', tags: '["Vainilla","Clásico","Esponjoso"]' },
  { id: 'prod-3', name: 'Keke de Plátano', description: 'El clásico de la casa: plátano maduro, nueces tostadas y especias cálidas. Sabe a domingo en familia.', base_price: 32, category: 'Kekes Clásicos', preparation_time: '24 horas', active: 1, stock: 1, images: JSON.stringify([W('thumb/4/45/Banana_bread_cut_into_slices.jpg/960px-Banana_bread_cut_into_slices.jpg')]), flavors: '["Plátano Maduro","Plátano con Nuez","Plátano y Canela"]', decorations: '["Nueces Tostadas","Glaseado de Mantequilla","Canela Espolvoreada"]', tags: '["Plátano","Casero","Familia"]' },
  { id: 'prod-4', name: 'Keke de Zanahoria', description: 'Keke jugoso de zanahoria con nuez y glaseado cremoso de queso. Húmedo y reconfortante.', base_price: 34, category: 'Kekes Clásicos', preparation_time: '24 horas', active: 1, stock: 1, images: JSON.stringify([W('thumb/4/4d/Carrot_%26_Walnut_Cake_with_Cream_Cheese_Icing_%2845980651644%29.jpg/960px-Carrot_%26_Walnut_Cake_with_Cream_Cheese_Icing_%2845980651644%29.jpg'), W('thumb/2/2c/Carrot_cake_5.jpg/960px-Carrot_cake_5.jpg')]), flavors: '["Zanahoria y Nuez","Zanahoria Especiada","Zanahoria con Pasas"]', decorations: '["Glaseado de Queso","Nuez Picada","Canela Molida"]', tags: '["Zanahoria","Húmedo","Glaseado"]' },
  { id: 'prod-5', name: 'Keke de Maracuyá', description: 'Fresco y tropical: maracuyá en su punto con un toque de miel y glaseado cítrico.', base_price: 36, category: 'Kekes Frutales', preparation_time: '24 horas', active: 1, stock: 1, images: JSON.stringify([W('thumb/a/a4/Passion_Fruit_Cake_of_Argentina_%E2%80%A2_%28Tarta_de_Maracuy%C3%A1%29.jpg/960px-Passion_Fruit_Cake_of_Argentina_%E2%80%A2_%28Tarta_de_Maracuy%C3%A1%29.jpg'), W('thumb/1/18/Passion_Fruit_Cake_%28Tarta_de_Maracuy%C3%A1%29.jpg/960px-Passion_Fruit_Cake_%28Tarta_de_Maracuy%C3%A1%29.jpg')]), flavors: '["Maracuyá Fresco","Maracuyá y Miel","Maracuyá con Jalea"]', decorations: '["Glaseado de Maracuyá","Ralladura de Lima","Semillas Frescas"]', tags: '["Maracuyá","Frutal","Peruano"]' },
  { id: 'prod-6', name: 'Keke de Naranja', description: 'Aroma intenso a naranja natural, almendras laminadas y un glaseado brillante que enamora.', base_price: 32, category: 'Kekes Frutales', preparation_time: '24 horas', active: 1, stock: 1, images: JSON.stringify([W('thumb/b/b9/Orange_Cake_-_Olea_2025-08-17.jpg/960px-Orange_Cake_-_Olea_2025-08-17.jpg')]), flavors: '["Naranja Natural","Naranja y Almendras","Naranja con Miel"]', decorations: '["Glaseado de Naranja","Almendras Laminadas","Azúcar Perlada"]', tags: '["Naranja","Frutal","Cítrico"]' },
  { id: 'prod-7', name: 'Keke de Lúcuma', description: 'El sabor del norte: lúcuma selecta en un keke suave y aromático. Nuestro peruano favorito.', base_price: 38, category: 'Kekes Peruanos', preparation_time: '24 horas', active: 1, stock: 1, images: JSON.stringify([W('thumb/f/f6/Caramel_Cake.jpg/960px-Caramel_Cake.jpg')]), flavors: '["Lúcuma Norteña","Lúcuma con Manjar","Lúcuma y Nueces"]', decorations: '["Manjar de Leche","Nueces Tostadas","Azúcar Espolvoreada"]', tags: '["Lúcuma","Peruano","Premium"]' },
  { id: 'prod-8', name: 'Keke de Canela', description: 'Keke aromático de canela con pasas doradas y un toque de miel. Perfecto con café de olla.', base_price: 33, category: 'Kekes Peruanos', preparation_time: '24 horas', active: 1, stock: 1, images: JSON.stringify([W('thumb/9/9b/Walnut_cinnamon_coffee_cake.jpg/960px-Walnut_cinnamon_coffee_cake.jpg')]), flavors: '["Canela Fina","Canela y Pasas","Canela con Miel"]', decorations: '["Canela Molida","Pasas Doradas","Glaseado de Miel"]', tags: '["Canela","Peruano","Aromático"]' },
];

const INITIAL_REVIEWS = [
  { id: 'rev-1', author: 'Andrea Beltrán', role: 'Madre de cumpleañera', rating: 5, comment: 'El keke de chocolate de la casa es el mejor que he probado en Sullana. Húmedo y con sabor a cacao de verdad.', cake_model: 'Keke de Chocolate', date: '2026-06-15', approved: 1, response: '¡Muchísimas gracias Andrea!' },
  { id: 'rev-2', author: 'Carlos Alberto Rosas', role: 'Cliente frecuente', rating: 5, comment: 'Pido los kekes para todas las reuniones de la familia. El de lúcuma es mi favorito: sabe a Perú.', cake_model: 'Keke de Lúcuma', date: '2026-06-28', approved: 1, response: '¡Agradecemos tu preferencia Carlos!' },
  { id: 'rev-3', author: 'María José & Sebastián', role: 'Clientes', rating: 5, comment: 'Pedimos un keke de plátano para nuestro aniversario y quedó perfecto. Se nota el horneado casero.', cake_model: 'Keke de Plátano', date: '2026-07-01', approved: 1, response: null },
];

const INITIAL_GALLERY = [
  { id: 'gal-1', image_url: U('photo-1578985545062-69928b1d9587'), title: 'Keke de Chocolate de la Casa', category: 'Kekes Clásicos', date: '2026-05-10' },
  { id: 'gal-2', image_url: W('thumb/4/45/Banana_bread_cut_into_slices.jpg/960px-Banana_bread_cut_into_slices.jpg'), title: 'Keke de Plátano con Nuez', category: 'Kekes Clásicos', date: '2026-05-24' },
  { id: 'gal-3', image_url: W('6/6e/3f39a0206f0451b485d227484331b25b--vanilla-buttercream-icing-vanilla-cake.jpg'), title: 'Keke de Vainilla Esponjoso', category: 'Kekes Clásicos', date: '2026-06-02' },
  { id: 'gal-4', image_url: W('thumb/a/a4/Passion_Fruit_Cake_of_Argentina_%E2%80%A2_%28Tarta_de_Maracuy%C3%A1%29.jpg/960px-Passion_Fruit_Cake_of_Argentina_%E2%80%A2_%28Tarta_de_Maracuy%C3%A1%29.jpg'), title: 'Keke de Maracuyá Fresco', category: 'Kekes Frutales', date: '2026-06-14' },
  { id: 'gal-5', image_url: W('thumb/4/4d/Carrot_%26_Walnut_Cake_with_Cream_Cheese_Icing_%2845980651644%29.jpg/960px-Carrot_%26_Walnut_Cake_with_Cream_Cheese_Icing_%2845980651644%29.jpg'), title: 'Keke de Zanahoria Glaseado', category: 'Kekes Clásicos', date: '2026-06-25' },
  { id: 'gal-6', image_url: W('thumb/b/b9/Orange_Cake_-_Olea_2025-08-17.jpg/960px-Orange_Cake_-_Olea_2025-08-17.jpg'), title: 'Keke de Naranja Cítrico', category: 'Kekes Frutales', date: '2026-06-30' },
];

const DEFAULT_CONFIG = {
  whatsappNumber: '51902568187',
  facebookUrl: 'https://www.facebook.com/edwinraul.rosasalbines',
  instagramUrl: 'https://www.instagram.com/edwinraulrosas741/',
  email: 'edwinraulrosasalbines@gmail.com',
  address: 'Av. Ricardo Palma 213, Sánchez Cerro, Sullana, Piura',
  openingHours: 'Lunes a Sábado: 9:00 AM - 7:00 PM | Domingos: 10:00 AM - 2:00 PM',
  seoTitle: 'Maison Rosas | Kekes Artesanales Peruanos en Sullana',
  seoDescription: 'Kekes artesanales horneados todos los días con sabores peruanos: chocolate, lúcuma, plátano, maracuyá y más. Pedidos por WhatsApp en Sullana, Piura.',
  maintenanceMode: false,
  heroTitle: 'El sabor de casa, hecho keke',
  heroDescription: 'Kekes artesanales preparados con sabores que nos recuerdan al Perú.',
  heroBadge: 'Kekes artesanales · Sullana, Piura',
  heroImage: U('photo-1551024506-0bccd828d307', 1000),
  aboutTitle: 'Nuestra Esencia Familiar',
  aboutDescription: 'En Maison Rosas cada keke nace de una receta familiar: ingredientes naturales, horneado artesanal y el sabor de casa que nos acompaña siempre.',
  aboutImage: U('photo-1517433670267-08bbd4be890f', 1000),
  faviconUrl: '',
  logoUrl: '',
  heroReviewText: 'El sabor es increíblemente suave y se nota el horneado casero. Mi keke favorito: el de lúcuma.',
  heroReviewAuthor: 'María José',
  heroReviewRole: 'Cliente',
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
