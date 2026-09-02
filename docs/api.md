# API

Base: `/api`. Respuestas en JSON. El panel admin (`/api/admin/*`) requiere el header `x-admin-token`.

## Públicas

| Método | Endpoint | Propósito |
|---|---|---|
| GET | `/api/health` | Estado del servidor |
| GET | `/api/products` | Catálogo de productos |
| GET | `/api/reviews` | Reseñas aprobadas |
| GET | `/api/gallery` | Galería de imágenes |
| GET | `/api/config` | Configuración pública de la tienda |
| GET | `/api/orders?trackingCode=…` o `?email=…` | Consultar pedido por tracking o email |
| POST | `/api/orders` | Crear pedido (precio validado en servidor) |
| POST | `/api/otp/send` · `/api/otp/verify` | Envío y verificación del código OTP |
| POST | `/api/contact` | Formulario de contacto (con límite por IP) |
| GET | `/api/events` | SSE — notificaciones en tiempo real |

## Admin (requieren sesión)

| Método | Endpoint | Propósito |
|---|---|---|
| POST | `/api/admin/login` · `/verify` · `/logout` | Autenticación de roles |
| GET/POST/DELETE | `/api/admin/products` | Gestión de productos |
| GET/POST/DELETE | `/api/admin/orders` · `/orders/status` · `/orders/update-full` · `/orders/update-payment` · `/orders/assign-stock` · `/orders/upload-voucher` · `/orders/progress-photo` · `/orders/reset-timer` | Gestión de pedidos |
| GET/POST | `/api/admin/kitchen/orders` · `/kitchen/update-status` · `/kitchen/notes` | Panel de cocina |
| GET/POST/DELETE | `/api/admin/gallery` · `/reviews/approve` · `/reviews/reply` · `/config` · `/stock` | Galería, reseñas, configuración y stock |
| GET | `/api/admin/diagnostics` · `/role-passwords` · `/storage/list` | Diagnóstico y administración de storage |
| POST | `/api/upload` | Subida de imágenes (multipart, token requerido) |

La lista completa de endpoints está en el código (`server/src/routes/`).