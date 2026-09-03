/**
 * Rutas públicas del asistente de atención automática.
 *
 * POST /api/assistant/message — entrada única para mensajes de texto libre y
 * acciones de botón del flujo. El backend es la fuente de verdad: clasifica,
 * genera la respuesta con productos/config reales y devuelve el contrato
 * AssistantReply que la UI (o WhatsApp/n8n en el futuro) solo renderiza.
 *
 * Seguridad: validación estricta del payload, longitud acotada, rate limit
 * global /api (60 req/min por IP) y errores seguros (nunca detalles internos).
 */

import { Router } from 'express';
import logger from '../lib/logger.js';
import { AssistantError, automationService } from '../services/assistant/AutomationService.js';
import type { AssistantAction, AssistantScreen, ProductListMode } from '../services/assistant/types.js';

const router = Router();

const SCREEN_IDS = ['menu', 'products', 'product', 'hours'] as const;
const ACTION_TYPES = ['menu', 'products', 'prices', 'order', 'hours', 'whatsapp', 'product', 'orderProduct', 'whatsappProduct', 'back', 'reload'] as const;
const MODES: ProductListMode[] = ['catalog', 'prices', 'order'];
const MAX_TEXT_LENGTH = 500;
const MAX_ID_LENGTH = 100;

function cleanString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  return v.length > 0 && v.length <= max ? v : undefined;
}

function parseScreen(value: unknown): AssistantScreen | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { id, mode, productId } = value as Record<string, unknown>;
  if (id === 'menu' || id === 'hours') return { id };
  if (id === 'products' && MODES.includes(mode as ProductListMode)) {
    return { id, mode: mode as ProductListMode };
  }
  if (id === 'product' && MODES.includes(mode as ProductListMode)) {
    const cleanId = cleanString(productId, MAX_ID_LENGTH);
    if (!cleanId) return undefined;
    return { id, mode: mode as ProductListMode, productId: cleanId };
  }
  return undefined;
}

function parseAction(value: unknown): AssistantAction | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { type, productId, mode } = value as Record<string, unknown>;
  if (typeof type !== 'string' || !(ACTION_TYPES as readonly string[]).includes(type)) return undefined;
  if (type === 'product') {
    const cleanId = cleanString(productId, MAX_ID_LENGTH);
    if (!cleanId) return undefined;
    return { type, productId: cleanId, mode: MODES.includes(mode as ProductListMode) ? (mode as ProductListMode) : 'catalog' };
  }
  if (type === 'orderProduct' || type === 'whatsappProduct') {
    const cleanId = cleanString(productId, MAX_ID_LENGTH);
    if (!cleanId) return undefined;
    return { type, productId: cleanId };
  }
  return { type } as AssistantAction;
}

router.post('/assistant/message', async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';
    const hasMessage = rawMessage.length > 0;

    if (!hasMessage && body.action === undefined) {
      return res.status(400).json({ success: false, error: 'Se requiere "message" o "action".' });
    }
    if (hasMessage && rawMessage.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ success: false, error: `El mensaje no puede superar ${MAX_TEXT_LENGTH} caracteres.` });
    }

    const screen = parseScreen(body.screen);
    const action = body.action !== undefined ? parseAction(body.action) : undefined;
    if (body.action !== undefined && !action) {
      return res.status(400).json({ success: false, error: 'Acción inválida.' });
    }

    const { reply, intent } = await automationService.processCustomerMessage({
      ...(hasMessage ? { message: rawMessage } : {}),
      ...(action ? { action } : {}),
      ...(screen ? { screen } : {}),
    });

    res.json({ success: true, reply, intent });
  } catch (err: any) {
    if (err instanceof AssistantError) {
      return res.status(500).json({ success: false, error: err.message });
    }
    logger.error('Error inesperado en /assistant/message', { service: 'API', error: err?.message || String(err) });
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
});

export default router;