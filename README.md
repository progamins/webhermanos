<div align="center">
  <img src="https://raw.githubusercontent.com/progamins/webhermanos/main/client/public/logo.png" width="200" alt="Maison Rosas"/>
  <h1 style="margin-top: 12px; font-size: 2.5em;">🍰 Maison Rosas</h1>
  <p style="font-size: 1.1em; color: #666;">Pastelería de autor &amp; repostería fina</p>
  <br/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19"/>
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite 6"/>
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" alt="Express 4"/>
  <img src="https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white" alt="MySQL 8"/>
  <img src="https://img.shields.io/badge/Docker-✔-2496ED?logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5"/>
</div>

<br/>

**Aplicación web full-stack** (tienda online + panel administrativo) para la pastelería de autor **Maison Rosas**, creada por la familia Rosas Albines.

Cliente en React + Vite · Servidor Express + MySQL · Docker listo para producción.

> 📦 **Nueva: instalación con Docker.** Levanta todo con un solo comando.
> Ver la guía completa en **[docker/README.md](docker/README.md)**.

---

## 🚀 Opción A — Docker (recomendado, multiplataforma)

La forma más sencilla de correr el proyecto en **Windows, Linux o macOS**
sin instalar Node, MySQL ni XAMPP manualmente.

**Requisitos:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) o `docker` + `docker compose` (Linux).

```bash
cp .env.example .env          # 1. Copia el entorno
#                              2. Edita .env con tus claves (SMTP, etc.)
docker compose up -d --build   # 3. Levanta cliente + servidor + MySQL
```

URLs una vez levantado:
- 🏠 Tienda: http://localhost:3000
- 🔐 Admin: http://localhost:3000/admin
- ❤️ Health: http://localhost:3000/api/health

Guía completa (backups, troubleshooting, Adminer, migrar Win→Linux) en
**[docker/README.md](docker/README.md)**.

---

## 💻 Opción B — Sin Docker (desarrollo local)

**Prerrequisitos:** Node.js 20+, MySQL 8 (o XAMPP).

```bash
# 1. Instalar dependencias del monorepo
npm install

# 2. Configurar entorno
cp .env.example .env
#    - Edita .env: DB_HOST=localhost, DB_USER, DB_PASSWORD...

# 3. Crear base de datos + tablas
npm run db:migrate
#    (opcional) datos de ejemplo:
npm run db:seed

# 4. Modo desarrollo (cliente en :5173 con proxy al servidor en :3000)
npm run dev
```

Otros scripts útiles:
- `npm run build` — construye cliente (`client/dist`) y servidor (`server/dist`)
- `npm start` — arranca el servidor en producción (sirve el cliente ya construido)

---

## 📂 Estructura del proyecto

```
maison-rosas/
├── client/              # App React + Vite (tienda + admin)
│   ├── src/
│   ├── index.html       # SPA tienda
│   └── admin.html       # SPA admin
├── server/              # API Express + MySQL
│   ├── src/
│   │   ├── index.ts     # Entry point (escucha en 0.0.0.0:3000)
│   │   ├── app.ts       # Express, sirve /api, /uploads y cliente
│   │   ├── migrations/  # 001_init.sql (esquema DB)
│   │   └── ...
│   └── uploads/         # Imágenes subidas (bind mount en Docker)
├── docker-compose.yml   # Orquestación Docker
├── Dockerfile           # Build multi-stage
├── .env.example         # Variables de entorno (plantilla)
└── README.md
```

---

## 🔑 Variables de entorno

Cópialas desde `.env.example` a `.env` (que **no** se sube a GitHub):

| Variable | Docker | Local | Descripción |
|---|---|---|---|
| `DB_HOST` | `db` | `localhost` | Hostname de MySQL |
| `DB_USER` / `DB_PASSWORD` | `root` / `MYSQL_ROOT_PASSWORD` | tu config | Credenciales DB |
| `MYSQL_ROOT_PASSWORD` | ✅ (define) | — | Contraseña root del contenedor MySQL |
| `SMTP_USER` / `SMTP_PASS` | ✅ | ✅ | Gmail + contraseña de aplicación |
| `GOOGLE_MAPS_PLATFORM_KEY` | opcional | opcional | Clave Google Maps |
| `APP_URL` | `http://localhost:3000` | `http://localhost:3000` | URL pública |

---

## 📚 Documentación adicional

- 🐳 [docker/README.md](docker/README.md) — Guía Docker completa
- 🌐 [README_DEPLOY_HOSTGATOR.md](README_DEPLOY_HOSTGATOR.md) — Deploy en HostGator
