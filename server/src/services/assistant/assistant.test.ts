/**
 * Pruebas del núcleo del asistente (clasificador de intenciones + respuestas).
 *
 * Se ejecutan con node:test sobre un bundle esbuild (sin dependencias nuevas):
 *   npm run test --workspace=server
 *
 * No requieren MySQL: el ResponseService recibe un contexto con productos y
 * config estáticos (misma forma que la BD). Las pruebas de integración con
 * BD (pedidos/productos reales) quedan documentadas en docs/assistant.md.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyIntent, actionToIntent, type ProductListMode } from './intents.js';
import { responseService, buildWhatsAppLink, DEFAULT_WHATSAPP_NUMBER } from './ResponseService.js';
import { RuleBasedAIProvider } from './AIProvider.js';
import type { AppConfig, Product } from '../../lib/types.js';
import type { AssistantScreen, AssistantServiceContext } from './types.js';

// ─── Fixtures (forma idéntica a la que devuelve ProductService / ConfigService) ───

const products: Product[] = [
  {
    id: 'prod-1', name: 'Keke de Chocolate', description: 'Horneado fresco cada mañana · Cacao Peruano',
    basePrice: 35, category: 'Kekes Clásicos', preparationTime: '48 horas',
    active: true, stock: true, images: [], flavors: ['Chocolate', 'Vainilla Francesa'],
    decorations: ['Flores Naturales'], tags: ['chocolate'],
  },
  {
    id: 'prod-2', name: 'Keke de Lúcuma', description: 'Lúcuma de la región · Suave y cremoso',
    basePrice: 40, category: 'Kekes Peruanos', preparationTime: '72 horas',
    active: true, stock: true, images: [], flavors: ['Lúcuma'],
    decorations: ['Macarons'], tags: ['lúcuma'],
  },
  {
    id: 'prod-3', name: 'Keke de Maracuyá', description: 'Fresco y cítrico · Ideal para bodas',
    basePrice: 45, category: 'Kekes Frutales', preparationTime: '72 horas',
    active: true, stock: false, images: [], flavors: ['Maracuyá'],
    decorations: ['Flores Naturales'], tags: ['maracuyá'],
  },
];

const config: AppConfig = {
  whatsappNumber: '51902568187',
  facebookUrl: '',
  instagramUrl: '',
  email: 'test@maisonrosas.com',
  address: 'Av. Ricardo Palma 213, Sánchez Cerro, Sullana, Piura',
  openingHours: 'Lunes a Sábado: 9:00 AM - 7:00 PM | Domingos: 10:00 AM - 2:00 PM',
  seoTitle: 'Maison Rosas',
  seoDescription: 'Kekes artesanales',
  maintenanceMode: false,
  heroTitle: '',
  heroDescription: '',
  heroBadge: '',
  aboutTitle: '',
  aboutDescription: '',
  assistantEnabled: true,
  businessHours: [
    { day: 1, open: '09:00', close: '19:00' }, { day: 2, open: '09:00', close: '19:00' },
    { day: 3, open: '09:00', close: '19:00' }, { day: 4, open: '09:00', close: '19:00' },
    { day: 5, open: '09:00', close: '19:00' }, { day: 6, open: '09:00', close: '19:00' },
    { day: 0, open: '10:00', close: '14:00' },
  ],
};

const ctx: AssistantServiceContext = { config, products };
const menu: AssistantScreen = { id: 'menu' };
const provider = new RuleBasedAIProvider();

function classify(raw: string) {
  return classifyIntent(raw, products);
}

// ─── Intenciones ───

test('GREETING: saludos simples y con hora del día', () => {
  assert.equal(classify('hola').intent, 'GREETING');
  assert.equal(classify('Buenas tardes 😊').intent, 'GREETING');
  assert.equal(classify('buenos días').intent, 'GREETING');
});

test('PRESENTATION: presentación sin recopilar el nombre', () => {
  const res = classify('me llamo Juan');
  assert.equal(res.intent, 'PRESENTATION');
  const reply = responseService.replyForIntent('me llamo Juan', menu, ctx, res);
  assert.match(reply.messages[0].text ?? '', /usuario/);
  assert.doesNotMatch(reply.messages[0].text ?? '', /Juan/);
});

test('PRODUCT_SEARCH: por nombre exacto devuelve el producto', () => {
  const res = classify('quiero el keke de chocolate');
  assert.equal(res.intent, 'PRODUCT_SEARCH');
  assert.equal(res.product?.id, 'prod-1');
});

test('PRODUCT_SEARCH: producto inexistente cae a catálogo genérico', () => {
  const res = classify('pastel de fresa');
  assert.equal(res.intent, 'PRODUCT_SEARCH');
  assert.equal(res.product, undefined);
});

test('PRODUCT_PRICE: pregunta de precio', () => {
  assert.equal(classify('¿cuánto cuesta un keke?').intent, 'PRODUCT_PRICE');
  assert.equal(classify('precios por favor').intent, 'PRODUCT_PRICE');
});

test('BUSINESS_HOURS: horarios', () => {
  assert.equal(classify('¿a qué hora cierran?').intent, 'BUSINESS_HOURS');
  assert.equal(classify('horario de atención').intent, 'BUSINESS_HOURS');
});

test('ORDER_CREATE: pedido', () => {
  assert.equal(classify('quiero hacer un pedido').intent, 'ORDER_CREATE');
});

test('ORDER_STATUS: seguimiento', () => {
  assert.equal(classify('¿dónde está mi pedido?').intent, 'ORDER_STATUS');
  assert.equal(classify('tracking de mi pedido').intent, 'ORDER_STATUS');
});

test('HUMAN_SUPPORT: contacto humano / WhatsApp', () => {
  assert.equal(classify('hablar con alguien').intent, 'HUMAN_SUPPORT');
  assert.equal(classify('quiero su whatsapp').intent, 'HUMAN_SUPPORT');
});

test('OCCASION: boda → lista recomendada', () => {
  const res = classify('un keke para mi boda');
  assert.equal(res.intent, 'OCCASION');
  assert.equal(res.occasionLabel, 'Bodas');
  assert.ok((res.products?.length ?? 0) > 0);
});

test('RECOMMENDATION: qué me recomiendas', () => {
  assert.equal(classify('qué me recomiendas').intent, 'RECOMMENDATION');
});

test('PAYMENT / DELIVERY / ADDRESS / LEAD_TIME / CUSTOMIZATION', () => {
  assert.equal(classify('¿hacen yape?').intent, 'PAYMENT_INFO');
  assert.equal(classify('hacen delivery?').intent, 'DELIVERY_INFO');
  assert.equal(classify('cuál es su dirección').intent, 'ADDRESS_INFO');
  assert.equal(classify('con cuánta anticipación pido').intent, 'LEAD_TIME_INFO');
  assert.equal(classify('pueden personalizar el keke').intent, 'CUSTOMIZATION_INFO');
});

test('THANKS / GOODBYE / WHO_ARE_YOU / HELP / ACK', () => {
  assert.equal(classify('gracias por todo').intent, 'THANKS');
  assert.equal(classify('chao, hasta luego').intent, 'GOODBYE');
  assert.equal(classify('quién eres?').intent, 'WHO_ARE_YOU');
  assert.equal(classify('qué puedes hacer?').intent, 'HELP');
  assert.equal(classify('perfecto, entendido').intent, 'ACKNOWLEDGMENT');
});

test('UNKNOWN: fuera de contexto', () => {
  assert.equal(classify('cómo están las acciones de apple hoy').intent, 'UNKNOWN');
  assert.equal(classify('').intent, 'UNKNOWN');
});

// ─── Respuestas ───

test('Respuesta de menú incluye saludo y las 5 opciones', () => {
  const reply = responseService.respond(menu, { type: 'menu' }, ctx);
  const texts = reply.messages.map((m) => m.text ?? '').join('\n');
  assert.match(texts, /Bienvenido/);
  const labels = reply.messages.flatMap((m) => m.options?.map((o) => o.label) ?? []);
  for (const expected of ['Ver productos', 'Consultar precios', 'Realizar un pedido', 'Consultar horarios', 'Hablar por WhatsApp']) {
    assert.ok(labels.some((l) => l.includes(expected)), `falta opción: ${expected}`);
  }
});

test('Lista de productos usa datos reales (nombre + precio)', () => {
  const reply = responseService.respond(menu, { type: 'prices' }, ctx);
  const texts = reply.messages.map((m) => m.text ?? '').join('\n');
  assert.match(texts, /precios de nuestros kekes/);
  const labels = reply.messages.flatMap((m) => m.options?.map((o) => o.label) ?? []);
  assert.ok(labels.some((l) => l.includes('Keke de Chocolate') && l.includes('S/. 35')));
  assert.ok(labels.some((l) => l.includes('Keke de Lúcuma') && l.includes('S/. 40')));
});

test('Detalle de producto muestra precio, descripción, disponibilidad y preparación', () => {
  const reply = responseService.respond(menu, { type: 'product', productId: 'prod-3', mode: 'catalog' }, ctx);
  const text = reply.messages[0].text ?? '';
  assert.match(text, /Maracuyá/);
  assert.match(text, /S\/\. 45/);
  assert.match(text, /Agotado/); // stock: false
  assert.match(text, /72 horas/);
});

test('Horarios usan openingHours real + estado del día', () => {
  const reply = responseService.respond(menu, { type: 'hours' }, ctx);
  const text = reply.messages.map((m) => m.text ?? '').join('\n');
  assert.match(text, /9:00 AM/);
  assert.match(text, /Hoy/);
});

test('Pedido desde el asistente abre el personalizador existente (efecto customize)', () => {
  const reply = responseService.respond(menu, { type: 'orderProduct', productId: 'prod-1' }, ctx);
  assert.equal(reply.effect?.type, 'customize');
  assert.equal(reply.effect?.type === 'customize' ? reply.effect.product.id : null, 'prod-1');
});

test('WhatsApp usa el número de config (sin hardcodear)', () => {
  const reply = responseService.respond(menu, { type: 'whatsapp' }, ctx);
  assert.equal(reply.effect?.type, 'whatsapp');
  assert.ok((reply.effect?.type === 'whatsapp' ? reply.effect.url : '').includes('51902568187'));
  // Config distinta → número distinto
  const other = responseService.respond(menu, { type: 'whatsapp' }, { ...ctx, config: { ...config, whatsappNumber: '51999999999' } });
  assert.ok((other.effect?.type === 'whatsapp' ? other.effect.url : '').includes('51999999999'));
});

test('Atención humana (HUMAN_SUPPORT) → efecto whatsapp', () => {
  const res = classify('quiero hablar con alguien');
  const reply = responseService.replyForIntent('quiero hablar con alguien', menu, ctx, res);
  assert.equal(reply.effect?.type, 'whatsapp');
});

test('Intención desconocida → fallback amable con opciones de salida', () => {
  const res = classify('las vacas vuelan en marte');
  const reply = responseService.replyForIntent('las vacas vuelan en marte', menu, ctx, res);
  const text = reply.messages[0].text ?? '';
  assert.ok(text.length > 0);
  const labels = reply.messages[0].options?.map((o) => o.label) ?? [];
  assert.ok(labels.some((l) => l.includes('Ver productos')));
  assert.ok(labels.some((l) => l.includes('WhatsApp')));
});

test('Asistente desactivado responde de forma amable', () => {
  const disabled = responseService.disabledReply();
  assert.match(disabled.messages[0].text ?? '', /desactivado/);
});

// ─── AIProvider (interfaz desacoplada) ───

test('RuleBasedAIProvider implementa la interfaz y extrae datos', () => {
  assert.equal(provider.name, 'rules-es');
  const order = provider.extractOrderData('Me llamo Ana, mi número es 987654321');
  assert.equal(order?.customerName, 'Ana');
  assert.equal(order?.customerPhone, '987654321');
  assert.equal(provider.extractOrderData('solo saludo'), null);
});

test('actionToIntent mapea acciones para observabilidad', () => {
  assert.equal(actionToIntent('prices'), 'PRODUCT_PRICE');
  assert.equal(actionToIntent('order'), 'ORDER_CREATE');
  assert.equal(actionToIntent('whatsapp'), 'HUMAN_SUPPORT');
  assert.equal(actionToIntent('wat'), 'UNKNOWN');
});

test('buildWhatsAppLink normaliza el número y codifica el mensaje', () => {
  assert.equal(buildWhatsAppLink('+51 902 568 187'), 'https://wa.me/51902568187');
  assert.equal(buildWhatsAppLink('', 'hola'), `https://wa.me/${DEFAULT_WHATSAPP_NUMBER}?text=${encodeURIComponent('hola')}`);
});

// ─── Respuestas según intención (flujo completo) ───

test('Flujo texto: "keke de chocolate" → ficha del producto', () => {
  const res = classify('keke de chocolate');
  const reply = responseService.replyForIntent('keke de chocolate', menu, ctx, res);
  assert.match(reply.messages[0].text ?? '', /Keke de Chocolate/);
  assert.equal(reply.nextScreen.id, 'product');
});

test('Flujo texto: "cuánto cuesta" → lista de precios', () => {
  const res = classify('cuánto cuesta');
  const reply = responseService.replyForIntent('cuánto cuesta', menu, ctx, res);
  assert.equal(reply.nextScreen.id, 'products');
  assert.equal((reply.nextScreen as { mode: ProductListMode }).mode, 'prices');
});

test('Flujo texto: "a qué hora atienden" → horarios', () => {
  const res = classify('a qué hora atienden');
  const reply = responseService.replyForIntent('a qué hora atienden', menu, ctx, res);
  assert.equal(reply.nextScreen.id, 'hours');
});