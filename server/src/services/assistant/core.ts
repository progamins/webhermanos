/**
 * Entrada "núcleo puro" del asistente (sin acceso a BD ni dependencias de
 * red). Se usa para:
 *   - bundle de pruebas (`npm run test` en server)
 *   - bundle del preview local (`npm run build:assistant-core`) que el stub
 *     de la vista previa importa para ejercitar la lógica REAL del asistente.
 */

export { classifyIntent, normalizeText, actionToIntent, type AssistantIntent, type IntentResult } from './intents.js';
export { ResponseService, responseService, buildWhatsAppLink, DEFAULT_ASSISTANT_MESSAGES, DEFAULT_WHATSAPP_NUMBER, DEFAULT_OPENING_HOURS } from './ResponseService.js';
export { RuleBasedAIProvider, type AIProvider } from './AIProvider.js';
export type {
  AssistantReply,
  AssistantScreen,
  AssistantAction,
  AssistantMessage,
  AssistantOption,
  AssistantServiceContext,
  ProductListMode,
} from './types.js';