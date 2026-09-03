/**
 * AutomationService — capa de orquestación de la atención automática.
 *
 * El BACKEND es la fuente de verdad:
 *   - lee config y productos reales de la base de datos,
 *   - delega la clasificación/generación en el AIProvider (hoy reglas, mañana IA),
 *   - registra eventos estructurados (observabilidad) y
 *   - devuelve SOLO respuestas seguras al cliente.
 *
 * Está preparado para que en el futuro los mensajes lleguen también desde
 * WhatsApp → webhook → n8n → este mismo servicio (sin cambios de lógica).
 */

import logger from '../../lib/logger.js';
import { configService } from '../ConfigService.js';
import { productService } from '../ProductService.js';
import { actionToIntent, type AssistantIntent } from './intents.js';
import { responseService } from './ResponseService.js';
import { aiProvider, type AIProvider } from './AIProvider.js';
import type { AssistantAction, AssistantReply, AssistantScreen, AssistantServiceContext } from './types.js';

/** Eventos de negocio del asistente (Fase 14 — futura integración n8n). */
export const ASSISTANT_EVENTS = {
  MESSAGE_RECEIVED: 'assistant.message.received',
  INTENT_DETECTED: 'assistant.intent.detected',
  PRODUCT_QUERIED: 'assistant.product.queried',
  ORDER_FLOW_STARTED: 'assistant.order.flow_started',
  HUMAN_SUPPORT_REQUESTED: 'assistant.human_support.requested',
  UNKNOWN_INTENT: 'assistant.unknown_intent',
  ERROR: 'assistant.error',
} as const;

/** Error "seguro" que el API puede devolver al cliente sin filtrar detalles. */
export class AssistantError extends Error {}

export interface AssistantInput {
  message?: string;
  action?: AssistantAction;
  screen?: AssistantScreen;
}

export interface AssistantResult {
  reply: AssistantReply;
  intent: AssistantIntent;
}

export class AutomationService {
  constructor(private readonly provider: AIProvider = aiProvider) {}

  /**
   * Registra un evento estructurado.
   * Hoy: log estructurado (observabilidad). Futuro: notificar a n8n
   * (p. ej. POST /api/integrations/events) SIN bloquear la respuesta.
   */
  private emit(event: string, payload: Record<string, unknown>): void {
    logger.info(event, { service: 'Assistant', ...payload });
  }

  private async buildContext(): Promise<AssistantServiceContext> {
    const [config, products] = await Promise.all([
      configService.getAppConfig(),
      productService.getActive(),
    ]);
    return { config, products };
  }

  /**
   * Procesa un mensaje o acción del cliente y devuelve la respuesta estructurada.
   * Única puerta de entrada al asistente (web HOY; WhatsApp/n8n MAÑANA).
   */
  async processCustomerMessage(input: AssistantInput): Promise<AssistantResult> {
    const text = input.message?.trim() ?? '';
    const hasText = text.length > 0;
    const hasAction = !!input.action;
    const screen: AssistantScreen = input.screen ?? { id: 'menu' };

    this.emit(ASSISTANT_EVENTS.MESSAGE_RECEIVED, {
      kind: hasText ? 'text' : hasAction ? 'action' : 'invalid',
      screen: screen.id,
      length: hasText ? text.length : 0,
    });

    try {
      const ctx = await this.buildContext();

      // Asistente desactivado desde el panel admin → respuesta amable
      if (!ctx.config || ctx.config.assistantEnabled === false) {
        return { reply: responseService.disabledReply(), intent: 'UNKNOWN' as AssistantIntent };
      }

      let intent: AssistantIntent = 'UNKNOWN';
      let reply: AssistantReply;

      if (hasText) {
        const classified = await this.provider.classifyIntent(text.slice(0, 500), ctx.products);
        intent = classified.intent;
        reply = await this.provider.generateResponse(text, screen, ctx, classified);
        this.emit(ASSISTANT_EVENTS.INTENT_DETECTED, {
          intent,
          productId: classified.product?.id ?? null,
        });
        if (classified.product) this.emit(ASSISTANT_EVENTS.PRODUCT_QUERIED, { productId: classified.product.id });
        if (intent === 'ORDER_CREATE') this.emit(ASSISTANT_EVENTS.ORDER_FLOW_STARTED, {});
        if (intent === 'HUMAN_SUPPORT') this.emit(ASSISTANT_EVENTS.HUMAN_SUPPORT_REQUESTED, {});
        if (intent === 'UNKNOWN') this.emit(ASSISTANT_EVENTS.UNKNOWN_INTENT, {});
      } else if (hasAction) {
        intent = actionToIntent(input.action!.type);
        reply = responseService.respond(screen, input.action!, ctx);
        if (intent === 'ORDER_CREATE') this.emit(ASSISTANT_EVENTS.ORDER_FLOW_STARTED, {});
        if (intent === 'HUMAN_SUPPORT') this.emit(ASSISTANT_EVENTS.HUMAN_SUPPORT_REQUESTED, {});
      } else {
        reply = responseService.menuReply(ctx.config);
      }

      return { reply, intent };
    } catch (err: any) {
      // 🔒 Nunca filtrar detalles internos al cliente
      this.emit(ASSISTANT_EVENTS.ERROR, { error: err?.message || String(err) });
      logger.error('Error en AutomationService', { service: 'Assistant', error: err?.message || String(err) });
      throw new AssistantError(
        'No pudimos procesar tu consulta en este momento. Intenta de nuevo o escríbenos por WhatsApp.',
      );
    }
  }
}

export const automationService = new AutomationService();