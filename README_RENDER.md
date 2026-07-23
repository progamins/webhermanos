# Guía para Desplegar Maison Rosas en Render 🚀

Este proyecto es una aplicación **Full-Stack (Vite + React en el Frontend, Node.js + Express en el Backend)** con base de datos MySQL.

Sigue estos pasos sencillos para desplegar tu aplicación en **Render**:

## 1. Preparar el repositorio
1. En la esquina superior derecha del editor de **AI Studio**, ve al menú de configuración (Settings/Exportar) y exporta tu proyecto a **GitHub** o descárgalo como un archivo **ZIP** y súbelo a un repositorio de GitHub.
2. Tu repositorio de GitHub debe contener todos los archivos del proyecto (incluyendo `package.json`, `server.ts`, `tsconfig.json`, `index.html`, `src/`, etc.).

---

## 2. Configurar el servicio en Render
1. Inicia sesión en [Render](https://render.com/).
2. Haz clic en **"New"** (Nuevo) y selecciona **"Web Service"** (Servicio Web).
3. Conecta tu cuenta de GitHub y selecciona el repositorio de tu proyecto **Maison Rosas**.
4. Rellena los campos con la siguiente configuración:

   - **Name:** `maison-rosas` (o el nombre que prefieras)
   - **Environment / Runtime:** `Node`
   - **Region:** Elige la más cercana a tus usuarios (ej. `Oregon (US West)` u `Ohio (US East)`)
   - **Branch:** `main` (o la rama que uses)
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run start`

---

## 3. Configurar las Variables de Entorno (Environment Variables)
En la sección **"Environment"** de la configuración de tu servicio en Render, debes agregar las siguientes variables para que la aplicación funcione a la perfección:

| Nombre de Variable | Valor / Descripción |
|---|---|
| `NODE_ENV` | `production` (Indica que corre en modo optimizado de producción) |
| `PORT` | `3000` (Render lo maneja de forma automática, pero es recomendable definirlo) |

| `GOOGLE_MAPS_PLATFORM_KEY` | Tu clave de Google Maps (Para la localización interactiva de la tienda). |
| `RESEND_API_KEY` | *(Opcional)* Tu API Key de [Resend](https://resend.com/) si deseas enviar correos automáticos reales a tus clientes. |
| `RESEND_SENDER_EMAIL` | *(Opcional)* Tu correo verificado en Resend (ej. `edwinraulrosasalbines@gmail.com`). |
| `SMTP_USER` | *(Opcional - Alternativa a Resend)* Tu correo de Gmail. |
| `SMTP_PASS` | *(Opcional - Alternativa a Resend)* Tu contraseña de aplicación de Gmail (16 caracteres). |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `EMAIL_SENDER_NAME` | `Maison Rosas` |

---

## ¡Listo! 🎉
Una vez que completes estos pasos, haz clic en **"Create Web Service"**. Render compilará tu aplicación, instalará las dependencias necesarias de producción, empaquetará el servidor y el cliente mediante `vite` y `esbuild` de forma automatizada, y te dará una URL pública del tipo `https://maison-rosas.onrender.com`.
