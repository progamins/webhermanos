# 🍰 Maison Rosas

Pastelería de autor y repostería fina — aplicación web (tienda + panel admin)
con React + Vite (cliente) y Express + MySQL (servidor).

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

## 🌍 Subir a GitHub (para clonarlo en Linux más tarde)

### 1. Crear el repositorio
- Entra en https://github.com/new y crea un repo **vacío** (sin README ni .gitignore).
- O por CLI si tienes `gh`:
  ```bash
  gh repo create maison-rosas --private --source=. --remote=origin
  ```

### 2. Asegurar que NO se suben secretos ni archivos pesados
El `.gitignore` ya excluye: `.env`, `node_modules/`, `dist/`, `uploads/`,
`*.log`, `lighthouse-*.json`, `.zcode/`. Verifícalo:
```bash
git status --short
# NO debe aparecer .env, node_modules ni uploads/
```

### 3. Hacer commit y push
```bash
git add -A
git commit -m "feat: dockerize app (Dockerfile + compose) y limpieza de estructura"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/maison-rosas.git   # si no lo creaste con gh
git push -u origin main
```

### 4. En la máquina Linux destino
```bash
git clone https://github.com/<tu-usuario>/maison-rosas.git
cd maison-rosas
cp .env.example .env
nano .env                       # pega tus secretos reales (SMTP, etc.)
docker compose up -d --build
```

> 💡 Para llevar también los **datos** (productos, pedidos, imágenes), haz un backup
> en Windows con los comandos de [docker/README.md](docker/README.md#-backups)
> y restáuralo en Linux.

---

## 📚 Documentación adicional

- 🐳 [docker/README.md](docker/README.md) — Guía Docker completa
- 🚀 [README_RENDER.md](README_RENDER.md) — Deploy en Render
- 🌐 [README_DEPLOY_HOSTGATOR.md](README_DEPLOY_HOSTGATOR.md) — Deploy en HostGator
