# 🚀 Despliegue en HostGator — Maison Rosas

## 📦 Requisitos

- Hosting HostGator con **Node.js** (Plan compartido o superior)
- Dominio configurado (ej: `maisonrosas.com`)
- Acceso a **cPanel**

---

## 🔧 Opción 1: Despliegue Fullstack (con servidor Node.js)

> **Requiere**: HostGator compartido con soporte Node.js o un VPS.

### 1. Build de producción

```bash
npm run build
```

Esto genera la carpeta `dist/` con los archivos estáticos optimizados.

### 2. Subir archivos por FTP

Sube al servidor (ej: `public_html/`):

| Archivo / Carpeta | Descripción |
|-------------------|-------------|
| `dist/` | Build estático (HTML, CSS, JS) |
| `server.ts` | Backend Express |
| `package.json` | Dependencias |
| `node_modules/` | Dependencias (ejecutar `npm install` en servidor) |
| `.env` | Variables de entorno |
| `.htaccess` | Configuración Apache (SPA routing, caché, seguridad) |

### 3. Configurar variables de entorno (`.env`)

```env
NODE_ENV=production
PORT=3000
SMTP_USER=edwinraulrosasalbines@gmail.com
SMTP_PASS="tu-app-password-gmail"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
# RESEND_API_KEY=re_xxx  # Opcional, comentado si no usas Resend
```

### 4. Configurar Node.js en cPanel

1. Ve a **Setup Node.js App** en cPanel
2. Crea una nueva aplicación:
   - **Node.js version**: 18 o superior
   - **Application mode**: Production
   - **Application root**: `public_html` (o donde subiste los archivos)
   - **Application URL**: tu dominio
   - **Application startup file**: `server.ts`
   - **Environment variables**: Pega las de tu `.env`
3. Guarda y **reinicia** la aplicación

---

## 🚀 Opción 2: Despliegue Estático SPA (solo frontend)

> **Recomendado si HostGator no soporta Node.js.**  
> El backend (correos, pedidos) seguirá funcionando desde tu máquina local en desarrollo.

### 1. Build

```bash
npm run build
```

### 2. Subir por FTP

Sube todo el contenido de `dist/` a `public_html/` en HostGator.

### 3. `.htaccess` incluido

El archivo `.htaccess` del repositorio ya está configurado para:

| Función | Descripción |
|---------|-------------|
| ✅ SPA Routing | Redirige todas las rutas a `index.html` |
| ✅ HTTPS | Redirección automática (descomentar) |
| ✅ Caché | 1 año para assets con hash |
| ✅ Seguridad | Bloquea `.env`, `node_modules`, `.git` |
| ✅ Compresión | GZip para HTML, CSS, JS |
| ✅ Encabezados | X-Frame-Options, X-Content-Type-Options |

---

## 📱 Funcionalidades Post-Despliegue

| Funcionalidad | Estado |
|---------------|--------|
| 🖼️ Catálogo de pasteles | ✅ Firestore |
| 📦 Pedidos en tiempo real | ✅ Firestore + SSE |
| 📧 Envío de correos (SMTP) | ✅ Gmail App Password |
| 🔐 Panel Admin seguro | ✅ Sesiones con token |
| 📊 Planilla Excel de pedidos | ✅ En panel admin |
| 🖼️ Galería de imágenes | ✅ Firestore |
| ⭐ Opiniones de clientes | ✅ Firestore |
| 🔍 Consulta de pedidos | ✅ OTP por correo |

| ✅ Favicon editable | ✅ Desde panel admin |

---

## 🔍 Verificar despliegue

1. **Web**: Abrir `https://tudominio.com` 
2. **Admin**: `https://tudominio.com/admin`
3. **Tracking**: `https://tudominio.com/tracking`
4. **API Health**: `https://tudominio.com/api/health`

---

## ⚠️ Solución de problemas comunes

| Problema | Solución |
|----------|----------|
| Error 500 al navegar | Verificar `.htaccess` |
| Favicon no cambia | Limpiar caché del navegador (Ctrl+Shift+R) |
| Correos no llegan | Verificar `SMTP_PASS` en `.env` |
| Panel admin no carga | Verificar token de sesión (re-login) |
| Imágenes no cargan | Verificar reglas de seguridad de Firebase Storage |

---

## 📞 Contacto

Para soporte del despliegue, contacta a Edwin Raúl Rosas Albines:

- **WhatsApp**: +51 902 568 187
- **Email**: edwinraulrosasalbines@gmail.com
