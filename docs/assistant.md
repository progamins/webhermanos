# Asistente de Atención Automática

Primera versión (básica) del asistente web de Maison Rosas: un widget flotante que
saluda al cliente, muestra los **productos reales** de la base de datos, los
**horarios**, el estado **ABIERTO/CERRADO** del negocio y deriva el pedido al
**personalizador existente** o a **WhatsApp**.

Funciona 100 % con la arquitectura actual: **no** usa n8n, Docker para
automatizaciones, APIs de WhatsApp/Meta, Twilio, bots externos ni IA de pago.

## Cómo funciona

```text
Usuario → Widget (AssistantWidget/AssistantPanel)
             │
             ▼
      attentionService.assistantRespond(screen, action, ctx)
      (lógica pura: estado del negocio + respuestas predefinidas)
             │
             ▼
      APIs existentes del proyecto
      GET  /api/products      → productos reales (con caché de 10 s)
      GET  /api/config        → mensajes, WhatsApp, horarios
      POST /api/orders        → vía el Customizer existente (sin duplicar lógica)
```

- **Sin carrito duplicado:** al elegir "Personalizar y pedir" el asistente abre el
  `Customizer` existente de la tienda, que usa el flujo real de pedidos
  (`dbService.addOrder` → `POST /api/orders` con precio calculado por servidor).
- **Sin números hardcodeados:** todo sale de `app_config` (`config.whatsappNumber`,
  `assistantWelcomeMessage`, `assistantClosedMessage`, `assistantWhatsappMessage`,
  `businessHours`). Los valores por defecto viven en `ConfigService.DEFAULT_CONFIG`
  y en `attentionService` (mismos valores).

## Configuración

En el panel admin → **Configuración de la Tienda → Atención Automática**:

| Campo | Descripción |
|---|---|
| Activar/desactivar | `assistantEnabled` — oculta el widget por completo si está en `false` |
| Mensaje de bienvenida | `assistantWelcomeMessage` |
| Mensaje cuando cierra | `assistantClosedMessage` |
| Mensaje de WhatsApp | `assistantWhatsappMessage` (texto predefinido del botón WhatsApp) |
| Horario por día | `businessHours[]` — `{ day: 0-6 (Date.getDay), open: 'HH:MM', close: 'HH:MM' }`, `null`/sin horas = cerrado |

El estado ABIERTO/CERRADO se calcula en `attentionService.isBusinessOpen(config)`
comparando la hora actual con `businessHours` del día. Si no hay `businessHours`
configurados, se usan los mismos horarios que el texto `openingHours`
(Lun–Sáb 09:00–19:00, Dom 10:00–14:00).

## Archivos

| Archivo | Rol |
|---|---|
| `client/src/shared/services/attentionService.ts` | Lógica pura: estado del negocio, mensajes predefinidos, máquina de estados del flujo, enlaces WhatsApp |
| `client/src/apps/web/components/AssistantWidget/AssistantWidget.tsx` | Botón flotante + estado abierto/cerrado |
| `client/src/apps/web/components/AssistantWidget/AssistantPanel.tsx` | Panel de chat (burbujas, opciones, carga/error, responsive) |
| `client/src/apps/admin/components/AdminPanel/AdminSettings.tsx` | Sección "Atención Automática" |
| `server/src/services/ConfigService.ts` | Valores por defecto de la config |
| `client/src/shared/types.ts` / `server/src/lib/types.ts` | Tipos `assistant*` y `BusinessHourDay` |

## Preparación para el futuro (n8n / WhatsApp / IA)

La arquitectura separa **lógica de negocio** de **UI**. El único punto de entrada
es `assistantRespond(screen, action, ctx)` en `attentionService.ts`, con un
contrato de mensajes estable:

```ts
// Entrada
{ screen, action, ctx }

// Salida
{
  messages: AssistantMessage[],   // texto + opciones para el cliente
  nextScreen: AssistantScreen,    // pantalla siguiente del flujo
  effect?: { type: 'customize' } | { type: 'whatsapp' }   // efectos laterales
}
```

### Conectar n8n más adelante

1. Exponer un endpoint (p. ej. `POST /api/assistant/reply`) que reciba
   `{ screen, action, ctx }` y devuelva un `AssistantReply`.
2. En ese endpoint, n8n (o un webhook) puede enrutar la conversación a la misma
   lógica local o a una IA/BD de conversaciones.
3. Sustituir la llamada interna a `buildScreenMessages` por un `fetch` a ese
   endpoint. **La UI no cambia.**

### Conectar WhatsApp / Telegram más adelante

- El flujo actual es *pull* (el cliente toca botones en la web). Con WhatsApp, el
  flujo es *push* (el bot responde mensajes), pero el **contrato de respuestas es el
  mismo**: se reutiliza `assistantRespond` alimentándolo con las opciones que elige
  el cliente en el chat.
- Los enlaces `wa.me` (botón "Hablar por WhatsApp") ya usan `config.whatsappNumber`;
  una integración futura los reemplaza por mensajería programática sin tocar el
  resto.

## Pruebas

1. `npm run dev` y abrir http://localhost:5173
2. Clic en el botón flotante (abajo a la derecha) → saludo + menú.
3. "Ver productos" → lista real de la BD → detalle (nombre, precio, descripción,
   disponibilidad, preparación) → "Personalizar y pedir" abre el Customizer.
4. "Consultar precios" / "Realizar un pedido" → mismos productos con distinto foco.
5. "Consultar horarios" → texto de `openingHours` + estado ABIERTO/CERRADO según
   `businessHours`.
6. "Hablar por WhatsApp" → abre `wa.me` con el número configurado.
7. Panel admin → Configuración → Atención Automática: desactivar oculta el widget;
   cambiar mensajes y horarios y recargar la tienda para ver los cambios.