/**
 * Contrato del asistente (lado servidor).
 *
 * ⚠️ Mantener en sync con `client/src/shared/types.ts` (el cliente usa las
 * mismas formas; la convención del proyecto duplica tipos entre workspaces).
 */

import type { AppConfig, Product } from '../../lib/types.js';

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
  | { type: 'reload' };

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
  /** Efecto lateral que la UI debe ejecutar (abrir personalizador / WhatsApp). */
  effect?: { type: 'customize'; product: Product } | { type: 'whatsapp'; url: string };
  /** El servidor siempre tiene productos; se mantiene por compatibilidad con la UI. */
  requiresProducts?: boolean;
}

/** Contexto de negocio que el servidor inyecta a la capa de respuestas. */
export interface AssistantServiceContext {
  config: AppConfig | null;
  products: Product[];
}