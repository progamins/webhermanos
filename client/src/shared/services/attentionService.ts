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

let messageSeq = 0;
function bot(text?: string, extra: Partial<AssistantMessage> = {}): AssistantMessage {
  return { id: `m-${++messageSeq}`, role: 'bot', kind: 'normal', text, ...extra };
}
function user(text: string): AssistantMessage {
  return { id: `m-${++messageSeq}`, role: 'user', text };
}

// ─── Menú principal ───

function buildMenuMessages(config: AppConfig | null): AssistantMessage[] {
  const welcome = config?.assistantWelcomeMessage || DEFAULT_ASSISTANT_MESSAGES.welcome;
  const open = isBusinessOpen(config);
  const statusText = open
    ? `${DEFAULT_ASSISTANT_MESSAGES.open} ${getTodayScheduleText(config)}`
    : `${config?.assistantClosedMessage || DEFAULT_ASSISTANT_MESSAGES.closed} ${getTodayScheduleText(config)}`;

  return [
    bot(welcome),
    bot(statusText, {
      options: [
        { label: '🍰 Ver productos', action: { type: 'products' } },
        { label: '💰 Consultar precios', action: { type: 'prices' } },
        { label: '🛒 Realizar un pedido', action: { type: 'order' } },
        { label: '🕒 Consultar horarios', action: { type: 'hours' } },
        { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
      ],
    }),
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