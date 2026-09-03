/**
 * Utilidades del lado UI del asistente de atención automática.
 *
 * ⚠️ El motor del asistente (intenciones, respuestas, productos, horarios)
 * vive en el BACKEND (`server/src/services/assistant/` — POST
 * /api/assistant/message). Este archivo solo conserva las piezas que la UI
 * necesita en el navegador:
 *   - estado ABIERTO/CERRADO para el indicador del botón flotante,
 *   - constantes por defecto compartidas con el panel admin,
 *   - ids únicos y etiquetas de eco para el chat.
 */

import type { AppConfig, AssistantAction, BusinessHourDay } from '../types';

// ─── Constantes (mismos valores por defecto que ConfigService.DEFAULT_CONFIG) ───

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

// ─── IDs únicos (timestamp + contador + aleatorio): seguros incluso si el
//     módulo se recarga por HMR mientras la conversación sigue en memoria. ───
let uidCounter = 0;
export function assistantUid(prefix = 'm'): string {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Etiqueta de eco para acciones disparadas desde la UI (botones del pie). */
export function actionLabel(action: AssistantAction): string | null {
  switch (action.type) {
    case 'products': return '🍰 Ver productos';
    case 'prices': return '💰 Consultar precios';
    case 'order': return '🛒 Realizar un pedido';
    case 'hours': return '🕒 Consultar horarios';
    case 'whatsapp': return '💬 Hablar por WhatsApp';
    case 'menu': return '🏠 Menú principal';
    case 'back': return '← Volver';
    default: return null;
  }
}