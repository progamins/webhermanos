/**
 * ═══════════════════════════════════════════════════════════════════════
 * ATENCIÓN AUTOMÁTICA — Capa de servicio (lógica de negocio del asistente)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Este módulo concentra TODA la lógica del asistente web (estado del
 * negocio, respuestas predefinidas, máquina de estados del flujo y enlaces
 * a WhatsApp) SIN depender de React ni de la UI. La interfaz pública es:
 *
 *     assistantRespond(screen, action, ctx) → AssistantReply
 *
 * ───────────────────────────────────────────────────────────────────────
 * PREPARACIÓN PARA FUTURAS AUTOMATIZACIONES (n8n / WhatsApp / IA)
 * ───────────────────────────────────────────────────────────────────────
 * La arquitectura está pensada para que más adelante un adaptador externo
 * pueda sustituir o complementar a `assistantRespond` sin tocar la UI:
 *
 *   UI (AssistantPanel)
 *     │  envía: { screen, action, ctx }   (contrato de mensajes)
 *     ▼
 *   attentionService.assistantRespond()    ← HOY: lógica local pura
 *     │
 *     │  En el futuro: este punto puede delegar en un webhook de n8n o en
 *     │  una API de WhatsApp/Telegram/IA con el MISMO contrato de entrada
 *     │  (screen + action + datos) y el MISMO contrato de salida
 *     │  (AssistantReply: mensajes + nextScreen + effect opcional).
 *     ▼
 *   APIs existentes del proyecto (GET /api/products, POST /api/orders,
 *   GET /api/config) → base de datos
 *
 * Para conectar n8n basta con exponer un endpoint que reciba
 * { screen, action, ctx } y devuelva un AssistantReply, y reemplazar
 * la llamada interna a `buildScreenMessages`. Nada de la UI cambia.
 * ───────────────────────────────────────────────────────────────────────
 */

import type { AppConfig, BusinessHourDay, Product } from '../types';

// ─── Constantes (mismos valores por defecto que DEFAULT_CONFIG del server) ───

/** Etiquetas de días según Date.getDay(): 0 = Domingo ... 6 = Sábado */
export const DAY_LABELS = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
];

/** Horarios por defecto — reflejan el texto de `openingHours` del negocio. */
export const DEFAULT_BUSINESS_HOURS: BusinessHourDay[] = [
  { day: 1, open: '09:00', close: '19:00' },
  { day: 2, open: '09:00', close: '19:00' },
  { day: 3, open: '09:00', close: '19:00' },
  { day: 4, open: '09:00', close: '19:00' },
  { day: 5, open: '09:00', close: '19:00' },
  { day: 6, open: '09:00', close: '19:00' },
  { day: 0, open: '10:00', close: '14:00' },
];

export const DEFAULT_ASSISTANT_MESSAGES = {
  welcome: '¡Hola! 👋 Bienvenido(a) a Maison Rosas. ¿En qué podemos ayudarte?',
  closed: 'Actualmente estamos fuera de horario 😴 Puedes dejar tu pedido por WhatsApp y te atenderemos apenas estemos disponibles.',
  whatsapp: 'Hola Carol y Edwin 🍰 Vengo de la web de Maison Rosas y me gustaría hacer una consulta.',
  open: 'Estamos atendiendo actualmente 😊',
};

export const DEFAULT_WHATSAPP_NUMBER = '51902568187';

/** Máximo de productos mostrados por lista (evita paneles interminables). */
const MAX_PRODUCTS_PER_LIST = 12;

// ─── Estado del negocio (ABIERTO / CERRADO) ───

export function getBusinessHours(config: AppConfig | null): BusinessHourDay[] {
  const hours = config?.businessHours;
  return hours && hours.length > 0 ? hours : DEFAULT_BUSINESS_HOURS;
}

export function isBusinessOpen(config: AppConfig | null, now: Date = new Date()): boolean {
  const hours = getBusinessHours(config);
  const today = hours.find((h) => h.day === now.getDay());
  if (!today || !today.open || !today.close) return false;
  const [openH, openM] = today.open.split(':').map(Number);
  const [closeH, closeM] = today.close.split(':').map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;
  return minutes >= openMin && minutes < closeMin;
}

/** Horario de hoy como texto, p. ej. "Hoy: Lunes 09:00 – 19:00" o "Hoy cerrado". */
export function getTodayScheduleText(config: AppConfig | null, now: Date = new Date()): string {
  const hours = getBusinessHours(config);
  const today = hours.find((h) => h.day === now.getDay());
  const label = DAY_LABELS[now.getDay()] || '';
  if (!today || !today.open || !today.close) return `Hoy ${label}: cerrado`;
  return `Hoy ${label}: ${today.open} – ${today.close}`;
}

// ─── Formato / utilidades ───

export function formatPrice(value: number): string {
  return `S/. ${Math.round(Number(value) || 0)}`;
}

export function buildWhatsAppLink(number: string, message?: string): string {
  const clean = (number || '').replace(/[^\d]/g, '') || DEFAULT_WHATSAPP_NUMBER;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${clean}${text}`;
}

/** Mensaje prefabricado de WhatsApp para un producto concreto. */
export function buildProductWhatsAppMessage(product: Product, config: AppConfig | null): string {
  const shop = config?.whatsappNumber || DEFAULT_WHATSAPP_NUMBER;
  const msg = `Hola 👋 Me interesa el *${product.name}* de ${formatPrice(product.basePrice)} que vi en la web de Maison Rosas. ¿Me dan más información?`;
  return buildWhatsAppLink(shop, msg);
}

// ─── Contrato del flujo ───

export type ProductListMode = 'catalog' | 'prices' | 'order';

export type AssistantScreen =
  | { id: 'menu' }
  | { id: 'products'; mode: ProductListMode }
  | { id: 'product'; mode: ProductListMode; productId: string }
  | { id: 'hours' };

export type AssistantAction =
  | { type: 'menu' }
  | { type: 'products' }
  | { type: 'prices' }
  | { type: 'order' }
  | { type: 'hours' }
  | { type: 'whatsapp' }
  | { type: 'product'; productId: string; mode: ProductListMode }
  | { type: 'orderProduct'; productId: string }
  | { type: 'whatsappProduct'; productId: string }
  | { type: 'back' }
  | { type: 'reload' }; // re-renderiza la pantalla actual con datos frescos

export interface AssistantOption {
  label: string;
  action: AssistantAction;
}

export interface AssistantMessage {
  id: string;
  role: 'bot' | 'user';
  text?: string;
  options?: AssistantOption[];
  kind?: 'normal' | 'loading' | 'error' | 'empty';
}

export interface AssistantReply {
  /** Mensajes del bot que se agregan al hilo (con sus opciones). */
  messages: AssistantMessage[];
  nextScreen: AssistantScreen;
  /** Efecto lateral opcional que la UI debe ejecutar (abrir pedido / WhatsApp). */
  effect?: { type: 'customize'; product: Product } | { type: 'whatsapp'; url: string };
  /** true si la pantalla necesita cargar productos antes de responder. */
  requiresProducts?: boolean;
}

export interface AssistantContext {
  config: AppConfig | null;
  products: Product[];
  /** true cuando ya se intentó cargar productos (aunque el resultado sea vacío/error) */
  productsLoaded?: boolean;
  productLoading?: boolean;
  productError?: boolean;
}

// IDs únicos (timestamp + contador + aleatorio): seguros incluso si el módulo
// se recarga por HMR mientras el estado de la conversación sigue en memoria.
let uidCounter = 0;
export function assistantUid(prefix = 'm'): string {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function bot(text?: string, extra: Partial<AssistantMessage> = {}): AssistantMessage {
  return { id: assistantUid('m'), role: 'bot', kind: 'normal', text, ...extra };
}
function user(text: string): AssistantMessage {
  return { id: assistantUid('u'), role: 'user', text };
}

// ─── Menú principal ───

function buildMenuOptions(): AssistantOption[] {
  return [
    { label: '🍰 Ver productos', action: { type: 'products' } },
    { label: '💰 Consultar precios', action: { type: 'prices' } },
    { label: '🛒 Realizar un pedido', action: { type: 'order' } },
    { label: '🕒 Consultar horarios', action: { type: 'hours' } },
    { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
  ];
}

function buildMenuMessages(config: AppConfig | null): AssistantMessage[] {
  const welcome = config?.assistantWelcomeMessage || DEFAULT_ASSISTANT_MESSAGES.welcome;
  const open = isBusinessOpen(config);
  const statusText = open
    ? `${DEFAULT_ASSISTANT_MESSAGES.open} ${getTodayScheduleText(config)}`
    : `${config?.assistantClosedMessage || DEFAULT_ASSISTANT_MESSAGES.closed} ${getTodayScheduleText(config)}`;

  return [
    bot(welcome),
    bot(`${statusText}\n💬 También puedes escribirme directamente lo que necesitas.`, { options: buildMenuOptions() }),
  ];
}

// ─── Pantallas de productos ───

function buildProductListMessages(
  mode: ProductListMode,
  ctx: AssistantContext,
): AssistantMessage[] {
  if (ctx.productLoading || ctx.productsLoaded === false) {
    return [bot('Un momento, estoy revisando nuestros kekes disponibles… 🍰', { kind: 'loading' })];
  }

  if (ctx.productError) {
    return [
      bot('No pudimos cargar los productos en este momento. Puedes intentarlo nuevamente o escribirnos por WhatsApp. 🙏', {
        kind: 'error',
        options: [
          { label: '🔁 Reintentar', action: { type: 'reload' } },
          { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
          { label: '🏠 Menú principal', action: { type: 'menu' } },
        ],
      }),
    ];
  }

  const active = ctx.products.filter((p) => p.active !== false);
  if (active.length === 0) {
    return [
      bot('Aún no tenemos productos publicados 😕 Vuelve pronto o escríbenos por WhatsApp.', {
        kind: 'empty',
        options: [
          { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
          { label: '🏠 Menú principal', action: { type: 'menu' } },
        ],
      }),
    ];
  }

  const intro =
    mode === 'prices'
      ? 'Estos son los precios de nuestros kekes 💰:'
      : mode === 'order'
        ? '¡Claro! Elige el keke que quieras y lo personalizamos contigo 🎂'
        : 'Con gusto, estos son nuestros kekes disponibles 🍰';

  const visible = active.slice(0, MAX_PRODUCTS_PER_LIST);
  const remaining = active.length - visible.length;

  return [
    bot(intro, {
      options: visible.map((p) => ({
        label: mode === 'prices' ? `${p.name} · ${formatPrice(p.basePrice)}` : p.name,
        action: { type: 'product', productId: p.id, mode },
      })),
    }),
    ...(remaining > 0
      ? [bot(`…y ${remaining} más en nuestro catálogo. ¿Te gustaría verlos? 😉`, {
          options: [
            { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
            { label: '🏠 Menú principal', action: { type: 'menu' } },
          ],
        })]
      : []),
  ];
}

function buildProductDetailMessages(
  productId: string,
  mode: ProductListMode,
  ctx: AssistantContext,
): AssistantMessage[] {
  const product = ctx.products.find((p) => p.id === productId);

  if (!product) {
    return [
      bot('Ups, no encontramos ese producto 😕 Es posible que ya no esté disponible.', {
        kind: 'error',
        options: [
          { label: '🍰 Ver productos', action: { type: 'products' } },
          { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
          { label: '🏠 Menú principal', action: { type: 'menu' } },
        ],
      }),
    ];
  }

  const availability = product.stock === false
    ? 'Agotado por ahora 😕'
    : product.active === false
      ? 'No disponible temporalmente'
      : 'Disponible ✓';

  const lines = [
    `🍰 *${product.name}*`,
    `💰 ${formatPrice(product.basePrice)}`,
    product.description ? `📝 ${product.description}` : null,
    `📦 ${availability}`,
    product.preparationTime ? `⏱ Preparación: ${product.preparationTime}` : null,
  ].filter(Boolean) as string[];

  const text = lines.join('\n');

  const whatsappAction = { type: 'whatsappProduct' as const, productId: product.id };

  if (mode === 'prices') {
    return [
      bot(text, {
        options: [
          { label: '💬 Pedir por WhatsApp', action: whatsappAction },
          { label: '← Volver a precios', action: { type: 'back' } },
          { label: '🏠 Menú principal', action: { type: 'menu' } },
        ],
      }),
    ];
  }

  return [
    bot(text, {
      options: [
        { label: '🛒 Personalizar y pedir', action: { type: 'orderProduct', productId: product.id } },
        { label: '💬 Pedir por WhatsApp', action: whatsappAction },
        { label: '← Volver a productos', action: { type: 'back' } },
        { label: '🏠 Menú principal', action: { type: 'menu' } },
      ],
    }),
  ];
}

// ─── Horarios ───

function buildHoursMessages(config: AppConfig | null): AssistantMessage[] {
  const open = isBusinessOpen(config);
  const status = open
    ? DEFAULT_ASSISTANT_MESSAGES.open
    : config?.assistantClosedMessage || DEFAULT_ASSISTANT_MESSAGES.closed;

  return [
    bot(`🕒 ${config?.openingHours || 'Lunes a Sábado: 9:00 AM - 7:00 PM | Domingos: 10:00 AM - 2:00 PM'}`),
    bot(`${status} ${getTodayScheduleText(config)}`, {
      options: [
        { label: '🛒 Realizar un pedido', action: { type: 'order' } },
        { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
        { label: '🏠 Menú principal', action: { type: 'menu' } },
      ],
    }),
  ];
}

// ═══════════════════════════════════════════════════════════════════════
// TEXTO LIBRE — motor de intenciones (respuestas automáticas "tipo agente")
// ═══════════════════════════════════════════════════════════════════════
// Reglas locales de coincidencia de intenciones en español (sin IA externa).
// Jerarquía: nombre propio > producto específico > info (pago/envío/dirección)
// > precios/productos/horarios/whatsapp/pedido > small talk > fallback.

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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Vocabulario de intenciones (normalizado: sin tildes)
const GREETING_WORDS = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'buen dia', 'que tal', 'hey', 'holi', 'buenas', 'saludos'];
const THANKS_WORDS = ['gracias', 'te agradezco', 'agradecido', 'muchas gracias', 'mil gracias', 'graciass'];
const GOODBYE_WORDS = ['adios', 'chao', 'hasta luego', 'nos vemos', 'hasta pronto', 'bye', 'me voy', 'cuidate', 'cuidese'];
const WHO_WORDS = ['quien eres', 'que eres', 'eres un bot', 'eres un robot', 'eres robot', 'eres bot', 'eres real', 'eres humano', 'eres una maquina', 'eres un programa', 'como te llamas', 'cual es tu nombre', 'tu nombre', 'quien sos'];
const HELP_WORDS = ['que puedes hacer', 'que podes hacer', 'en que me ayudas', 'como me ayudas', 'que haces', 'ayuda', 'ayudame', 'como funciona', 'que ofrecen', 'que venden', 'que tienen', 'que hacen', 'servicios', 'opciones'];
const HERE_WORDS = ['estas ahi', 'estas aqui', 'me escuchas', 'hay alguien', 'alguien ahi', 'me oyes'];
const ACK_WORDS = ['ok', 'perfecto', 'entendido', 'de acuerdo', 'dale', 'listo', 'genial', 'excelente', 'muy bien', 'esta bien', 'todo bien', 'suena bien'];
const PRODUCT_WORDS = ['producto', 'productos', 'catalogo', 'keke', 'kekes', 'torta', 'tortas', 'pastel', 'pasteles', 'menu', 'carta', 'variedad', 'lista', 'postre', 'postres'];
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
const PRICE_WORDS = ['precio', 'precios', 'cuanto cuesta', 'cuanto vale', 'cuanto sale', 'cuanto esta', 'costo', 'costos', 'tarifa', 'barato', 'soles', 'cuesta', 'vale'];
const ORDER_WORDS = ['pedir', 'pedido', 'pedidos', 'comprar', 'compra', 'orden', 'encargo', 'encargar', 'reservar', 'quiero', 'necesito', 'ordenar', 'hacer un pedido'];
const HOURS_WORDS = ['horario', 'horarios', 'hora', 'abierto', 'cerrado', 'atienden', 'abren', 'cierran', 'a que hora', 'que horas', 'cuando atienden', 'cuando abren'];
const WHATSAPP_WORDS = ['whatsapp', 'wsp', 'wa.me', 'numero', 'telefono', 'contactar', 'contacto', 'hablar', 'escribirte', 'chat', 'mensaje', 'atencion personal'];
const ADDRESS_WORDS = ['direccion', 'ubicacion', 'donde estan', 'donde queda', 'donde se ubican', 'estan ubicados'];
const DELIVERY_WORDS = ['delivery', 'envio', 'envios', 'envian', 'entrega', 'reparto', 'recojo', 'a domicilio', 'domicilio'];
const PAYMENT_WORDS = ['pago', 'pagar', 'yape', 'plin', 'transferencia', 'efectivo', 'deposito', 'medios de pago', 'metodo de pago', 'metodos de pago'];

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

/** Deduce el modo (cómo presentar el producto) según el texto. */
function inferMode(norm: string): ProductListMode {
  if (hasAny(norm, PRICE_WORDS)) return 'prices';
  if (hasAny(norm, ORDER_WORDS)) return 'order';
  return 'catalog';
}

function menuOptions(): AssistantOption[] {
  return buildMenuOptions();
}

function infoReply(text: string): AssistantReply {
  return {
    messages: [bot(text, {
      options: [
        { label: '🛒 Realizar un pedido', action: { type: 'order' } },
        { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
        { label: '🏠 Menú principal', action: { type: 'menu' } },
      ],
    })],
    nextScreen: { id: 'menu' },
  };
}

function greetingReply(norm: string): AssistantReply {
  let text: string;
  if (norm.includes('buenos dias') || norm.includes('buen dia')) {
    text = '¡Buenos días, usuario! 👋 ¿En qué te ayudo?';
  } else if (norm.includes('buenas tardes')) {
    text = '¡Buenas tardes, usuario! 👋 ¿En qué te ayudo?';
  } else if (norm.includes('buenas noches')) {
    text = '¡Buenas noches, usuario! 🌙 ¿En qué te ayudo?';
  } else {
    text = pick([
      '¡Hola, usuario! 😊 ¿En qué te ayudo el día de hoy?',
      '¡Hola de nuevo, usuario! 👋 ¿En qué te ayudo?',
      '¡Hola! 👋 ¿Qué tal, usuario? Estoy aquí para lo que necesites.',
    ]);
  }
  return { messages: [bot(text, { options: menuOptions() })], nextScreen: { id: 'menu' } };
}

function thanksReply(): AssistantReply {
  return {
    messages: [bot(pick([
      '¡Con gusto! 😊 ¿Necesitas algo más?',
      '¡Para eso estamos! 🍰 ¿En qué más te ayudo?',
    ]), { options: menuOptions() })],
    nextScreen: { id: 'menu' },
  };
}

function goodbyeReply(): AssistantReply {
  return {
    messages: [bot(pick([
      '¡Hasta luego! 🍰 Cuídate mucho. Aquí estaré cuando me necesites.',
      '¡Chao! 👋 Gracias por visitar Maison Rosas. ¡Hasta pronto!',
    ]), { options: menuOptions() })],
    nextScreen: { id: 'menu' },
  };
}

function whoReply(): AssistantReply {
  return {
    messages: [bot(
      'Soy el asistente virtual de Maison Rosas 🍰 Carol y Edwin me prepararon para ayudarte con nuestros kekes, precios, pedidos y horarios. Si necesitas atención personalizada, por WhatsApp siempre hay alguien del equipo 😊',
      { options: menuOptions() },
    )],
    nextScreen: { id: 'menu' },
  };
}

function helpReply(): AssistantReply {
  return {
    messages: [bot(
      '¡Claro! Puedo ayudarte con:\n🍰 Ver productos\n💰 Consultar precios\n🛒 Realizar un pedido\n🕒 Consultar horarios\n💬 Hablar por WhatsApp\n\n¿Por dónde empezamos?',
      { options: menuOptions() },
    )],
    nextScreen: { id: 'menu' },
  };
}

function fallbackReply(raw: string): AssistantReply {
  const snippet = raw.trim().replace(/\s+/g, ' ').slice(0, 40);
  const variants = [
    'No estoy seguro de eso 🤔 Soy un asistente enfocado en Maison Rosas: puedo mostrarte nuestros kekes, precios, horarios o ayudarte con un pedido.',
    'Buena pregunta 😅 No tengo esa información por ahora, pero con gusto te ayudo con productos, precios u horarios.',
    `No encontré nada sobre "${snippet}" 🙈 Prueba con "kekes", "precios" o "horarios", o escríbenos por WhatsApp.`,
    'Esa pregunta me queda grande por ahora 😅 ¡Pero puedo ayudarte a elegir un keke, ver precios u horarios!',
  ];
  return {
    messages: [bot(pick(variants), {
      options: [
        { label: '🍰 Ver productos', action: { type: 'products' } },
        { label: '🛒 Realizar un pedido', action: { type: 'order' } },
        { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
        { label: '🏠 Menú principal', action: { type: 'menu' } },
      ],
    })],
    nextScreen: { id: 'menu' },
  };
}

/** Lista de productos filtrada (ocasión / recomendación) con opciones. */
function filteredListReply(list: Product[], mode: ProductListMode, intro: string): AssistantReply {
  return {
    messages: [bot(intro, {
      options: list.slice(0, MAX_PRODUCTS_PER_LIST).map((p) => ({
        label: mode === 'prices' ? `${p.name} · ${formatPrice(p.basePrice)}` : p.name,
        action: { type: 'product', productId: p.id, mode },
      })),
    })],
    nextScreen: { id: 'products', mode },
    requiresProducts: true,
  };
}

/**
 * Responde a un mensaje de TEXTO LIBRE del usuario (segunda puerta de entrada,
 * mismo contrato que assistantRespond). Detecta intenciones por palabras clave
 * en español; lo que no entiende cae en respuestas amables con salida a
 * WhatsApp/menú (nunca se queda en silencio).
 */
export function assistantReplyText(raw: string, ctx: AssistantContext): AssistantReply {
  const norm = normalizeText(raw);
  if (!norm) return fallbackReply(raw);

  const active = ctx.products.filter((p) => p.active !== false);
  const mode = inferMode(norm);

  // ── 1) Presentación / saludo con nombre propio (sin recopilar el nombre) ──
  if (/(?:me llamo|mi nombre es|soy)\s+[a-z]{2,}/.test(norm)) {
    return {
      messages: [bot('¡Un gusto, usuario! 😊 Soy el asistente de Maison Rosas. ¿En qué te ayudo?', { options: menuOptions() })],
      nextScreen: { id: 'menu' },
    };
  }

  // ── 2) Producto específico (nombre, tag, sabor o categoría) ──
  const hit = matchProductByText(norm, active);
  if (hit.type === 'product') {
    return assistantRespond({ id: 'menu' }, { type: 'product', productId: hit.product.id, mode }, ctx);
  }
  if (hit.type === 'list') {
    return filteredListReply(hit.products, mode, hit.intro);
  }

  // ── 3) Recomendaciones y ocasiones especiales ──
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
      : pick([
          '¡Claro! Te recomiendo empezar por nuestro keke más pedido 😍',
          '¡Con gusto! Estos son los favoritos de nuestros clientes ⭐',
        ]);
    return filteredListReply(list, mode, intro);
  }

  // ── 4) Intenciones informativas (antes que precios/pedido: más específicas) ──
  if (hasAny(norm, PAYMENT_WORDS)) {
    return infoReply('💳 Trabajamos con Yape, Plin, transferencia y efectivo. El pago se coordina junto con tu pedido.');
  }
  if (hasAny(norm, DELIVERY_WORDS)) {
    return infoReply('🛵 ¡Claro! Ofrecemos recojo y delivery en Sullana y alrededores. Coordina los detalles al hacer tu pedido o por WhatsApp.');
  }
  if (hasAny(norm, ADDRESS_WORDS)) {
    return infoReply(`📍 Nuestra dirección: ${ctx.config?.address || 'Av. Ricardo Palma 213, Sánchez Cerro, Sullana, Piura'}`);
  }
  if (hasAny(norm, LEADTIME_WORDS)) {
    return infoReply('⏱ Nuestros kekes se preparan con anticipación (suele ser de 48 a 72 horas según el modelo). Para fechas especiales te recomiendo pedir con varios días de adelanto 😉');
  }
  if (hasAny(norm, CUSTOM_WORDS)) {
    return infoReply('🎨 ¡Claro! Todos nuestros kekes se personalizan: tamaño, sabor, relleno y decoración. Elige tu keke y en el personalizador armamos todo contigo.');
  }

  // ── 5) Intenciones del catálogo / negocio ──
  if (hasAny(norm, PRICE_WORDS)) return assistantRespond({ id: 'menu' }, { type: 'prices' }, ctx);
  if (hasAny(norm, PRODUCT_WORDS)) return assistantRespond({ id: 'menu' }, { type: 'products' }, ctx);
  if (hasAny(norm, HOURS_WORDS)) return assistantRespond({ id: 'menu' }, { type: 'hours' }, ctx);
  if (hasAny(norm, WHATSAPP_WORDS)) return assistantRespond({ id: 'menu' }, { type: 'whatsapp' }, ctx);
  if (hasAny(norm, ORDER_WORDS)) return assistantRespond({ id: 'menu' }, { type: 'order' }, ctx);

  // ── 6) Small talk ──
  if (hasAny(norm, GREETING_WORDS)) return greetingReply(norm);
  if (hasAny(norm, THANKS_WORDS)) return thanksReply();
  if (hasAny(norm, GOODBYE_WORDS)) return goodbyeReply();
  if (hasAny(norm, WHO_WORDS)) return whoReply();
  if (hasAny(norm, HELP_WORDS)) return helpReply();
  if (hasAny(norm, HERE_WORDS)) return greetingReply(norm);
  if (hasAny(norm, ACK_WORDS)) {
    return {
      messages: [bot(pick(['¡Perfecto! 😊 ¿En qué más te ayudo?', '¡Genial! 🍰 ¿Algo más en lo que pueda ayudarte?']), { options: menuOptions() })],
      nextScreen: { id: 'menu' },
    };
  }

  // ── 7) Fallback amable: nunca dejar la conversación muerta ──
  return fallbackReply(raw);
}

// ─── Motor principal ───

/**
 * Responde a una acción del usuario dentro de una pantalla.
 * Es la ÚNICA puerta de entrada a la lógica (punto de extensión futuro:
 * n8n / WhatsApp / IA pueden reemplazarla respetando este contrato).
 */
export function assistantRespond(
  current: AssistantScreen,
  action: AssistantAction,
  ctx: AssistantContext,
): AssistantReply {
  const toMenu = (): AssistantReply => ({
    messages: buildMenuMessages(ctx.config),
    nextScreen: { id: 'menu' },
  });

  const toProducts = (mode: ProductListMode): AssistantReply => ({
    messages: buildProductListMessages(mode, ctx),
    nextScreen: { id: 'products', mode },
    requiresProducts: true,
  });

  const toProduct = (mode: ProductListMode, productId: string): AssistantReply => ({
    messages: buildProductDetailMessages(productId, mode, ctx),
    nextScreen: { id: 'product', mode, productId },
  });

  const toHours = (): AssistantReply => ({
    messages: buildHoursMessages(ctx.config),
    nextScreen: { id: 'hours' },
  });

  switch (action.type) {
    case 'menu':
      return toMenu();

    case 'products':
      return toProducts('catalog');

    case 'prices':
      return toProducts('prices');

    case 'order':
      return toProducts('order');

    case 'hours':
      return toHours();

    case 'product':
      return toProduct(action.mode, action.productId);

    case 'orderProduct': {
      const product = ctx.products.find((p) => p.id === action.productId);
      if (!product) return toProduct('order', action.productId);
      return {
        messages: [bot(`¡Perfecto! Te llevo al personalizador para armar tu ${product.name} 🎂`)],
        nextScreen: { id: 'product', mode: 'order', productId: product.id },
        effect: { type: 'customize', product },
      };
    }

    case 'whatsapp': {
      const number = ctx.config?.whatsappNumber || DEFAULT_WHATSAPP_NUMBER;
      const message = ctx.config?.assistantWhatsappMessage || DEFAULT_ASSISTANT_MESSAGES.whatsapp;
      return {
        messages: [bot('Te abrimos WhatsApp en otra pestaña 💬 ¡Ahí nos vemos!')],
        nextScreen: current,
        effect: { type: 'whatsapp', url: buildWhatsAppLink(number, message) },
      };
    }

    case 'whatsappProduct': {
      const product = ctx.products.find((p) => p.id === action.productId);
      const url = product
        ? buildProductWhatsAppMessage(product, ctx.config)
        : buildWhatsAppLink(
            ctx.config?.whatsappNumber || DEFAULT_WHATSAPP_NUMBER,
            ctx.config?.assistantWhatsappMessage || DEFAULT_ASSISTANT_MESSAGES.whatsapp,
          );
      return {
        messages: [bot('Te abrimos WhatsApp en otra pestaña con la información de este keke 💬')],
        nextScreen: current,
        effect: { type: 'whatsapp', url },
      };
    }

    case 'back': {
      if (current.id === 'product') return toProducts(current.mode);
      return toMenu();
    }

    case 'reload': {
      // Re-renderiza la pantalla actual con datos actualizados (tras cargar productos)
      if (current.id === 'products') return toProducts(current.mode);
      if (current.id === 'product') return toProduct(current.mode, current.productId);
      return { messages: [], nextScreen: current };
    }

    default:
      return toMenu();
  }
}

/** Mensaje del usuario (eco) para una acción, si aplica. */
export function actionLabel(action: AssistantAction): string | null {
  switch (action.type) {
    case 'products': return '🍰 Ver productos';
    case 'prices': return '💰 Consultar precios';
    case 'order': return '🛒 Realizar un pedido';
    case 'hours': return '🕒 Consultar horarios';
    case 'whatsapp': return '💬 Hablar por WhatsApp';
    case 'menu': return '🏠 Menú principal';
    case 'back': return '← Volver';
    case 'product': return null; // el eco lo pone el panel (label de la opción)
    case 'orderProduct': return null;
    case 'reload': return null;
    default: return null;
  }
}