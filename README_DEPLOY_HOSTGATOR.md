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
cd client && npm run build
cd ../server && npm run build
```

Esto genera `client/dist/` con los archivos estáticos y `server/dist/` con el backend.

### 2. Subir archivos por FTP

Sube al servidor:

| Archivo / Carpeta | Descripción |
|-------------------|-------------|
| `client/dist/` | Build estático (HTML, CSS, JS) |
| `server/dist/` | Backend compilado |
| `server/package.json` | Dependencias del servidor |
| `server/node_modules/` | Ejecutar `npm install` en servidor |
| `.env` | Variables de entorno |
| `.htaccess` | Configuración Apache (SPA routing, caché, seguridad) |

### 3. Configurar variables de entorno (`.env`)

```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=maison_rosas
SMTP_USER=tu_correo@gmail.com
SMTP_PASS="tu-app-password-gmail"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
```

### 4. Configurar Node.js en cPanel

1. Ve a **Setup Node.js App** en cPanel
2. Crea una nueva aplicación:
   - **Node.js version**: 18 o superior
   - **Application mode**: Production
   - **Application root**: `server` (o donde subiste los archivos)
   - **Application URL**: tu dominio
   - **Application startup file**: `dist/index.js`
   - **Environment variables**: Pega las de tu `.env`
3. Guarda y **reinicia** la aplicación

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
| Error de conexión BD | Verificar `DB_HOST`, `DB_USER`, `DB_PASSWORD` en `.env` |
