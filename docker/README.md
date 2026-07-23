# 🐳 Maison Rosas — Guía Docker

Esta guía explica cómo levantar **toda la aplicación** (cliente + servidor + MySQL)
con Docker, tanto en **Windows** como en **Linux**. Es la forma recomendada para
mover el proyecto entre sistemas sin instalar nada a mano.

---

## ✅ Requisitos

| Sistema | Qué instalar |
|---|---|
| **Windows 11** | [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose) |
| **Linux** | `docker` + `docker-compose-plugin` (vía gestor de paquetes de tu distro) |

Comprueba que está todo listo:

```bash
docker --version          # Docker version 24+
docker compose version    # Docker Compose v2+  (¡con "compose", sin guion!)
```

> En Linux necesitas que tu usuario esté en el grupo `docker` para no usar `sudo`:
> `sudo usermod -aG docker $USER` y luego cierra/abre sesión.

---

## 🚀 Puesta en marcha (3 pasos)

### 1. Copia el archivo de entorno y rellena tus secretos
```bash
cp .env.example .env
```
Abre `.env` y configura **al menos**:
- `MYSQL_ROOT_PASSWORD` → una contraseña segura para MySQL.
- `DB_PASSWORD` → **igual** que `MYSQL_ROOT_PASSWORD` (la app se conecta como root por simplicidad).
- `SMTP_USER` y `SMTP_PASS` → tu correo + [contraseña de aplicación](https://myaccount.google.com/apppasswords) de Gmail.
- `GOOGLE_MAPS_PLATFORM_KEY` → tu clave de Google Maps (opcional).

> 🔒 El archivo `.env` **nunca** se sube a GitHub (está en `.gitignore`).
> Solo se commitea `.env.example` con valores de ejemplo.

### 2. Levanta todo
```bash
docker compose up -d --build
```
La **primera vez** tarda varios minutos (descarga imágenes + construye cliente y servidor).

### 3. Verifica que funciona
| URL | Qué verás |
|---|---|
| http://localhost:3000 | 🏠 Tienda (cliente) |
| http://localhost:3000/admin | 🔐 Panel admin |
| http://localhost:3000/api/health | ❤️ Estado del servidor (`{"status":"ok"}`) |

Logs en vivo:
```bash
docker compose logs -f app     # solo la app
docker compose logs -f db      # solo MySQL
docker compose logs -f         # todo
```

> La **primera vez**, MySQL tarda ~20-40s en aplicar `001_init.sql` automáticamente.
> Mientras tanto, la app reinicia hasta que la BD responde (gracias al `healthcheck`).

---

## 🧱 Qué se levanta

| Servicio | Imagen / build | Puerto host | Persistencia |
|---|---|---|---|
| `db` | `mysql:8.0` | `3306` | volumen `maison-rosas-db-data` |
| `app` | `Dockerfile` multi-stage | `3000` | carpeta `./uploads/` (bind mount) |
| `adminer` *(opcional)* | `adminer:latest` | `8080` | — |

La BD se inicializa sola la primera vez montando
`server/src/migrations/001_init.sql` en `/docker-entrypoint-initdb.d/`.
El SQL usa `CREATE TABLE IF NOT EXISTS`, así que **es seguro** aunque se reanude.

---

## 🛠️ Comandos útiles

```bash
# Parar todo (conserva datos)
docker compose stop

# Parar y borrar contenedores (conserva datos en volúmenes)
docker compose down

# Parar y BORRAR la base de datos (¡cuidado, pérdida de datos!)
docker compose down -v

# Reconstruir tras cambiar código
docker compose up -d --build

# Entrar a la shell del servidor
docker compose exec app sh

# Conexión a MySQL desde tu host (mysql client)
mysql -h 127.0.0.1 -P 3306 -uroot -p

# Ver consumo de recursos
docker stats maison-rosas-db maison-rosas-app
```

### Poblar datos de ejemplo (seed)
Si tienes un script `db:seed` y quieres correrlo dentro del contenedor:
```bash
docker compose exec app node -e "import('./src/migrations/run.ts')"
```
Lo habitual es que con el esquema + tus productos reales ya tengas suficiente.

---

## 🗺️ Adminer (gestor visual de MySQL, opcional)

```bash
docker compose --profile tools up -d adminer
```
Abre **http://localhost:8080** e inicia sesión con:
- **Servidor**: `db`
- **Usuario**: `root`
- **Contraseña**: el valor de `MYSQL_ROOT_PASSWORD`
- **Base de datos**: `maison_rosas`

---

## 💾 Backups

### Base de datos
```bash
# Exportar (copia seguridad.sql en tu carpeta actual)
docker compose exec -T db mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" maison_rosas > backup.sql

# Restaurar
docker compose exec -T db mysql -uroot -p"$MYSQL_ROOT_PASSWORD" maison_rosas < backup.sql
```

### Imágenes subidas (uploads)
La carpeta `./uploads/` ya está en tu disco (bind mount). Basta con copiarla:
```bash
# Exportar
tar -czf uploads-backup.tar.gz uploads/

# Restaurar
tar -xzf uploads-backup.tar.gz
```

---

## ❓ Problemas frecuentes

**El puerto 3000/3306 ya está en uso**
Edita `.env`:
```env
APP_PORT_PUBLISHED=3005
DB_PORT_PUBLISHED=3307
```
y vuelve a levantar.

**`docker compose up` falla con "Cannot connect to the Docker daemon`**
- Windows: abre Docker Desktop y espera a que el icono esté verde.
- Linux: arranca el servicio: `sudo systemctl start docker`.

**La app reinicia en bucle al principio**
Es normal durante los primeros ~30s mientras MySQL inicializa. El `healthcheck`
evita que `app` arranque antes de tiempo. Si pasados 2 min sigue reiniciando:
```bash
docker compose logs app
docker compose logs db
```

**Quiero partir de cero total**
```bash
docker compose down -v          # borra contenedores + volumen de BD
rm -rf uploads/*                # opcional: borra imágenes subidas
docker compose up -d --build
```

**Cambié `.env` y no se refleja**
Las variables de entorno **sí** se releen con un reinicio:
```bash
docker compose up -d            # sin --build, basta reiniciar
```
Si cambiaste algo de `GOOGLE_MAPS_PLATFORM_KEY` (que se "cuece" en el build del
cliente), entonces sí necesitas `--build`.

---

## 🔄 Migrar de Windows a Linux

1. En **Windows**: sube todo a GitHub (ver sección en el `README.md` raíz).
2. En **Linux**:
   ```bash
   git clone https://github.com/<tu-usuario>/maison-rosas.git
   cd maison-rosas
   cp .env.example .env
   nano .env                    # pega tus secretos reales
   docker compose up -d --build
   ```
3. ¡Listo! Misma app, mismo esquema, sin instalar Node ni MySQL ni XAMPP.

> **Para mover también tus datos** (productos, pedidos, imágenes): exporta con los
> comandos de *Backups* en Windows, copia los archivos a Linux y restaura ahí.
