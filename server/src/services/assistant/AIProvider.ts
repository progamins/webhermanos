/**
 * AIProvider — interfaz desacoplada para el "cerebro" del asistente.
 *
 * La aplicación (AutomationService) depende de ESTA interfaz, no de un
 * proveedor concreto. Hoy la implementa un clasificador por reglas local
 * (sin llamadas externas); mañana puede implementarla un proveedor de IA.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FUTURA INTEGRACIÓN NVIDIA (DeepSeek u otro modelo)
 * ─────────────────────────────────────────────────────────────────────────
 * Cuando exista una API key de NVIDIA (build.nvidia.com), crear:
 *
 *     class NvidiaAIProvider implements AIProvider {
 *       name = 'nvidia-deepseek';
 *       async classifyIntent(text, products) { /* IA: devuelve IntentResult * / }
 *       async generateResponse(text, screen, ctx, classified) { /* IA: devuelve AssistantReply * / }
 *       async extractOrderData(text) { /* IA: extrae { customerName, customerPhone } * / }
 *     }
 *
 * e inyectarla: new AutomationService(new NvidiaAIProvider(process.env.NVIDIA_API_KEY)).
 *
 * Nada más del sistema cambia: la UI, las rutas, los eventos y la base de
 * datos siguen usando el MISMO contrato (AssistantReply / IntentResult).
 * La IA es una capa independiente: no mezcla su lógica con pedidos/negocio.
 */

import type { Product } from '../../lib/types.js';
import { classifyIntent, normalizeText, type IntentResult } from './intents.js';
import { responseService } from './ResponseService.js';
import type { AssistantReply, AssistantScreen, AssistantServiceContext } from './types.js';

export interface AIProvider {
  /** Identificador del proveedor (para logs y diagnóstico). */
  readonly name: string;
  /** Clasifica un mensaje de texto en una intención canónica. */
  classifyIntent(text: string, products: Product[]): IntentResult | Promise<IntentResult>;
  /** Genera la respuesta estructurada a partir de la intención detectada. */
  generateResponse(
    text: string,
    screen: AssistantScreen,
    ctx: AssistantServiceContext,
    classified: IntentResult,
  ): AssistantReply | Promise<AssistantReply>;
  /** Extrae datos estructurados de un mensaje (nombre, teléfono…). */
  extractOrderData(text: string): { customerName: string | null; customerPhone: string | null } | null | Promise<{ customerName: string | null; customerPhone: string | null } | null>;
}

/**
 * Proveedor local basado en reglas (sin IA, sin red).
 * Es la implementación por defecto y funciona sin ninguna credencial.
 */
export class RuleBasedAIProvider implements AIProvider {
  readonly name = 'rules-es';

  classifyIntent(text: string, products: Product[]): IntentResult {
    return classifyIntent(text, products);
  }

  generateResponse(
    text: string,
    screen: AssistantScreen,
    ctx: AssistantServiceContext,
    classified: IntentResult,
  ): AssistantReply {
    return responseService.replyForIntent(text, screen, ctx, classified);
  }

  extractOrderData(text: string): { customerName: string | null; customerPhone: string | null } | null {
    const norm = normalizeText(text);
    const nameMatch = norm.match(/(?:me llamo|mi nombre es|soy)\s+([a-z]{2,})/);
    const phoneMatch = text.match(/\b9\d{8}\b/);
    if (!nameMatch && !phoneMatch) return null;
    const name = nameMatch ? nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1) : null;
    return { customerName: name, customerPhone: phoneMatch ? phoneMatch[0] : null };
  }
}

/** Proveedor actual en uso por el sistema. */
export const aiProvider: AIProvider = new RuleBasedAIProvider();