# Política de Seguridad

## Reportar una vulnerabilidad

Si encuentras una vulnerabilidad de seguridad en **Maison Rosas**, **no abras un issue público**. En su lugar:

1. Envía un correo a **edwinraulrosasalbines@gmail.com** (o al correo que figure en la configuración del proyecto) con el asunto `[Security] ...`.
2. Incluye en el reporte:
   - Descripción de la vulnerabilidad y su posible impacto.
   - Pasos para reproducirla (sin explotarla contra producción).
   - Entorno afectado (versión, despliegue Docker/Vercel, etc.).

**Compromiso:** se responderá y se trabajará en una corrección lo antes posible. Agradecemos la divulgación responsable y coordinada.

## Medidas de seguridad implementadas

- Headers de hardening en todas las respuestas (CSP, HSTS, X-Frame-Options, etc.).
- Rate limiting por IP en API, login, admin, contacto y OTP.
- Panel admin con ruta secreta, sesiones por token (una por rol) y contraseñas con bcrypt.
- Anti-SSRF en el proxy de imágenes y lista blanca de dominios.
- Sanitización HTML y validación estricta de email en endpoints públicos.
- Precios calculados y validados en el servidor.
- Cookies `HttpOnly` / `SameSite=Strict` / `__Host-` en producción; caché `no-store` en rutas admin.

## Secretos

- Los archivos `.env` están en `.gitignore` y **nunca** deben subirse al repositorio.
- Los archivos `*.env.example` solo deben contener placeholders.
- Si un secreto se expone en el historial git: **rótalo inmediatamente** (contraseñas, API keys, tokens) y considera purgar el historial con `git filter-repo` o BFG.
- Rota las contraseñas de roles desde el panel admin o regenerando los hashes con `npm run db:seed`.
