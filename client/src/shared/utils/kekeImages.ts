/**
 * ─────────────────────────────────────────────────────────────────────
 * COHERENCIA DE IMÁGENES POR SABOR (capa de visualización)
 * ─────────────────────────────────────────────────────────────────────
 * Garantiza que el sitio muestre la foto correcta para cada keke cuyo
 * nombre indica un sabor ("Keke de Zanahoria" → carrot cake real, no un
 * pastel rojo al azar), SIN depender de lo que haya en la base de datos.
 *
 * Regla:
 *  - Si el nombre/título coincide con un sabor conocido Y la imagen actual
 *    es una foto stock (Unsplash/Wikimedia) que NO es la curada para ese
 *    sabor → se reemplaza por las fotos verificadas de ese sabor.
 *  - Fotos reales subidas por el admin (/api/uploads/, data:, dominios
 *    propios) NUNCA se tocan — prevalecen sobre el stock.
 *  - Productos sin sabor reconocido (tortas personalizadas, diseños)
 *    quedan intactos.
 *
 * Mismo conjunto de URLs curadas que server/src/seed.ts y
 * scripts/fix-keke-images.mjs (mantener en sync).
 * ─────────────────────────────────────────────────────────────────────
 */

const UNSPLASH_BASE = 'https://images.unsplash.com/';
const WIKIMEDIA_BASE = 'https://upload.wikimedia.org/wikipedia/commons/';

const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;
const W = (path: string) => `https://upload.wikimedia.org/wikipedia/commons/${path}`;

/** Fotos verificadas visualmente, por sabor (orden = orden del carrusel). */
export const CURATED_KEKE_IMAGES: Record<string, string[]> = {
  chocolate: [
    U('photo-1578985545062-69928b1d9587'),
    U('photo-1541783245831-57d6fb0926d3'),
  ],
  vainilla: [
    W('6/6e/3f39a0206f0451b485d227484331b25b--vanilla-buttercream-icing-vanilla-cake.jpg'),
  ],
  platano: [
    W('thumb/4/45/Banana_bread_cut_into_slices.jpg/960px-Banana_bread_cut_into_slices.jpg'),
  ],
  zanahoria: [
    W('thumb/4/4d/Carrot_%26_Walnut_Cake_with_Cream_Cheese_Icing_%2845980651644%29.jpg/960px-Carrot_%26_Walnut_Cake_with_Cream_Cheese_Icing_%2845980651644%29.jpg'),
    W('thumb/2/2c/Carrot_cake_5.jpg/960px-Carrot_cake_5.jpg'),
  ],
  maracuya: [
    W('thumb/a/a4/Passion_Fruit_Cake_of_Argentina_%E2%80%A2_%28Tarta_de_Maracuy%C3%A1%29.jpg/960px-Passion_Fruit_Cake_of_Argentina_%E2%80%A2_%28Tarta_de_Maracuy%C3%A1%29.jpg'),
    W('thumb/1/18/Passion_Fruit_Cake_%28Tarta_de_Maracuy%C3%A1%29.jpg/960px-Passion_Fruit_Cake_%28Tarta_de_Maracuy%C3%A1%29.jpg'),
  ],
  naranja: [
    W('thumb/b/b9/Orange_Cake_-_Olea_2025-08-17.jpg/960px-Orange_Cake_-_Olea_2025-08-17.jpg'),
  ],
  lucuma: [
    W('thumb/f/f6/Caramel_Cake.jpg/960px-Caramel_Cake.jpg'),
  ],
  canela: [
    W('thumb/9/9b/Walnut_cinnamon_coffee_cake.jpg/960px-Walnut_cinnamon_coffee_cake.jpg'),
  ],
};

/** Claves de sabor en orden de precedencia (evitar falsos positivos). */
const FLAVOR_KEYS = Object.keys(CURATED_KEKE_IMAGES);

/** Minúsculas + sin acentos para comparar nombres ("Keké de Zanahoria" → "keke de zanahoria"). */
function normalizeKey(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]/g, '');
}

/** Devuelve la clave de sabor si el texto la menciona, o null. */
export function flavorFromText(text: string): string | null {
  const key = normalizeKey(text);
  if (!key) return null;
  return FLAVOR_KEYS.find((flavor) => key.includes(flavor)) || null;
}

/** ¿Es una foto stock de relleno (Unsplash/Wikimedia) en vez de una foto real del negocio? */
export function isStockPlaceholderUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith(UNSPLASH_BASE) || url.startsWith(WIKIMEDIA_BASE);
}

/** URL sin query (?w=800&...) para comparar archivos idénticos. */
function baseUrl(url: string): string {
  return url.split('?')[0];
}

function curatedBases(flavor: string): Set<string> {
  return new Set((CURATED_KEKE_IMAGES[flavor] || []).map(baseUrl));
}

/**
 * Devuelve las imágenes coherentes para un producto según su nombre.
 * Solo reemplaza cuando la foto actual es stock y NO es la curada del
 * sabor (si el admin sube fotos reales o la BD ya tiene las correctas,
 * no se toca nada).
 */
export function coherentImagesForProduct(name: string, images: string[] | undefined): string[] {
  if (!images || images.length === 0) return images || [];
  const flavor = flavorFromText(name);
  if (!flavor) return images;

  const first = images[0];
  const curated = CURATED_KEKE_IMAGES[flavor];

  // Ya coherente (foto curada del sabor) → intacto
  if (curatedBases(flavor).has(baseUrl(first))) return images;

  // Foto real del negocio (upload local / data: / dominio propio) → intacto
  if (!isStockPlaceholderUrl(first)) return images;

  return curated;
}

/** Imagen coherente para un ítem de galería según su título. */
export function coherentImageForGalleryTitle(title: string, imageUrl: string): string {
  if (!imageUrl) return imageUrl;
  const flavor = flavorFromText(title);
  if (!flavor) return imageUrl;
  const curated = CURATED_KEKE_IMAGES[flavor];
  if (!curated) return imageUrl;
  if (curatedBases(flavor).has(baseUrl(imageUrl))) return imageUrl;
  if (!isStockPlaceholderUrl(imageUrl)) return imageUrl;
  return curated[0];
}
