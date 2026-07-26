# Changelog

Todos los cambios notables de Maison Rosas se documentan aquí.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/1.1.0/),
y el versionado adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Las secciones son:
- `Added` para nuevas funcionalidades
- `Changed` para cambios en funcionalidad existente  
- `Deprecated` para funcionalidades que se eliminarán pronto
- `Removed` para funcionalidades eliminadas
- `Fixed` para bug fixes
- `Security` para mejoras de seguridad

## [1.1.0] - 2026-07-23

### Security
- Eliminación de secretos hardcoded (contraseñas de roles, ADMIN_SECRET_PATH, IP pública, dirección MAC). Ahora se requieren variables de entorno obligatorias.
- Reescritura completa del historial git para expurgar valores sensibles expuestos.
- CSP reforzado: `strict-dynamic` con nonces, `Permissions-Policy`, `Strict-Transport-Security`, headers de hardening adicionales (equivalente a helmet).
- Cookies de acceso admin protegidas con prefijo `__Host-`, `HttpOnly`, `SameSite=Strict`, `Secure` en producción.
- Validación de email estricta (RFC-5322) en endpoints `/orders`, `/otp/send`, `/contact`.
- Sanitización HTML (`escapeHtml`) en nombre de cliente en creación de pedidos.
- Rate-limit IPv6 corregido: uso de `ipKeyGenerator` nativo de `express-rate-limit`.
- Fix en `env.ts`: función `requireEnv()` con `console.error` (no depende de `logger`) para validación de variables obligatorias sin crash de inicio.

### Changed
- Permisos de cookies de sesión reducidos de 30 a 7 días.
- `.env.example` actualizado con documentación de nuevas variables requeridas (`ADMIN_SECRET_PATH`, contraseñas de roles, IP/MAC opcionales).
- Refactor de `middleware/security.ts`: headers de hardening unificados.
- Import estático de utilidades de validación en `api.routes.ts` (eliminado `import()` dinámico).

### Fixed
- Error fatal `TypeError: Cannot read properties of undefined (reading 'error')` en `env.ts` al faltar `ADMIN_SECRET_PATH`.
- Warnings `ERR_ERL_KEY_GEN_IPV6` de `express-rate-limit` en arranque.

## [1.0.0] - 2026-07-20

### Added
- Panel admin con múltiples roles (admin, analista, gestor de stock).
- Docker + docker-compose para desarrollo y producción.
- Sistema de pedidos con tracking y fotos de progreso.
- Integración SMTP + Resend para correos.
- Sistema de OTP para verificación de clientes.
- Rate limiting en login, API pública, admin y contacto.
- SSE para notificaciones en tiempo real al admin.
- Servicio de galería y reseñas de clientes.
- Configuración dinámica de la app vía panel admin.
- Google Maps Platform integración.
- Google Analytics 4 configurable.
- Logging con Winston (structured JSON).
- Sistema de migraciones MySQL con más de 10 tablas.