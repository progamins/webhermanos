/**
 * ═══════════════════════════════════════════════════════════════════
 * MAISON ROSAS — Seed de datos demo completos
 * ═══════════════════════════════════════════════════════════════════
 * Puebla la base de datos con datos realistas para testear el sistema
 * completo en producción (Vercel):
 *
 *  1. 📸 Sube las imágenes locales (server/uploads/) a la tabla uploads
 *     con file_data (MEDIUMBLOB) para que PERSISTAN en Vercel sin Blob.
 *  2. 🎂 Asigna imágenes a productos, galería y config (hero/about/logo).
 *  3. 📦 Crea pedidos en TODOS los estados con timelines completos,
 *     pagos (Yape/Plin/Transferencia/Efectivo), vouchers y fotos de progreso.
 *  4. 🧁 Crea inventario cake_stock.
 *  5. 💬 Crea mensajes de contacto.
 *  6. 📝 Crea activity logs.
 *  7. 🔐 Recalcula los hashes de contraseñas de los 3 roles para que
 *     coincidan con las contraseñas documentadas en .vercel.env.example.
 *
 * Idempotente: se puede ejecutar varias veces sin duplicar datos.
 *
 * Uso (desde la raíz del repo):
 *   node scripts/seed-demo-data.mjs
 *
 * Las credenciales de BD se leen de variables de entorno o usan los
 * valores por defecto de .vercel.env.example (Railway).
 * ═══════════════════════════════════════════════════════════════════
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 🔒 Lee una variable de entorno obligatoria o aborta el script.
 * No hay valores por defecto con credenciales reales: el script
 * exige que el operador defina el entorno al que quiere apuntar.
 */
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[SEED] ERROR: Falta ${name} en el entorno. Defínelo en .env antes de ejecutar el script.`);
    process.exit(1);
  }
  return value;
}

// ─── Config (SIEMPRE desde variables de entorno) ───────────────
const DB_HOST = requireEnv('DB_HOST');
const DB_PORT = Number(requireEnv('DB_PORT'));
const DB_USER = requireEnv('DB_USER');
const DB_PASSWORD = requireEnv('DB_PASSWORD');
const DB_NAME = requireEnv('DB_NAME');

// Contraseñas de roles para el seed inicial (se leen del entorno).
// ⚠️ Al ejecutar contra producción, asegúrate de que el .env que
// cargas sea el de producción y no uno local de desarrollo.
const PASSWORDS = {
  admin: requireEnv('ADMIN_DEFAULT_PASSWORD'),
  analyst: requireEnv('ANALYST_DEFAULT_PASSWORD'),
  stock_manager: requireEnv('STOCK_MANAGER_DEFAULT_PASSWORD'),
};

const UPLOADS_DIR = path.resolve(__dirname, '../server/uploads');
const EXT_MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
};

// ❌ Archivos locales que NO son fotos de tortas (vouchers, Yape, capturas)
// y NO deben asignarse a productos/galería/config. Se detectan por nombre
// de archivo local, ANTES de subirlos.
const EXCLUDE_FROM_DISPLAY = [
  '02fed330-cdf7-4df0-bba5-ca6ece6f96f6.jpg', // QR/screenshot de Yape
];

const rand = (n) => crypto.randomBytes(n).toString('hex');
const uuid = () => crypto.randomUUID();

// ─── Productos del catálogo (ids fijos del seed original) ──────────
const PRODUCTS = [
  { id: 'prod-1', name: 'Maison Trufa Imperial', base: 120 },
  { id: 'prod-2', name: 'Rosado Floral Vintage', base: 135 },
  { id: 'prod-3', name: 'Cielo de Macarons', base: 110 },
  { id: 'prod-4', name: 'Elegancia de Oro & Velvet', base: 140 },
  { id: 'prod-5', name: 'Cumpleaños Arcoíris Alegre', base: 95 },
  { id: 'prod-6', name: 'Chocolatier de Autor', base: 115 },
  { id: 'prod-7', name: 'Elegancia Rústica del Bosque', base: 150 },
  { id: 'prod-8', name: 'Encanto Infantil Celestial', base: 105 },
];

const SIZES = [
  { label: 'Petit (12-15 Porciones)', modifier: 0 },
  { label: 'Estándar (20-25 Porciones)', modifier: 25 },
  { label: 'Doble Piso (30-35 Porciones)', modifier: 70 },
  { label: 'Gala Imperial (45-50 Porciones)', modifier: 130 },
];

const FILLINGS = [
  { label: 'Manjarblanco Artesanal de Olla (Tradicional)', price: 0 },
  { label: 'Fudge de Cacao Belga al 70% (Premium)', price: 10 },
  { label: 'Jalea Artesanal de Frutos del Bosque (Premium)', price: 12 },
  { label: 'Crema de Lúcuma Premium Sullana (Especial)', price: 15 },
  { label: 'Crema Sabor Nutella & Avellanas (Gourmet)', price: 15 },
];

// Pedidos demo: id, cliente, producto, tamaño, sabor, estado, entrega, pago
const DEMO_ORDERS = [
  { id: 'ord-demo-001', name: 'Lucía Fernández', email: 'lucia.fernandez@gmail.com', phone: '987654321', prod: 0, size: 0, flavor: 0, status: 'Pendiente', payment: 'pendiente', method: 'Yape', delivery: 'recojo', notes: 'Quiere el pastel con mensaje personalizado de cumpleaños.' },
  { id: 'ord-demo-002', name: 'Rodrigo Salazar', email: 'rodrigo.salazar@hotmail.com', phone: '912345678', prod: 5, size: 1, flavor: 1, status: 'Pendiente', payment: 'pendiente', method: 'Ninguno', delivery: 'domicilio', address: 'Av. Grau 456, Sullana', notes: 'Entrega para el sábado por la mañana.' },
  { id: 'ord-demo-003', name: 'María José Torres', email: 'majose.torres@gmail.com', phone: '998877665', prod: 1, size: 2, flavor: 1, status: 'Confirmado', payment: 'confirmado', method: 'Plin', delivery: 'recojo', notes: 'Boda civil — necesita 2 pisos.' },
  { id: 'ord-demo-004', name: 'Carlos Mendoza', email: 'carlos.mendoza@yahoo.com', phone: '934567890', prod: 3, size: 0, flavor: 0, status: 'Confirmado', payment: 'pendiente', method: 'Yape', delivery: 'domicilio', address: 'Urb. Los Álamos Mz B Lt 12, Sullana', notes: 'Aniversario de bodas — flores blancas.' },
  { id: 'ord-demo-005', name: 'Valeria Castillo', email: 'valeria.castillo@gmail.com', phone: '976543210', prod: 7, size: 1, flavor: 0, status: 'Preparando', payment: 'confirmado', method: 'Transferencia', delivery: 'recojo', notes: 'Cumpleaños de su hija de 7 años.' },
  { id: 'ord-demo-006', name: 'Jorge Ramos', email: 'jorge.ramos@outlook.com', phone: '901234567', prod: 4, size: 2, flavor: 2, status: 'Preparando', payment: 'parcial', method: 'Yape', delivery: 'domicilio', address: 'Calle Lima 789, Sullana', monto: 100, notes: 'Saldo pendiente S/. 90.' },
  { id: 'ord-demo-007', name: 'Diana Paredes', email: 'diana.paredes@gmail.com', phone: '965432109', prod: 2, size: 1, flavor: 3, status: 'Decoración', payment: 'confirmado', method: 'Plin', delivery: 'recojo', notes: 'Baby shower — tema celestial.' },
  { id: 'ord-demo-008', name: 'Sofía Vásquez', email: 'sofia.vasquez@gmail.com', phone: '954321098', prod: 6, size: 3, flavor: 1, status: 'Decoración', payment: 'confirmado', method: 'Transferencia', delivery: 'domicilio', address: 'Av. Panamericana Km 5, Sullana', notes: 'Fiesta de 15 años — mesa principal.' },
  { id: 'ord-demo-009', name: 'Manuel García', email: 'manuel.garcia@hotmail.com', phone: '943210987', prod: 5, size: 0, flavor: 0, status: 'Listo', payment: 'confirmado', method: 'Efectivo', delivery: 'recojo', notes: 'Recoger antes de las 6pm.', fulfilled: '001' },
  { id: 'ord-demo-010', name: 'Camila Rojas', email: 'camila.rojas@gmail.com', phone: '932109876', prod: 7, size: 1, flavor: 0, status: 'Listo', payment: 'confirmado', method: 'Yape', delivery: 'domicilio', address: 'Jr. Amazonas 234, Sullana', notes: 'Entregar con tarjeta de felicitación.', fulfilled: '003' },
  { id: 'ord-demo-011', name: 'Alejandro Córdova', email: 'alejandro.cordova@yahoo.com', phone: '921098765', prod: 1, size: 2, flavor: 4, status: 'En camino', payment: 'confirmado', method: 'Plin', delivery: 'domicilio', address: 'Urb. Jardín Mz C Lt 8, Sullana', notes: 'Entregar hoy — evento a las 5pm.' },
  { id: 'ord-demo-012', name: 'Paola Núñez', email: 'paola.nunez@gmail.com', phone: '910987654', prod: 3, size: 1, flavor: 1, status: 'Entregado', payment: 'confirmado', method: 'Yape', delivery: 'recojo', notes: '¡Todo perfecto!' },
  { id: 'ord-demo-013', name: 'Renato Salinas', email: 'renato.salinas@gmail.com', phone: '909876543', prod: 0, size: 1, flavor: 2, status: 'Entregado', payment: 'confirmado', method: 'Efectivo', delivery: 'domicilio', address: 'Av. Sullana 1001, Piura', notes: 'Cliente frecuente.' },
  { id: 'ord-demo-014', name: 'Karina Delgado', email: 'karina.delgado@hotmail.com', phone: '987654310', prod: 6, size: 0, flavor: 0, status: 'Entregado', payment: 'confirmado', method: 'Plin', delivery: 'recojo', notes: 'Recomendó a dos amigas.' },
  { id: 'ord-demo-015', name: 'Héctor Flores', email: 'hector.flores@gmail.com', phone: '976543219', prod: 2, size: 0, flavor: 2, status: 'Cancelado', payment: 'rechazado', method: 'Ninguno', delivery: 'recojo', cancel: 'El cliente canceló por viaje inesperado.' },
  { id: 'ord-demo-016', name: 'Gabriela Ponce', email: 'gabriela.ponce@gmail.com', phone: '965432198', prod: 4, size: 1, flavor: 3, status: 'Cancelado', payment: 'pendiente', method: 'Ninguno', delivery: 'domicilio', address: 'Calle Piura 555, Sullana', cancel: 'No confirmó el pago y se canceló por falta de cupo.' },
];

const STATUS_CHAIN = ['Pendiente', 'Confirmado', 'Preparando', 'Decoración', 'Listo', 'En camino', 'Entregado'];

// ─── Helpers ──────────────────────────────────────────────────────
function getImageFiles() {
  if (!fs.existsSync(UPLOADS_DIR)) return [];
  return fs.readdirSync(UPLOADS_DIR).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return EXT_MIME[ext];
  }).sort();
}

async function upsertImage(conn, filePath, filename) {
  const ext = path.extname(filename).toLowerCase();
  const buffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const mime = EXT_MIME[ext] || 'application/octet-stream';

  // Buscar por hash
  const [byHash] = await conn.query(
    'SELECT id, filename, url, file_data FROM uploads WHERE content_hash = ? LIMIT 1',
    [hash]
  );
  if (byHash.length > 0) {
    const row = byHash[0];
    if (!row.file_data) {
      await conn.query('UPDATE uploads SET file_data = ? WHERE id = ?', [buffer, row.id]);
    }
    const url = row.url.startsWith('/') ? row.url : `/api/uploads/${row.filename}`;
    return { filename: row.filename, url, reused: true };
  }

  // Insertar nuevo
  const id = uuid();
  const newFilename = `${uuid()}${ext}`;
  const url = `/api/uploads/${newFilename}`;
  try {
    await conn.query(
      `INSERT INTO uploads (id, filename, original_name, mime_type, size_bytes, url, content_hash, file_data, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, newFilename, filename, mime, buffer.length, url, hash, buffer, 'seed-demo']
    );
    return { filename: newFilename, url, reused: false };
  } catch (e) {
    // Race/duplicado: reutilizar el existente
    if (e?.errno === 1062) {
      const [dup] = await conn.query(
        'SELECT filename, url FROM uploads WHERE content_hash = ? LIMIT 1',
        [hash]
      );
      if (dup.length > 0) {
        const url = dup[0].url.startsWith('/') ? dup[0].url : `/api/uploads/${dup[0].filename}`;
        return { filename: dup[0].filename, url, reused: true };
      }
    }
    throw e;
  }
}

function formatDate(offsetDays, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  d.setHours(hour, Math.floor(Math.random() * 50), 0, 0);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/** Fecha DATE (yyyy-mm-dd) desplazada N días */
function formatDay(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

function trackingCode() {
  return rand(3).toUpperCase();
}

function timelineFor(status) {
  // Cancelado: Pendiente → Cancelado
  if (status === 'Cancelado') {
    return [
      { prev: null, cur: 'Pendiente' },
      { prev: 'Pendiente', cur: 'Cancelado' },
    ];
  }
  // Cadena completa desde Pendiente hasta el estado actual
  const steps = [];
  let prev = null;
  for (const s of STATUS_CHAIN) {
    steps.push({ prev, cur: s });
    prev = s;
    if (s === status) break;
  }
  return steps;
}

// ─── MAIN ─────────────────────────────────────────────────────────
async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  MAISON ROSAS — Seed de datos demo completos');
  console.log('══════════════════════════════════════════════\n');

  const conn = await mysql.createConnection({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD,
    database: DB_NAME, charset: 'utf8mb4', timezone: '+00:00', connectTimeout: 15000,
  });
  console.log(`✅ Conectado a ${DB_HOST}:${DB_PORT}/${DB_NAME}\n`);

  // ── 1. Imágenes ──────────────────────────────────────────────
  console.log('📸 Paso 1/7 — Subiendo imágenes locales (persistentes)...');
  const files = getImageFiles();
  const urls = [];
  const displayUrls = []; // solo fotos de tortas (sin Yape/vouchers), sin duplicados
  if (files.length === 0) {
    console.log('  ⚠️  No hay imágenes en server/uploads/. Se continúa sin imágenes.');
  }
  for (const f of files) {
    const filePath = path.join(UPLOADS_DIR, f);
    const { filename, url, reused } = await upsertImage(conn, filePath, f);
    urls.push(url);
    const isDisplay = !EXCLUDE_FROM_DISPLAY.includes(f);
    if (isDisplay && !displayUrls.includes(url)) {
      displayUrls.push(url);
    }
    console.log(`  ${reused ? '♻️' : '📤'} ${f} → ${url}${isDisplay ? '' : '  (excluida de productos)'}`);
  }
  console.log(`  ${urls.length} imágenes subidas · ${displayUrls.length} aptas para vitrina.\n`);

  // ── 2. Asignar imágenes a productos / galería / config ───────
  console.log('🎂 Paso 2/7 — Asignando imágenes a productos, galería y config...');
  if (displayUrls.length >= PRODUCTS.length) {
    // Repartir imágenes de tortas: 3 por producto, rotando entre el pool
    for (let i = 0; i < PRODUCTS.length; i++) {
      const p = PRODUCTS[i];
      const productImages = [0, 1, 2].map((k) => displayUrls[(i * 3 + k * 4) % displayUrls.length]);
      await conn.query(
        'UPDATE products SET images = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(productImages), p.id]
      );
      console.log(`  ✓ ${p.name} → ${productImages.length} imágenes`);
    }
    // Galería: reutilizar imágenes variadas (solo fotos de tortas)
    const [galRows] = await conn.query('SELECT id FROM gallery ORDER BY id LIMIT 6');
    for (let i = 0; i < galRows.length; i++) {
      const imgUrl = displayUrls[(i * 3 + 5) % displayUrls.length];
      await conn.query('UPDATE gallery SET image_url = ? WHERE id = ?', [imgUrl, galRows[i].id]);
    }
    // Config: hero/about con fotos de tortas + logo/favicon del cliente
    const [cfg] = await conn.query('SELECT config_value FROM config WHERE config_key = ?', ['app_config']);
    if (cfg.length > 0) {
      const config = typeof cfg[0].config_value === 'string' ? JSON.parse(cfg[0].config_value) : cfg[0].config_value;
      config.heroImage = displayUrls[0];
      config.aboutImage = displayUrls[1] || displayUrls[0];
      config.logoUrl = '/logo.png';
      config.faviconUrl = '/favicon.svg';
      await conn.query('UPDATE config SET config_value = ? WHERE config_key = ?', [JSON.stringify(config), 'app_config']);
      console.log('  ✓ Config actualizada (hero/about/logo/favicon)');
    }
  }
  console.log('');

  // ── 3. Pedidos demo ──────────────────────────────────────────
  console.log('📦 Paso 3/7 — Creando pedidos demo en todos los estados...');

  // Si se pasa --reset, se borran los pedidos demo existentes (con su timeline)
  // para regenerarlos con los datos actualizados.
  const doReset = process.argv.includes('--reset');
  if (doReset) {
    const [demoIds] = await conn.query("SELECT id FROM orders WHERE id LIKE 'ord-demo-%'");
    for (const r of demoIds) {
      await conn.query('DELETE FROM order_timeline WHERE order_id = ?', [r.id]);
      await conn.query('DELETE FROM orders WHERE id = ?', [r.id]);
    }
    console.log(`  ♻️  ${demoIds.length} pedidos demo anteriores eliminados para regenerar.`);
  }


  // Sabores/decoraciones reales de cada producto (desde BD)
  const [prodRows] = await conn.query('SELECT id, flavors, decorations FROM products');
  const productDetails = new Map();
  const parseJsonField = (val) => {
    if (val == null || val === '') return [];
    if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
    return val; // mysql2 ya lo devuelve como objeto/array
  };
  for (const pr of prodRows) {
    productDetails.set(pr.id, {
      flavors: parseJsonField(pr.flavors),
      decorations: parseJsonField(pr.decorations),
    });
  }

  let ordersCreated = 0;
  for (const od of DEMO_ORDERS) {
    const [exists] = await conn.query('SELECT id FROM orders WHERE id = ?', [od.id]);
    if (exists.length > 0) continue;

    const prod = PRODUCTS[od.prod];
    const size = SIZES[od.size];
    const filling = FILLINGS[od.flavor];
    const basePrice = prod.base;
    const totalPrice = Math.max(basePrice, basePrice + size.modifier + filling.price);
    const tracking = trackingCode();
    const idx = DEMO_ORDERS.indexOf(od);
    const createdOffset = (DEMO_ORDERS.length - idx) * 2 + 3;
    const createdAt = formatDate(createdOffset, 9 + (idx % 8));

    const details = productDetails.get(prod.id) || { flavors: [], decorations: [] };
    const realFlavor = details.flavors[od.flavor % Math.max(details.flavors.length, 1)] || 'Vainilla Francesa';
    const realDecoration = details.decorations[od.size % Math.max(details.decorations.length, 1)] || 'Ninguna';
    const flavorText = filling.price > 0
      ? `${realFlavor} con relleno de ${filling.label}`
      : realFlavor;

    // Voucher de pago: usar la imagen del Yape (ba4f5138...) cuando exista
    // para que los comprobantes se vean realistas; nunca se usa como foto de torta.
    const yapeUrl = urls.find((u) => u.includes('ba4f5138')) || null;
    const voucherUrl = od.payment === 'confirmado'
      ? (yapeUrl || (urls.length > 0 ? urls[(idx + 2) % urls.length] : null))
      : null;

    // Fotos de progreso para pedidos en/de cocina
    const progressPhotos = [];
    if (['Preparando', 'Decoración', 'Listo', 'En camino', 'Entregado'].includes(od.status) && urls.length > 2) {
      progressPhotos.push(
        { id: `photo-${od.id}-1`, imageUrl: urls[(idx * 2) % urls.length], caption: 'Bizcocho horneado y enfriando', stage: 'bizcocho', uploadedAt: formatDate(createdOffset - 1, 10) },
        { id: `photo-${od.id}-2`, imageUrl: urls[(idx * 2 + 1) % urls.length], caption: 'Cobertura y decoración', stage: 'decoracion', uploadedAt: formatDate(createdOffset, 9) }
      );
    }

    const montoPagado = od.payment === 'confirmado' ? totalPrice : (od.monto || 0);

    await conn.query(
      `INSERT INTO orders (
        id, tracking_code, customer_name, customer_email, customer_phone, customer_age,
        product_name, product_id, size, flavor, selected_decoration, custom_color, theme,
        message, celebrated_name, special_notes, total_price, status, cancel_reason,
        delivery_type, delivery_date, delivery_time, delivery_address, whatsapp_message,
        payment_status, payment_method, monto_pagado, fecha_pago, confirmed_by_admin,
        voucher_url, voucher_name, voucher_uploaded_at, fulfilled_from_stock,
        assigned_stock_id, status_entered_at, kitchen_notes, progress_photos, created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        od.id, tracking, od.name, od.email, od.phone, null,
        prod.name, prod.id, size.label, flavorText, realDecoration, null, od.notes || null,
        od.message || null, od.celebrated || null, od.notes || null, totalPrice, od.status, od.cancel || null,
        od.delivery, formatDay(createdOffset - 1), '12:00', od.address || null, null,
        od.payment, od.method, montoPagado, od.payment === 'confirmado' ? formatDay(createdOffset - 1) : null, 'admin',
        voucherUrl,
        yapeUrl ? 'voucher-yape.png' : `voucher-demo-${od.id}.png`, formatDate(createdOffset - 1, 11),
        od.fulfilled ? 1 : 0, od.fulfilled ? `stock-demo-${od.fulfilled}` : null,
        od.status === 'Preparando' || od.status === 'Decoración' || od.status === 'Listo' ? formatDate(createdOffset, 8) : null,
        od.kitchen || null, JSON.stringify(progressPhotos), createdAt,
      ]
    );

    // Timeline
    const steps = timelineFor(od.status);
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i];
      const changedBy = i === 0 ? 'system' : (st.cur === 'Cancelado' ? 'admin' : 'cocina');
      const t = new Date(new Date(createdAt).getTime() + i * 36e5);
      await conn.query(
        `INSERT INTO order_timeline (id, order_id, previous_status, new_status, changed_by, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid(), od.id, st.prev, st.cur, changedBy, st.cur === 'Cancelado' ? od.cancel : null, t.toISOString().slice(0, 19).replace('T', ' ')]
      );
    }

    ordersCreated++;
    console.log(`  ✓ ${od.id} — ${od.name} · ${prod.name} · ${od.status} · S/.${totalPrice}`);
  }
  console.log(`  ${ordersCreated} pedidos creados.\n`);

  // ── 4. Cake stock ────────────────────────────────────────────
  console.log('🧁 Paso 4/7 — Creando inventario cake_stock...');
  const STOCK_ITEMS = [
    { id: 'stock-demo-001', name: 'Trufa Imperial 16cm', prod: 0, qty: 2 },
    { id: 'stock-demo-002', name: 'Red Velvet Oro 22cm', prod: 3, qty: 1 },
    { id: 'stock-demo-003', name: 'Macarons Lila 16cm', prod: 2, qty: 3 },
    { id: 'stock-demo-004', name: 'Naked Bosque 24cm', prod: 6, qty: 1 },
    { id: 'stock-demo-005', name: 'Arcoíris Infantil 16cm', prod: 4, qty: 2 },
    { id: 'stock-demo-006', name: 'Chocolatier Espejo 22cm', prod: 5, qty: 1 },
  ];
  let stockCreated = 0;
  for (const s of STOCK_ITEMS) {
    const [exists] = await conn.query('SELECT id FROM cake_stock WHERE id = ?', [s.id]);
    if (exists.length > 0) continue;
    const prod = PRODUCTS[s.prod];
    await conn.query(
      `INSERT INTO cake_stock (id, name, product_id, flavor, size, decoration, quantity, notes, image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.name, prod.id, 'Vainilla Francesa', '16 cm', 'Ninguna', s.qty, 'Pastel listo para despacho.', urls.length > 0 ? urls[(s.qty * 3) % urls.length] : null, formatDate(2)]
    );
    stockCreated++;
  }
  console.log(`  ${stockCreated} items de stock creados.\n`);

  // ── 5. Mensajes de contacto ──────────────────────────────────
  console.log('💬 Paso 5/7 — Creando mensajes de contacto...');
  const CONTACT_MSGS = [
    { id: 'msg-demo-001', name: 'Fiorella Chávez', email: 'fiorella.chavez@gmail.com', msg: 'Hola, ¿hacen pasteles sin gluten para celíacos? Quisiera encargar uno para mi mamá.', read: 0 },
    { id: 'msg-demo-002', name: 'Bryan Huamán', email: 'bryan.huaman@outlook.com', msg: 'Quisiera cotizar un pastel de 3 pisos para una boda en diciembre. ¿Tienen disponibilidad?', read: 0 },
    { id: 'msg-demo-003', name: 'Rosa Quispe', email: 'rosa.quispe@gmail.com', msg: 'Hola, pedí un pastel la semana pasada y quedó espectacular. ¿Puedo compartir fotos en sus redes?', read: 1 },
    { id: 'msg-demo-004', name: 'Pedro Lozano', email: 'pedro.lozano@gmail.com', msg: '¿Entregan a Piura capital? ¿Cuál es el costo del delivery?', read: 0 },
    { id: 'msg-demo-005', name: 'Andrea Saldarriaga', email: 'andrea.s@gmail.com', msg: 'Quiero el modelo Cielo de Macarons para el cumple de mi hija, ¿cuántos días antes debo pedirlo?', read: 1 },
  ];
  let msgsCreated = 0;
  for (const m of CONTACT_MSGS) {
    const [exists] = await conn.query('SELECT id FROM contact_messages WHERE id = ?', [m.id]);
    if (exists.length > 0) continue;
    await conn.query(
      'INSERT INTO contact_messages (id, name, email, message, `read`, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [m.id, m.name, m.email, m.msg, m.read, formatDate(4 + CONTACT_MSGS.indexOf(m), 15)]
    );
    msgsCreated++;
  }
  console.log(`  ${msgsCreated} mensajes creados.\n`);

  // ── 5b. Reseñas demo adicionales (aprobadas para vitrina) ─────
  console.log('⭐ Paso 5b/7 — Agregando reseñas demo aprobadas...');
  const DEMO_REVIEWS = [
    { id: 'rev-demo-001', author: 'Fiorella Chávez', role: 'Madre de familia', rating: 5, comment: 'El pastel de cumpleaños de mi mamá quedó hermoso y delicioso. La atención de Carol es de otro nivel, 100% recomendada.', cake_model: 'Maison Trufa Imperial', days: 6, response: '¡Gracias Fiorella! Fue un placer.' },
    { id: 'rev-demo-002', author: 'Bryan Huamán', role: 'Cliente frecuente', rating: 5, comment: 'Pedí el Chocolatier de Autor para el aniversario y superó todo. El glaseado espejo era una obra de arte. Volveremos por más.', cake_model: 'Chocolatier de Autor', days: 9, response: null },
    { id: 'rev-demo-003', author: 'Valeria Castillo', role: 'Mamá de cumpleañera', rating: 5, comment: 'El Encanto Infantil Celestial fue el centro de la fiesta de mi hija. Los merengues estaban perfectos y el sabor de fresa delicioso.', cake_model: 'Encanto Infantil Celestial', days: 12, response: '¡Qué alegría leer esto! 🎂' },
    { id: 'rev-demo-004', author: 'Jorge Ramos', role: 'Esposo agradecido', rating: 5, comment: 'Siempre elijo Maison Rosas para sorprender a mi esposa. La calidad y puntualidad son impecables. ¡Gracias familia Rosas!', cake_model: 'Elegancia de Oro & Velvet', days: 15, response: null },
    { id: 'rev-demo-005', author: 'Diana Paredes', role: 'Organizadora de eventos', rating: 5, comment: 'Trabajé con ellos para un baby shower y el resultado fue espectacular. La decoración temática y el sabor, perfectos.', cake_model: 'Cielo de Macarons', days: 18, response: '¡Gracias Diana! Siempre un gusto.' },
    { id: 'rev-demo-006', author: 'Camila Rojas', role: 'Novia', rating: 5, comment: 'Nuestro pastel de boda fue más bonito de lo que imaginamos. Las flores frescas y el Red Velvet dejaron a todos sin palabras.', cake_model: 'Rosado Floral Vintage', days: 22, response: '¡Felicidades a la pareja! 💍' },
  ];
  let reviewsCreated = 0;
  for (const r of DEMO_REVIEWS) {
    const [exists] = await conn.query('SELECT id FROM reviews WHERE id = ?', [r.id]);
    if (exists.length > 0) continue;
    await conn.query(
      `INSERT INTO reviews (id, author, role, rating, comment, cake_model, date, approved, response, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [r.id, r.author, r.role, r.rating, r.comment, r.cake_model, formatDay(r.days), r.response, formatDate(r.days, 13)]
    );
    reviewsCreated++;
  }
  console.log(`  ${reviewsCreated} reseñas demo creadas.\n`);

  // ── 6. Activity logs ─────────────────────────────────────────
  console.log('📝 Paso 6/7 — Agregando activity logs demo...');
  const ACTIONS = [
    ['Estado de pedido actualizado', 'Pedido ord-demo-003: Confirmado → Preparando', 'admin'],
    ['Pago registrado', 'Pedido ord-demo-006: pago parcial S/. 100.00 (Yape)', 'admin'],
    ['Pedido cancelado', 'Pedido ord-demo-015: cancelado por el cliente', 'admin'],
    ['Stock asignado', 'stock-demo-002 asignado al pedido ord-demo-012', 'stock_manager'],
    ['Inventario actualizado', 'Nuevo stock: Red Velvet Oro 22cm (x1)', 'stock_manager'],
    ['Inicio de sesión', 'La administradora inició sesión.', 'admin'],
  ];
  let logsCreated = 0;
  for (const [action, details, role] of ACTIONS) {
    await conn.query(
      'INSERT INTO activity_logs (id, action, details, role, created_at) VALUES (?, ?, ?, ?, ?)',
      [uuid(), action, details, role, formatDate(logsCreated, 16)]
    );
    logsCreated++;
  }
  console.log(`  ${logsCreated} activity logs agregados.\n`);

  // ── 7. Contraseñas de roles ──────────────────────────────────
  console.log('🔐 Paso 7/7 — Sincronizando contraseñas de roles...');
  // ⚠️ El rol admin puede tener una contraseña personalizada cambiada desde
  // el panel (solo la conoce el dueño). Por eso SOLO se crea si no existe;
  // NUNCA se sobrescribe. Analyst y stock_manager usan las documentadas.
  for (const [role, password] of Object.entries(PASSWORDS)) {
    const [existing] = await conn.query('SELECT id FROM admin_auth WHERE role = ?', [role]);
    if (existing.length > 0) {
      if (role === 'admin') {
        console.log(`  🔒 ${role}: contraseña personalizada conservada (no se toca)`);
      } else {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        await conn.query('UPDATE admin_auth SET password_hash = ? WHERE role = ?', [hash, role]);
        console.log(`  ✓ ${role}: contraseña sincronizada (documentada)`);
      }
    } else {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      await conn.query('INSERT INTO admin_auth (role, password_hash) VALUES (?, ?)', [role, hash]);
      console.log(`  ✓ ${role}: rol creado con contraseña documentada`);
    }
  }
  console.log('');

  // ── Resumen ──────────────────────────────────────────────────
  const [counts] = await conn.query(`
    SELECT
      (SELECT COUNT(*) FROM products) AS products,
      (SELECT COUNT(*) FROM orders) AS orders,
      (SELECT COUNT(*) FROM order_timeline) AS timeline,
      (SELECT COUNT(*) FROM gallery) AS gallery,
      (SELECT COUNT(*) FROM reviews) AS reviews,
      (SELECT COUNT(*) FROM cake_stock) AS stock,
      (SELECT COUNT(*) FROM contact_messages) AS contact,
      (SELECT COUNT(*) FROM activity_logs) AS activity,
      (SELECT COUNT(*) FROM uploads WHERE file_data IS NOT NULL) AS uploads_with_data
  `);
  console.log('══════════════════════════════════════════════');
  console.log('  ✅ SEED COMPLETO — Resumen:');
  console.log('──────────────────────────────────────────────');
  for (const [k, v] of Object.entries(counts[0])) {
    console.log(`  ${k.padEnd(18)} ${v}`);
  }
  console.log('══════════════════════════════════════════════\n');

  await conn.end();
}

main().catch((err) => {
  console.error('\n❌ Error:', err?.message || err);
  process.exit(1);
});
