/**
 * Servicio cliente del asistente de atención automática.
 *
 * La UI es delgada: TODO el motor (intenciones, respuestas, productos,
 * horarios, WhatsApp) vive en el backend (POST /api/assistant/message).
 * Este archivo solo serializa el contrato y devuelve el AssistantReply
 * que el panel renderiza.
 */

import { api } from './api/client';
import type { AssistantAction, AssistantReply, AssistantScreen } from '../types';

export interface AssistantMessagePayload {
  message?: string;
  action?: AssistantAction;
  screen?: AssistantScreen;
}

export async function sendAssistantMessage(payload: AssistantMessagePayload): Promise<AssistantReply> {
  const res = await api.assistantMessage(payload);
  if (!res.success || !res.reply) {
    throw new Error('Respuesta inválida del asistente');
  }
  return res.reply as AssistantReply;
}