/**
 * ═══════════════════════════════════════════════════════════════════
 * MAISON ROSAS — Coherencia de imágenes por sabor de keke
 * ═══════════════════════════════════════════════════════════════════
 * Corrige en la BASE DE DATOS (local o producción) las imágenes de
 * productos y galería para que cada keke muestre la foto de su sabor
 * real (ej. "Keke de Zanahoria" → carrot cake con glaseado de queso,
 * NO una foto aleatoria de otro pastel).
 *
 * Las URLs fueron verificadas una a una visualmente (Wikimedia Commons,
 * licencia libre). Idempotente: se puede ejecutar varias veces; solo
 * actualiza filas cuyo nombre coincida con un sabor y cuya imagen
 * actual difiera.
 *
 * Uso (desde la raíz del repo, con las credenciales DB_* en el entorno
 * del entorno al que apuntas — local o producción):
 *   node scripts/fix-keke-images.mjs            # aplica los cambios
 *   node scripts/fix-keke-images.mjs --dry-run  # solo muestra qué haría
 *
 * ─── Detección de sabores ──────────────────────────────────────────
 * Se compara el nombre del producto (sin acentos, minúsculas) contra
 * claves por sabor, así cubre variantes como "Keke de Zanahoria",
 * "Keké de Zanahoria", "prod-001" (busca por id si lleva el nombre del
 * sabor codificado) o nombres escritos por el admin en el panel.
 * ═══════════════════════════════════════════════════════════════════
 */

import mysql from 'mysql2/promise';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[FIX] ERROR: Falta ${name} en el entorno. Defínelo antes de ejecutar el script.`);
    process.exit(1);
  }
  return value;
}

const DB_HOST = requireEnv('DB_HOST');
const DB_PORT = Number(requireEnv('DB_PORT'));
const DB_USER = requireEnv('DB_USER');
const DB_PASSWORD = requireEnv('DB_PASSWORD');
const DB_NAME = requireEnv('DB_NAME');

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Fotos verificadas visualmente por sabor ───────────────────────
// Las URLs de Unsplash llevan optimización nativa (auto=format & w=).
// Las de Wikimedia (upload.wikimedia.org) son thumbs reales de 960px
// del plato exacto (el proxy del server las reenvía y cachea).
const W = (path) => `https://upload.wikimedia.org/wikipedia/commons/${path}`;
const U = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

const FLAVOR_IMAGES = [
  { key: 'chocolate', images: [U('photo-1578985545062-69928b1d9587'), U('photo-1541783245831-57d6fb0926d3')] },
  { key: 'vainilla', images: [W('6/6e/3f39a0206f0451b485d227484331b25b--vanilla-buttercream-icing-vanilla-cake.jpg')] },
  { key: 'platano', images: [W('thumb/4/45/Banana_bread_cut_into_slices.jpg/960px-Banana_bread_cut_into_slices.jpg')] },
  { key: 'zanahoria', images: [W('thumb/4/4d/Carrot_%26_Walnut_Cake_with_Cream_Cheese_Icing_%2845980651644%29.jpg/960px-Carrot_%26_Walnut_Cake_with_Cream_Cheese_Icing_%2845980651644%29.jpg'), W('thumb/2/2c/Carrot_cake_5.jpg/960px-Carrot_cake_5.jpg')] },
  { key: 'maracuya', images: [W('thumb/a/a4/Passion_Fruit_Cake_of_Argentina_%E2%80%A2_%28Tarta_de_Maracuy%C3%A1%29.jpg/960px-Passion_Fruit_Cake_of_Argentina_%E2%80%A2_%28Tarta_de_Maracuy%C3%A1%29.jpg'), W('thumb/1/18/Passion_Fruit_Cake_%28Tarta_de_Maracuy%C3%A1%29.jpg/960px-Passion_Fruit_Cake_%28Tarta_de_Maracuy%C3%A1%29.jpg')] },
  { key: 'naranja', images: [W('thumb/b/b9/Orange_Cake_-_Olea_2025-08-17.jpg/960px-Orange_Cake_-_Olea_2025-08-17.jpg')] },
  { key: 'lucuma', images: [W('thumb/f/f6/Caramel_Cake.jpg/960px-Caramel_Cake.jpg')] },
  { key: 'canela', images: [W('thumb/9/9b/Walnut_cinnamon_coffee_cake.jpg/960px-Walnut_cinnamon_coffee_cake.jpg')] },
];

// Galería: los ids del seed original (gal-1..gal-6) tienen títulos fijos;
// se actualizan al plato exacto de su título.
const GALLERY_BY_ID = {
  'gal-1': U('photo-1578985545062-69928b1d9587'), // Keke de Chocolate de la Casa
  'gal-2': W('thumb/4/45/Banana_bread_cut_into_slices.jpg/960px-Banana_bread_cut_into_slices.jpg'), // Keke de Plátano con Nuez
  'gal-3': W('6/6e/3f39a0206f0451b485d227484331b25b--vanilla-buttercream-icing-vanilla-cake.jpg'), // Keke de Vainilla Esponjoso
  'gal-4': W('thumb/a/a4/Passion_Fruit_Cake_of_Argentina_%E2%80%A2_%28Tarta_de_Maracuy%C3%A1%29.jpg/960px-Passion_Fruit_Cake_of_Argentina_%E2%80%A2_%28Tarta_de_Maracuy%C3%A1%29.jpg'), // Keke de Maracuyá Fresco
  'gal-5': W('thumb/4/4d/Carrot_%26_Walnut_Cake_with_Cream_Cheese_Icing_%2845980651644%29.jpg/960px-Carrot_%26_Walnut_Cake_with_Cream_Cheese_Icing_%2845980651644%29.jpg'), // Keke de Zanahoria Glaseado
  'gal-6': W('thumb/b/b9/Orange_Cake_-_Olea_2025-08-17.jpg/960px-Orange_Cake_-_Olea_2025-08-17.jpg'), // Keke de Naranja Cítrico
};

// ─── Normalización ─────────────────────────────────────────────────
const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]/g, '');

function flavorFor(text) {
  const n = normalize(text);
  for (const f of FLAVOR_IMAGES) {
    if (n.includes(f.key)) return f;
  }
  return null;
}

function imagesEqual(a, b) {
  const arr = (x) => (Array.isArray(x) ? x : [x]).filter(Boolean);
  const A = arr(a);
  const B = arr(b);
  return A.length === B.length && A.every((v, i) => v === B[i]);
}

async function main() {
  const conn = await mysql.createConnection({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD,
    database: DB_NAME, charset: 'utf8mb4', timezone: '+00:00', connectTimeout: 15000,
  });
  console.log(`[FIX] Conectado a ${DB_HOST}:${DB_PORT}/${DB_NAME}${DRY_RUN ? '  (--dry-run: sin cambios)' : ''}\n`);

  let updated = 0;
  let skipped = 0;

  // ── Productos: por nombre → sabor ──────────────────────────────
  const [products] = await conn.query('SELECT id, name, images FROM products');
  for (const p of products) {
    const flavor = flavorFor(p.name) || flavorFor(p.id); // id puede ser 'prod-001-keke-zanahoria'
    if (!flavor) { skipped++; continue; }
    let current = [];
    try { current = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []); } catch { current = []; }
    if (imagesEqual(current, flavor.images)) { skipped++; continue; }
    console.log(`  🎂 ${p.name} (${p.id})`);
    console.log(`     antes: ${JSON.stringify(current)}`);
    console.log(`     ahora: ${JSON.stringify(flavor.images)}`);
    if (!DRY_RUN) {
      await conn.query('UPDATE products SET images = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [JSON.stringify(flavor.images), p.id]);
    }
    updated++;
  }

  // ── Galería: por id de seed, o por título que mencione un sabor ──
  const [gallery] = await conn.query('SELECT id, image_url, title FROM gallery');
  for (const g of gallery) {
    let target = GALLERY_BY_ID[g.id] || null;
    if (!target && g.title) {
      const flavor = flavorFor(g.title);
      if (flavor) target = flavor.images[0];
    }
    if (!target) { skipped++; continue; }
    if (g.image_url === target) { skipped++; continue; }
    console.log(`  🖼️  Galería "${g.title}" (${g.id})`);
    console.log(`     antes: ${g.image_url}`);
    console.log(`     ahora: ${target}`);
    if (!DRY_RUN) {
      await conn.query('UPDATE gallery SET image_url = ? WHERE id = ?', [target, g.id]);
    }
    updated++;
  }

  console.log(`\n[FIX] ${DRY_RUN ? 'Se actualizarían' : 'Actualizadas'}: ${updated} fila(s) · sin cambios: ${skipped}`);
  await conn.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('[FIX] Error:', err);
  process.exit(1);
});
