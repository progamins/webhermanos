/**
 * Clasificador de intenciones del asistente (sin IA).
 *
 * Reglas locales de coincidencia de palabras clave en español. Diseñado para
 * que posteriormente una IA (p. ej. DeepSeek vía NVIDIA) pueda REEMPLAZAR o
 * COMPLEMENTAR a `classifyIntent` sin tocar el resto del sistema: la capa de
 * respuestas solo recibe el `IntentResult` (ver AIProvider.ts).
 *
 * Jerarquía: presentación > producto específico > ocasión/recomendación >
 * info (pago/envío/dirección/anticipación/personalización) > precios/
 * catálogo/estado de pedido/horarios/humano/pedido > small talk > UNKNOWN.
 */

import type { Product } from '../../lib/types.js';

/** Intenciones canónicas (Fase 5 del plan de automatización). */
export type AssistantIntent =
  | 'GREETING'
  | 'PRODUCT_SEARCH'
  | 'PRODUCT_PRICE'
  | 'BUSINESS_HOURS'
  | 'ORDER_CREATE'
  | 'ORDER_STATUS'
  | 'HUMAN_SUPPORT'
  | 'PRESENTATION'
  | 'OCCASION'
  | 'RECOMMENDATION'
  | 'PAYMENT_INFO'
  | 'DELIVERY_INFO'
  | 'ADDRESS_INFO'
  | 'LEAD_TIME_INFO'
  | 'CUSTOMIZATION_INFO'
  | 'THANKS'
  | 'GOODBYE'
  | 'WHO_ARE_YOU'
  | 'HELP'
  | 'ACKNOWLEDGMENT'
  | 'UNKNOWN';

export interface IntentResult {
  intent: AssistantIntent;
  /** Producto específico detectado (por nombre/tag/sabor). */
  product?: Product;
  /** Lista filtrada (ocasión, recomendación, sabores o categoría). */
  products?: Product[];
  /** Texto introductorio para la lista filtrada. */
  listIntro?: string;
  /** Etiqueta de la ocasión detectada (p. ej. "Bodas"). */
  occasionLabel?: string;
}

export type ProductListMode = 'catalog' | 'prices' | 'order';

/** Máximo de productos por lista (evita respuestas interminables). */
export const MAX_PRODUCTS_PER_LIST = 12;

// ─── Normalización ───

/** Normaliza texto: minúsculas, sin tildes, sin puntuación, espacios simples. */
export function normalizeText(s: string): string {
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

// ─── Vocabulario de intenciones (normalizado: sin tildes) ───

const GREETING_WORDS = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'buen dia', 'que tal', 'hey', 'holi', 'buenas', 'saludos'];
const THANKS_WORDS = ['gracias', 'te agradezco', 'agradecido', 'muchas gracias', 'mil gracias'];
const GOODBYE_WORDS = ['adios', 'chao', 'hasta luego', 'nos vemos', 'hasta pronto', 'bye', 'me voy', 'cuidate', 'cuidese'];
const WHO_WORDS = ['quien eres', 'que eres', 'eres un bot', 'eres un robot', 'eres robot', 'eres bot', 'eres real', 'eres humano', 'eres una maquina', 'eres un programa', 'como te llamas', 'cual es tu nombre', 'tu nombre', 'quien sos'];
const HELP_WORDS = ['que puedes hacer', 'que podes hacer', 'en que me ayudas', 'como me ayudas', 'que haces', 'ayuda', 'ayudame', 'como funciona', 'que ofrecen', 'que venden', 'que tienen', 'que hacen', 'servicios', 'opciones'];
const HERE_WORDS = ['estas ahi', 'estas aqui', 'me escuchas', 'hay alguien', 'alguien ahi', 'me oyes'];
const ACK_WORDS = ['ok', 'perfecto', 'entendido', 'de acuerdo', 'dale', 'listo', 'genial', 'excelente', 'muy bien', 'esta bien', 'todo bien', 'suena bien'];
const PRODUCT_WORDS = ['producto', 'productos', 'catalogo', 'keke', 'kekes', 'torta', 'tortas', 'pastel', 'pasteles', 'menu', 'carta', 'variedad', 'lista', 'postre', 'postres'];
const PRICE_WORDS = ['precio', 'precios', 'cuanto cuesta', 'cuanto vale', 'cuanto sale', 'cuanto esta', 'costo', 'costos', 'tarifa', 'barato', 'soles', 'cuesta', 'vale'];
const ORDER_WORDS = ['pedir', 'pedido', 'pedidos', 'comprar', 'compra', 'orden', 'encargo', 'encargar', 'reservar', 'quiero', 'necesito', 'ordenar', 'hacer un pedido'];
const ORDER_STATUS_WORDS = ['donde esta mi pedido', 'estado de mi pedido', 'mi pedido', 'seguimiento', 'tracking', 'rastrear', 'cuando llega', 'cuando llega mi pedido', 'listo mi pedido'];
const HOURS_WORDS = ['horario', 'horarios', 'hora', 'abierto', 'cerrado', 'atienden', 'abren', 'cierran', 'a que hora', 'que horas', 'cuando atienden', 'cuando abren'];
const WHATSAPP_WORDS = ['whatsapp', 'wsp', 'wa.me', 'numero', 'telefono', 'contactar', 'contacto', 'hablar', 'escribirte', 'chat', 'mensaje', 'atencion personal'];
const HUMAN_WORDS = ['hablar con alguien', 'persona real', 'agente', 'hablar con carol', 'hablar con edwin', 'atencion humana', 'que me atienda', 'asesor', 'un humano'];
const ADDRESS_WORDS = ['direccion', 'ubicacion', 'donde estan', 'donde queda', 'donde se ubican', 'estan ubicados'];
const DELIVERY_WORDS = ['delivery', 'envio', 'envios', 'envian', 'entrega', 'reparto', 'recojo', 'a domicilio', 'domicilio'];
const PAYMENT_WORDS = ['pago', 'pagar', 'yape', 'plin', 'transferencia', 'efectivo', 'deposito', 'medios de pago', 'metodo de pago', 'metodos de pago'];
const RECOMMEND_WORDS = ['recomienda', 'recomiendame', 'sugiere', 'sugerencia', 'sugerencias', 'que me aconsejas', 'cual me recomiendas', 'cual es el mejor', 'el mas pedido', 'mas pedido', 'mas vendido', 'favorito', 'cual me sugieres'];
const CUSTOM_WORDS = ['personalizar', 'personalizado', 'personalizada', 'diseno', 'decoracion especial', 'con foto', 'con logo', 'logotipo', 'tematica', 'tema de', 'a medida', 'hecho a pedido'];
const LEADTIME_WORDS = ['anticipacion', 'cuanto tiempo', 'con cuanta', 'por adelantado', 'cuanto antes', 'con cuanto tiempo', 'tiempo de preparacion', 'tiempo de anticipacion'];

/** Ocasiones especiales → se intenta filtrar por categoría del catálogo. */
const OCCASIONS: Array<{ label: string; words: string[] }> = [
  { label: 'Bodas', words: ['boda', 'casamiento', 'matrimonio', 'casarse', 'novia', 'novio'] },
  { label: 'Cumpleaños', words: ['cumple', 'cumpleanos', 'cumpleanitos'] },
  { label: 'Infantiles', words: ['infantil', 'infantiles', 'nino', 'nina', 'bebe', 'baby', 'quince', 'quinceanera'] },
  { label: 'Aniversarios', words: ['aniversario'] },
  { label: 'Especiales', words: ['especial', 'sorpresa', 'graduacion'] },
];

// ─── Búsqueda de productos ───

type ProductHit =
  | { type: 'none' }
  | { type: 'product'; product: Product }
  | { type: 'list'; products: Product[]; intro: string };

/** Busca un producto por nombre, tag, sabor o categoría mencionados en el texto. */
function matchProductByText(norm: string, active: Product[]): ProductHit {
  if (active.length === 0) return { type: 'none' };

  const byName = active.filter((p) =>
    norm.includes(normalizeText(p.name)) ||
    (p.tags && p.tags.some((t) => norm.includes(normalizeText(t)))),
  );
  if (byName.length === 1) return { type: 'product', product: byName[0] };
  if (byName.length > 1) return { type: 'list', products: byName, intro: 'Encontré varias opciones que podrían interesarte 😊' };

  const byFlavor = active.filter((p) => p.flavors && p.flavors.some((f) => norm.includes(normalizeText(f))));
  if (byFlavor.length === 1) return { type: 'product', product: byFlavor[0] };
  if (byFlavor.length > 1) return { type: 'list', products: byFlavor, intro: 'Estos kekes tienen el sabor que mencionas 😋' };

  const byCategory = active.filter((p) => p.category && norm.includes(normalizeText(p.category)));
  if (byCategory.length > 0) return { type: 'list', products: byCategory, intro: `Estos son los kekes de ${byCategory[0].category} 😊` };

  return { type: 'none' };
}

/** Deduce el modo de presentación (catálogo/precios/pedido) según el texto. */
export function inferMode(norm: string): ProductListMode {
  if (hasAny(norm, PRICE_WORDS)) return 'prices';
  if (hasAny(norm, ORDER_WORDS)) return 'order';
  return 'catalog';
}

// ─── Clasificador principal ───

/**
 * Clasifica un mensaje de texto libre en una intención canónica.
 * Punto de extensión futuro: un NvidiaAIProvider (DeepSeek) puede llamar a
 * este mismo método o reemplazarlo internamente; el contrato no cambia.
 */
export function classifyIntent(raw: string, products: Product[]): IntentResult {
  const norm = normalizeText(raw);
  if (!norm) return { intent: 'UNKNOWN' };

  const active = products.filter((p) => p.active !== false);
  const mode = inferMode(norm);

  // ── Presentación (trata al visitante como "usuario", sin recopilar nombres) ──
  if (/(?:me llamo|mi nombre es|soy)\s+[a-z]{2,}/.test(norm)) {
    return { intent: 'PRESENTATION' };
  }

  // ── Producto específico (nombre, tag, sabor o categoría) ──
  const hit = matchProductByText(norm, active);
  if (hit.type === 'product') return { intent: 'PRODUCT_SEARCH', product: hit.product };
  if (hit.type === 'list') return { intent: 'PRODUCT_SEARCH', products: hit.products, listIntro: hit.intro };

  // ── Ocasiones especiales y recomendaciones ──
  const occasion = OCCASIONS.find((o) => o.words.some((w) => norm.includes(w)));
  if (hasAny(norm, RECOMMEND_WORDS) || occasion) {
    const byCategory = occasion && active.some((p) => p.category && normalizeText(p.category).includes(normalizeText(occasion.label)))
      ? active.filter((p) => p.category && normalizeText(p.category).includes(normalizeText(occasion.label)))
      : [];
    const list = byCategory.length > 0 ? byCategory : active.slice(0, MAX_PRODUCTS_PER_LIST);
    const intro = occasion
      ? (byCategory.length > 0
        ? `¡Claro! Estos son nuestros kekes para ${occasion.label} 😍`
        : `¡Claro! Para ${occasion.label} te recomiendo estas opciones 🎂`)
      : '¡Claro! Estos son los favoritos de nuestros clientes ⭐';
    return {
      intent: occasion ? 'OCCASION' : 'RECOMMENDATION',
      products: list,
      listIntro: intro,
      occasionLabel: occasion?.label,
    };
  }

  // ── Información del negocio (más específica que precios/pedido) ──
  if (hasAny(norm, PAYMENT_WORDS)) return { intent: 'PAYMENT_INFO' };
  if (hasAny(norm, DELIVERY_WORDS)) return { intent: 'DELIVERY_INFO' };
  if (hasAny(norm, ADDRESS_WORDS)) return { intent: 'ADDRESS_INFO' };
  if (hasAny(norm, LEADTIME_WORDS)) return { intent: 'LEAD_TIME_INFO' };
  if (hasAny(norm, CUSTOM_WORDS)) return { intent: 'CUSTOMIZATION_INFO' };

  // ── Catálogo / negocio ──
  if (hasAny(norm, PRICE_WORDS)) return { intent: 'PRODUCT_PRICE' };
  if (hasAny(norm, PRODUCT_WORDS)) return { intent: 'PRODUCT_SEARCH' };
  if (hasAny(norm, ORDER_STATUS_WORDS)) return { intent: 'ORDER_STATUS' };
  if (hasAny(norm, HOURS_WORDS)) return { intent: 'BUSINESS_HOURS' };
  if (hasAny(norm, WHATSAPP_WORDS) || hasAny(norm, HUMAN_WORDS)) return { intent: 'HUMAN_SUPPORT' };
  if (hasAny(norm, ORDER_WORDS)) return { intent: 'ORDER_CREATE' };

  // ── Small talk ──
  if (hasAny(norm, GREETING_WORDS)) return { intent: 'GREETING' };
  if (hasAny(norm, THANKS_WORDS)) return { intent: 'THANKS' };
  if (hasAny(norm, GOODBYE_WORDS)) return { intent: 'GOODBYE' };
  if (hasAny(norm, WHO_WORDS)) return { intent: 'WHO_ARE_YOU' };
  if (hasAny(norm, HELP_WORDS)) return { intent: 'HELP' };
  if (hasAny(norm, HERE_WORDS)) return { intent: 'GREETING' };
  if (hasAny(norm, ACK_WORDS)) return { intent: 'ACKNOWLEDGMENT' };

  return { intent: 'UNKNOWN' };
}

/** Mapa acción de botón → intención (para logs/observabilidad). */
export function actionToIntent(actionType: string): AssistantIntent {
  switch (actionType) {
    case 'products': case 'product': return 'PRODUCT_SEARCH';
    case 'prices': return 'PRODUCT_PRICE';
    case 'order': case 'orderProduct': return 'ORDER_CREATE';
    case 'hours': return 'BUSINESS_HOURS';
    case 'whatsapp': case 'whatsappProduct': return 'HUMAN_SUPPORT';
    case 'menu': return 'HELP';
    default: return 'UNKNOWN';
  }
}