# Asistente de Atención Automática

Sistema de atención automática de Maison Rosas con **el backend como fuente de
verdad**: el navegador solo renderiza; la clasificación de intenciones, las
respuestas, los productos, los horarios y el estado ABIERTO/CERRADO se resuelven
en el servidor contra la base de datos real.

No usa n8n, WhatsApp/Meta, Twilio ni IA de pago **todavía**, pero la arquitectura
está preparada para integrarlos sin reescribir nada.

## Arquitectura

```text
CLIENTE (navegador)
  └─ AssistantWidget / AssistantPanel   ← UI delgada: renderiza AssistantReply
        │  POST /api/assistant/message  { message | action, screen }
        ▼
BACKEND (Express)
  ├─ routes/assistant.routes.ts         ← validación, sanitización, errores seguros
  └─ services/assistant/
       ├─ AutomationService.ts          ← orquestación + eventos (fuente de verdad)
       ├─ AIProvider.ts                 ← interfaz desacoplada (hoy: reglas; mañana: NVIDIA)
       ├─ intents.ts                    ← clasificador de intenciones (sin IA)
       ├─ ResponseService.ts            ← respuestas estructuradas (puras, sin BD)
       └─ types.ts                      ← contrato AssistantReply (sync con client)
             │
             ▼
      Servicios de negocio (ConfigService, ProductService) → MySQL 8
```

Futuro (sin cambios en la lógica):

```text
WhatsApp → Meta Cloud API → Webhook → n8n → POST /api/assistant/message
                                                      ↓
                                    AutomationService (misma lógica)
```

## API

### `POST /api/assistant/message`

Entrada única del asistente (texto libre **o** acción de botón).

```jsonc
// Request
{
  "screen": { "id": "menu" | "products" | "product" | "hours", "mode"?, "productId"? },
  "message": "¿cuánto cuesta un keke?",   // OPCIONAL — texto libre (máx. 500 chars)
  "action":  { "type": "products" }        // OPCIONAL — acción del flujo (se requiere una de las dos)
}

// Response
{
  "success": true,
  "intent": "PRODUCT_PRICE",
  "reply": {
    "messages": [ { "id", "role": "bot|user", "text", "kind", "options": [{ "label", "action" }] } ],
    "nextScreen": { "id": "product", "mode": "prices", "productId": "prod-1" },
    "effect": { "type": "customize", "product": {…} } | { "type": "whatsapp", "url": "https://wa.me/…" }
  }
}
```

El cliente ejecuta los `effect` (abrir el Customizer existente con el producto /
abrir WhatsApp) y el `nextScreen` solo se usa para mantener el contexto entre
mensajes. Rate limit: limitador global `/api` (60 req/min por IP).

## Intenciones (Fase 5)

`classifyIntent()` detecta, sin IA, las intenciones canónicas:

`GREETING` · `PRESENTATION` · `PRODUCT_SEARCH` · `PRODUCT_PRICE` · `OCCASION` ·
`RECOMMENDATION` · `BUSINESS_HOURS` · `ORDER_CREATE` · `ORDER_STATUS` ·
`HUMAN_SUPPORT` · `PAYMENT_INFO` · `DELIVERY_INFO` · `ADDRESS_INFO` ·
`LEAD_TIME_INFO` · `CUSTOMIZATION_INFO` · `THANKS` · `GOODBYE` ·
`WHO_ARE_YOU` · `HELP` · `ACKNOWLEDGMENT` · `UNKNOWN`

Jerarquía: presentación → producto específico (nombre/tag/sabor/categoría) →
ocasión/recomendación → info del negocio → catálogo/pedidos → small talk →
`UNKNOWN` (fallback amable con salida a WhatsApp/menú; la conversación nunca
queda muerta).

## Archivos

| Archivo | Rol |
|---|---|
| `server/src/services/assistant/types.ts` | Contrato del asistente (lado servidor) |
| `server/src/services/assistant/intents.ts` | Clasificador de intenciones (reglas en español) |
| `server/src/services/assistant/ResponseService.ts` | Responde por intención/acción (pura, sin BD) |
| `server/src/services/assistant/AIProvider.ts` | Interfaz `AIProvider` + `RuleBasedAIProvider` |
| `server/src/services/assistant/AutomationService.ts` | Orquestación + eventos + `ASSISTANT_EVENTS` |
| `server/src/services/assistant/core.ts` | Entry pura para bundle de pruebas/preview |
| `server/src/routes/assistant.routes.ts` | `POST /api/assistant/message` |
| `server/src/services/assistant/assistant.test.ts` | Tests (node:test) |
| `client/src/shared/services/assistantService.ts` | Cliente del endpoint |
| `client/src/apps/web/components/AssistantWidget/*` | UI delgada (botón + panel) |
| `client/src/shared/services/attentionService.ts` | Solo helpers de UI (estado abierto/cerrado, ids) |

## Seguridad

- Validación estricta del payload (screen/action/message), longitudes acotadas
  (mensaje ≤ 500, ids ≤ 100) y sanitización de entradas en la ruta.
- `assistantEnabled=false` (panel admin) → el servicio responde desactivado.
- Errores seguros: `AutomationService` nunca filtra SQL/stack traces; la ruta
  devuelve un mensaje amable y registra el detalle en logs.
- El número de WhatsApp, mensajes y horarios salen de `app_config` (nunca
  hardcodeados ni expuestos salvo lo que la propia tienda ya publica).
- Rate limit global `/api` aplicado; sin credenciales en el repo.

## Observabilidad

`AutomationService.emit()` registra eventos estructurados (Winston, servicio
`Assistant`): `message.received`, `intent.detected`, `product.queried`,
`order.flow_started`, `human_support.requested`, `unknown.intent`, `error`.
No se registra información sensible (mensajes completos, datos personales).

## Pruebas

```bash
npm run test --workspace=server
```

29 tests con `node:test` (sin dependencias nuevas; se compilan con esbuild):
intenciones (saludos, precios, horarios, pedido, seguimiento, humano, ocasión,
recomendación, desconocida…), respuestas (menú, productos reales con precios,
ficha con disponibilidad, horarios, efecto customize, WhatsApp con número de
config), fallback, asistente desactivado, `AIProvider` y `extractOrderData`.

Pendientes (requieren MySQL): pruebas de integración de pedidos/productos
reales y de los endpoints protegidos del admin.

## Futura integración NVIDIA (DeepSeek)

Ya existe la interfaz desacoplada:

```ts
interface AIProvider {
  classifyIntent(text, products): IntentResult;
  generateResponse(text, screen, ctx, classified): AssistantReply;
  extractOrderData(text): { customerName, customerPhone } | null;
}
```

Para conectar NVIDIA: crear `NvidiaAIProvider implements AIProvider` (usando la
API key de NVIDIA, p. ej. DeepSeek Flash en build.nvidia.com) e inyectarla:

```ts
new AutomationService(new NvidiaAIProvider(process.env.NVIDIA_API_KEY));
```

Nada más cambia: la UI, las rutas, los eventos y la BD usan el mismo contrato.
La IA queda aislada en su capa; no toca la lógica de pedidos.

## Futura integración n8n

- `AutomationService.emit()` es el punto de enganche: hoy loguea, mañana puede
  notificar a n8n (`POST /api/integrations/events`) sin bloquear la respuesta.
- Eventos candidatos: `order.created`, `order.updated`, `customer.message`,
  `product.updated` (se emiten desde los servicios de negocio, no desde n8n).
- n8n **no** tendrá reglas de negocio ni acceso directo a MySQL: todo pasa por
  la API (fuente de verdad).

## Futura integración WhatsApp

```text
WhatsApp → Meta Cloud API → Webhook → n8n → POST /api/assistant/message
                                                      ↓
                                     AutomationService → BD / AI → AssistantReply
                                                      ↓
                                                Meta Cloud API → WhatsApp
```

El contrato `AssistantReply` ya es agnóstico al canal; basta conectar el
webhook y serializar la respuesta de vuelta. No se reescribe nada del sistema.

## Producción (checklist)

- [x] Build de cliente y servidor en CI.
- [ ] Tests de integración con MySQL (pedidos, productos, endpoints admin).
- [ ] Revisar CORS/`APP_URL` en el despliegue (Vercel ya sirve `/api` desde `api/index.ts`).
- [ ] Si se activa IA: guardar `NVIDIA_API_KEY` como secret de Vercel (nunca en el repo).
- [ ] Decidir retención de logs si se quiere persistir eventos del asistente.
- [ ] Probar el asistente en móvil real (PWA) antes del despliegue.