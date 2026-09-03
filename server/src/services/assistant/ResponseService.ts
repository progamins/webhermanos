/**
 * ResponseService — capa de respuestas estructuradas del asistente.
 *
 * Separación: la UI no contiene mensajes; este servicio construye
 * `AssistantReply` (mensajes + opciones + efectos) a partir de la intención
 * detectada y el contexto de negocio (productos y config reales).
 *
 * Es una clase PURA (sin acceso a BD): recibe `AssistantServiceContext`.
 * Eso permite probarla sin base de datos y reutilizarla igual desde la web,
 * un webhook de n8n o WhatsApp en el futuro.
 *
 * Futuro: una respuesta fija puede reemplazarse por una generada por IA sin
 * cambiar el contrato (la UI solo consume AssistantReply).
 */

import type { AppConfig, Product } from '../../lib/types.js';
import {
  MAX_PRODUCTS_PER_LIST,
  inferMode,
  normalizeText,
  type IntentResult,
  type ProductListMode,
} from './intents.js';
import type {
  AssistantAction,
  AssistantMessage,
  AssistantOption,
  AssistantReply,
  AssistantScreen,
  AssistantServiceContext,
} from './types.js';

// Valores por defecto (los mismos que ConfigService.DEFAULT_CONFIG); solo se
// usan si la config no llega — la información comercial real vive en app_config.
export const DEFAULT_ASSISTANT_MESSAGES = {
  welcome: '¡Hola! 👋 Bienvenido(a) a Maison Rosas. ¿En qué podemos ayudarte?',
  closed: 'Actualmente estamos fuera de horario 😴 Puedes dejar tu pedido por WhatsApp y te atenderemos apenas estemos disponibles.',
  whatsapp: 'Hola Carol y Edwin 🍰 Vengo de la web de Maison Rosas y me gustaría hacer una consulta.',
  open: 'Estamos atendiendo actualmente 😊',
};
export const DEFAULT_WHATSAPP_NUMBER = '51902568187';
export const DEFAULT_OPENING_HOURS = 'Lunes a Sábado: 9:00 AM - 7:00 PM | Domingos: 10:00 AM - 2:00 PM';

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ids únicos por respuesta (sin depender de estado entre peticiones)
let uidCounter = 0;
function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatPrice(value: number): string {
  return `S/. ${Math.round(Number(value) || 0)}`;
}

export function buildWhatsAppLink(number: string, message?: string): string {
  const clean = (number || '').replace(/[^\d]/g, '') || DEFAULT_WHATSAPP_NUMBER;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${clean}${text}`;
}

export class ResponseService {
  private bot(text?: string, extra: Partial<AssistantMessage> = {}): AssistantMessage {
    return { id: uid('m'), role: 'bot', kind: 'normal', text, ...extra };
  }

  // ─── Estado del negocio ───

  private isBusinessOpen(config: AppConfig | null, now: Date = new Date()): boolean {
    const hours = config?.businessHours;
    const list = hours && hours.length > 0 ? hours : null;
    const today = (list || []).find((h) => h.day === now.getDay());
    if (!today || !today.open || !today.close) return false;
    const [openH, openM] = today.open.split(':').map(Number);
    const [closeH, closeM] = today.close.split(':').map(Number);
    const minutes = now.getHours() * 60 + now.getMinutes();
    return minutes >= openH * 60 + openM && minutes < closeH * 60 + closeM;
  }

  private todaySchedule(config: AppConfig | null, now: Date = new Date()): string {
    const list = config?.businessHours && config.businessHours.length > 0 ? config.businessHours : [];
    const today = list.find((h) => h.day === now.getDay());
    const label = DAY_LABELS[now.getDay()] || '';
    if (!today || !today.open || !today.close) return `Hoy ${label}: cerrado`;
    return `Hoy ${label}: ${today.open} – ${today.close}`;
  }

  // ─── Menú principal ───

  private menuOptions(): AssistantOption[] {
    return [
      { label: '🍰 Ver productos', action: { type: 'products' } },
      { label: '💰 Consultar precios', action: { type: 'prices' } },
      { label: '🛒 Realizar un pedido', action: { type: 'order' } },
      { label: '🕒 Consultar horarios', action: { type: 'hours' } },
      { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
    ];
  }

  menuMessages(config: AppConfig | null): AssistantMessage[] {
    const welcome = config?.assistantWelcomeMessage || DEFAULT_ASSISTANT_MESSAGES.welcome;
    const open = this.isBusinessOpen(config);
    const statusText = open
      ? `${DEFAULT_ASSISTANT_MESSAGES.open} ${this.todaySchedule(config)}`
      : `${config?.assistantClosedMessage || DEFAULT_ASSISTANT_MESSAGES.closed} ${this.todaySchedule(config)}`;
    return [
      this.bot(welcome),
      this.bot(`${statusText}\n💬 También puedes escribirme directamente lo que necesitas.`, { options: this.menuOptions() }),
    ];
  }

  menuReply(config: AppConfig | null): AssistantReply {
    return { messages: this.menuMessages(config), nextScreen: { id: 'menu' } };
  }

  /** Respuesta cuando el asistente está desactivado (config.assistantEnabled = false). */
  disabledReply(): AssistantReply {
    return {
      messages: [this.bot(
        'El asistente está desactivado por el momento 🙏 Si necesitas ayuda, escríbenos por WhatsApp y te atenderemos personalmente.',
        { options: [{ label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } }] },
      )],
      nextScreen: { id: 'menu' },
    };
  }

  // ─── Pantallas de productos ───

  private productListMessages(mode: ProductListMode, ctx: AssistantServiceContext): AssistantMessage[] {
    const active = ctx.products.filter((p) => p.active !== false);
    if (active.length === 0) {
      return [this.bot('Aún no tenemos productos publicados 😕 Vuelve pronto o escríbenos por WhatsApp.', {
        kind: 'empty',
        options: [
          { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
          { label: '🏠 Menú principal', action: { type: 'menu' } },
        ],
      })];
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
      this.bot(intro, {
        options: visible.map((p) => ({
          label: mode === 'prices' ? `${p.name} · ${formatPrice(p.basePrice)}` : p.name,
          action: { type: 'product', productId: p.id, mode },
        })),
      }),
      ...(remaining > 0
        ? [this.bot(`…y ${remaining} más en nuestro catálogo. ¿Te gustaría verlos? 😉`, {
            options: [
              { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
              { label: '🏠 Menú principal', action: { type: 'menu' } },
            ],
          })]
        : []),
    ];
  }

  productsReply(mode: ProductListMode, ctx: AssistantServiceContext): AssistantReply {
    return { messages: this.productListMessages(mode, ctx), nextScreen: { id: 'products', mode } };
  }

  filteredListReply(list: Product[], mode: ProductListMode, intro: string): AssistantReply {
    return {
      messages: [this.bot(intro, {
        options: list.slice(0, MAX_PRODUCTS_PER_LIST).map((p) => ({
          label: mode === 'prices' ? `${p.name} · ${formatPrice(p.basePrice)}` : p.name,
          action: { type: 'product', productId: p.id, mode },
        })),
      })],
      nextScreen: { id: 'products', mode },
    };
  }

  productDetailReply(mode: ProductListMode, productId: string, ctx: AssistantServiceContext): AssistantReply {
    const product = ctx.products.find((p) => p.id === productId);
    if (!product) {
      return {
        messages: [this.bot('Ups, no encontramos ese producto 😕 Es posible que ya no esté disponible.', {
          kind: 'error',
          options: [
            { label: '🍰 Ver productos', action: { type: 'products' } },
            { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
            { label: '🏠 Menú principal', action: { type: 'menu' } },
          ],
        })],
        nextScreen: { id: 'products', mode },
      };
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

    const whatsappAction = { type: 'whatsappProduct' as const, productId: product.id };

    const options: AssistantOption[] = mode === 'prices'
      ? [
          { label: '💬 Pedir por WhatsApp', action: whatsappAction },
          { label: '← Volver a precios', action: { type: 'back' } },
          { label: '🏠 Menú principal', action: { type: 'menu' } },
        ]
      : [
          { label: '🛒 Personalizar y pedir', action: { type: 'orderProduct', productId: product.id } },
          { label: '💬 Pedir por WhatsApp', action: whatsappAction },
          { label: '← Volver a productos', action: { type: 'back' } },
          { label: '🏠 Menú principal', action: { type: 'menu' } },
        ];

    return { messages: [this.bot(lines.join('\n'), { options })], nextScreen: { id: 'product', mode, productId } };
  }

  // ─── Horarios ───

  hoursReply(config: AppConfig | null): AssistantReply {
    const open = this.isBusinessOpen(config);
    const status = open
      ? DEFAULT_ASSISTANT_MESSAGES.open
      : config?.assistantClosedMessage || DEFAULT_ASSISTANT_MESSAGES.closed;
    return {
      messages: [
        this.bot(`🕒 ${config?.openingHours || DEFAULT_OPENING_HOURS}`),
        this.bot(`${status} ${this.todaySchedule(config)}`, {
          options: [
            { label: '🛒 Realizar un pedido', action: { type: 'order' } },
            { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
            { label: '🏠 Menú principal', action: { type: 'menu' } },
          ],
        }),
      ],
      nextScreen: { id: 'hours' },
    };
  }

  // ─── WhatsApp ───

  whatsappReply(config: AppConfig | null, current: AssistantScreen): AssistantReply {
    const number = config?.whatsappNumber || DEFAULT_WHATSAPP_NUMBER;
    const message = config?.assistantWhatsappMessage || DEFAULT_ASSISTANT_MESSAGES.whatsapp;
    return {
      messages: [this.bot('Te abrimos WhatsApp en otra pestaña 💬 ¡Ahí nos vemos!')],
      nextScreen: current,
      effect: { type: 'whatsapp', url: buildWhatsAppLink(number, message) },
    };
  }

  whatsappProductReply(productId: string, config: AppConfig | null, current: AssistantScreen, ctx: AssistantServiceContext): AssistantReply {
    const product = ctx.products.find((p) => p.id === productId);
    const number = config?.whatsappNumber || DEFAULT_WHATSAPP_NUMBER;
    const url = product
      ? buildWhatsAppLink(number, `Hola 👋 Me interesa el *${product.name}* de ${formatPrice(product.basePrice)} que vi en la web de Maison Rosas. ¿Me dan más información?`)
      : buildWhatsAppLink(number, config?.assistantWhatsappMessage || DEFAULT_ASSISTANT_MESSAGES.whatsapp);
    return {
      messages: [this.bot('Te abrimos WhatsApp en otra pestaña con la información de este keke 💬')],
      nextScreen: current,
      effect: { type: 'whatsapp', url },
    };
  }

  // ─── Estado de pedido / información ───

  orderStatusReply(config: AppConfig | null): AssistantReply {
    const base = config ? '' : '';
    const url = (typeof process !== 'undefined' && (process.env.APP_URL || '')) ? `${process.env.APP_URL}/tracking` : null;
    return {
      messages: [this.bot(
        `📦 Puedes consultar el estado de tu pedido con tu código de seguimiento${url ? ` aquí: ${url}` : ' desde la página de seguimiento de la web'}.\nSi no lo tienes a la mano, escríbenos y te ayudamos a ubicarlo.`,
        {
          options: [
            { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
            { label: '🏠 Menú principal', action: { type: 'menu' } },
          ],
        },
      )],
      nextScreen: { id: 'menu' },
    };
  }

  private infoReply(text: string): AssistantReply {
    return {
      messages: [this.bot(text, {
        options: [
          { label: '🛒 Realizar un pedido', action: { type: 'order' } },
          { label: '💬 Hablar por WhatsApp', action: { type: 'whatsapp' } },
          { label: '🏠 Menú principal', action: { type: 'menu' } },
        ],
      })],
      nextScreen: { id: 'menu' },
    };
  }

  // ─── Small talk ───

  private greetingReply(norm: string): AssistantReply {
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
    return { messages: [this.bot(text, { options: this.menuOptions() })], nextScreen: { id: 'menu' } };
  }

  private presentationReply(): AssistantReply {
    return {
      messages: [this.bot('¡Un gusto, usuario! 😊 Soy el asistente de Maison Rosas. ¿En qué te ayudo?', { options: this.menuOptions() })],
      nextScreen: { id: 'menu' },
    };
  }

  private thanksReply(): AssistantReply {
    return {
      messages: [this.bot(pick([
        '¡Con gusto! 😊 ¿Necesitas algo más?',
        '¡Para eso estamos! 🍰 ¿En qué más te ayudo?',
      ]), { options: this.menuOptions() })],
      nextScreen: { id: 'menu' },
    };
  }

  private goodbyeReply(): AssistantReply {
    return {
      messages: [this.bot(pick([
        '¡Hasta luego! 🍰 Cuídate mucho. Aquí estaré cuando me necesites.',
        '¡Chao! 👋 Gracias por visitar Maison Rosas. ¡Hasta pronto!',
      ]), { options: this.menuOptions() })],
      nextScreen: { id: 'menu' },
    };
  }

  private whoReply(): AssistantReply {
    return {
      messages: [this.bot(
        'Soy el asistente virtual de Maison Rosas 🍰 Carol y Edwin me prepararon para ayudarte con nuestros kekes, precios, pedidos y horarios. Si necesitas atención personalizada, por WhatsApp siempre hay alguien del equipo 😊',
        { options: this.menuOptions() },
      )],
      nextScreen: { id: 'menu' },
    };
  }

  private helpReply(): AssistantReply {
    return {
      messages: [this.bot(
        '¡Claro! Puedo ayudarte con:\n🍰 Ver productos\n💰 Consultar precios\n🛒 Realizar un pedido\n🕒 Consultar horarios\n💬 Hablar por WhatsApp\n\n¿Por dónde empezamos?',
        { options: this.menuOptions() },
      )],
      nextScreen: { id: 'menu' },
    };
  }

  private ackReply(): AssistantReply {
    return {
      messages: [this.bot(pick(['¡Perfecto! 😊 ¿En qué más te ayudo?', '¡Genial! 🍰 ¿Algo más en lo que pueda ayudarte?']), { options: this.menuOptions() })],
      nextScreen: { id: 'menu' },
    };
  }

  private fallbackReply(raw: string): AssistantReply {
    const snippet = raw.trim().replace(/\s+/g, ' ').slice(0, 40);
    const variants = [
      'No estoy seguro de eso 🤔 Soy un asistente enfocado en Maison Rosas: puedo mostrarte nuestros kekes, precios, horarios o ayudarte con un pedido.',
      'Buena pregunta 😅 No tengo esa información por ahora, pero con gusto te ayudo con productos, precios u horarios.',
      `No encontré nada sobre "${snippet}" 🙈 Prueba con "kekes", "precios" o "horarios", o escríbenos por WhatsApp.`,
      'Esa pregunta me queda grande por ahora 😅 ¡Pero puedo ayudarte a elegir un keke, ver precios u horarios!',
    ];
    return {
      messages: [this.bot(pick(variants), {
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

  // ─── Entrada de texto libre → respuesta estructurada ───

  replyForIntent(raw: string, screen: AssistantScreen, ctx: AssistantServiceContext, classified: IntentResult): AssistantReply {
    const norm = normalizeText(raw);
    const mode = inferMode(norm);

    switch (classified.intent) {
      case 'PRESENTATION':
        return this.presentationReply();

      case 'PRODUCT_SEARCH':
        if (classified.product) return this.productDetailReply(mode, classified.product.id, ctx);
        if (classified.products && classified.products.length > 0) {
          return this.filteredListReply(classified.products, mode, classified.listIntro || 'Estas son nuestras opciones 😊');
        }
        return this.productsReply(mode === 'prices' ? 'prices' : 'catalog', ctx);

      case 'OCCASION':
      case 'RECOMMENDATION':
        if (classified.products && classified.products.length > 0) {
          return this.filteredListReply(classified.products, mode, classified.listIntro || 'Estas son nuestras recomendaciones 😊');
        }
        return this.productsReply('catalog', ctx);

      case 'PRODUCT_PRICE':
        return this.productsReply('prices', ctx);

      case 'BUSINESS_HOURS':
        return this.hoursReply(ctx.config);

      case 'ORDER_CREATE':
        return this.productsReply('order', ctx);

      case 'ORDER_STATUS':
        return this.orderStatusReply(ctx.config);

      case 'HUMAN_SUPPORT':
        return this.whatsappReply(ctx.config, screen);

      case 'PAYMENT_INFO':
        return this.infoReply('💳 Trabajamos con Yape, Plin, transferencia y efectivo. El pago se coordina junto con tu pedido.');

      case 'DELIVERY_INFO':
        return this.infoReply('🛵 ¡Claro! Ofrecemos recojo y delivery en Sullana y alrededores. Coordina los detalles al hacer tu pedido o por WhatsApp.');

      case 'ADDRESS_INFO':
        return this.infoReply(`📍 Nuestra dirección: ${ctx.config?.address || 'Av. Ricardo Palma 213, Sánchez Cerro, Sullana, Piura'}`);

      case 'LEAD_TIME_INFO':
        return this.infoReply('⏱ Nuestros kekes se preparan con anticipación (suele ser de 48 a 72 horas según el modelo). Para fechas especiales te recomiendo pedir con varios días de adelanto 😉');

      case 'CUSTOMIZATION_INFO':
        return this.infoReply('🎨 ¡Claro! Todos nuestros kekes se personalizan: tamaño, sabor, relleno y decoración. Elige tu keke y en el personalizador armamos todo contigo.');

      case 'GREETING':
        return this.greetingReply(norm);

      case 'THANKS':
        return this.thanksReply();

      case 'GOODBYE':
        return this.goodbyeReply();

      case 'WHO_ARE_YOU':
        return this.whoReply();

      case 'HELP':
        return this.helpReply();

      case 'ACKNOWLEDGMENT':
        return this.ackReply();

      case 'UNKNOWN':
      default:
        return this.fallbackReply(raw);
    }
  }

  // ─── Acciones de botón (flujo existente) ───

  respond(screen: AssistantScreen, action: AssistantAction, ctx: AssistantServiceContext): AssistantReply {
    const toMenu = (): AssistantReply => this.menuReply(ctx.config);
    const toProducts = (mode: ProductListMode): AssistantReply => this.productsReply(mode, ctx);
    const toProduct = (mode: ProductListMode, productId: string): AssistantReply => this.productDetailReply(mode, productId, ctx);

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
        return this.hoursReply(ctx.config);
      case 'product':
        return toProduct(action.mode, action.productId);
      case 'orderProduct': {
        const product = ctx.products.find((p) => p.id === action.productId);
        if (!product) return toProduct('order', action.productId);
        return {
          messages: [this.bot(`¡Perfecto! Te llevo al personalizador para armar tu ${product.name} 🎂`)],
          nextScreen: { id: 'product', mode: 'order', productId: product.id },
          effect: { type: 'customize', product },
        };
      }
      case 'whatsapp':
        return this.whatsappReply(ctx.config, screen);
      case 'whatsappProduct':
        return this.whatsappProductReply(action.productId, ctx.config, screen, ctx);
      case 'back':
        return screen.id === 'product' ? toProducts(screen.mode) : toMenu();
      case 'reload':
        if (screen.id === 'products') return toProducts(screen.mode);
        if (screen.id === 'product') return toProduct(screen.mode, screen.productId);
        return { messages: [], nextScreen: screen };
      default:
        return toMenu();
    }
  }
}

export const responseService = new ResponseService();