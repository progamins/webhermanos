# Maison Rosas

Una tienda online y sistema de pedidos que desarrollé para una pastelería familiar peruana.

## Demo

La tienda está desplegada y funcionando:

- Demo: https://webhermanos-client.vercel.app
- Repositorio: https://github.com/progamins/webhermanos

## Sobre el proyecto

Maison Rosas nació para ordenar mejor los pedidos de una pastelería familiar que, antes, dependía de mensajes y anotaciones. La idea era centralizar todo: los clientes eligen sus productos, hacen el pedido, y el negocio lo gestiona desde un panel sin que nada se pierda en el chat.

El proyecto incluye una tienda pública (catálogo, personalización de productos, pedidos con seguimiento y verificación por correo) y un panel administrativo con roles para gestionar productos, pedidos, stock y el día a día de la cocina. También hay notificaciones en tiempo real y la tienda funciona como PWA con modo offline.

Está separado entre frontend, backend y base de datos para que sea más fácil mantener cada parte. Todo el código vive en este repositorio: la tienda, el panel, la API, las migraciones de MySQL y la configuración de Docker.

## Qué se puede hacer

- Explorar el catálogo y filtrar productos por categoría.
- Leer reseñas de otros clientes en cada producto.
- Personalizar productos (tamaño, relleno, decoración) con el precio calculado en el servidor.
- Hacer un pedido y seguir su estado con un código de seguimiento.
- Verificar la información del pedido con un código OTP por correo.
- Gestionar productos, pedidos, reseñas y stock desde el panel administrativo.
- Ver los pedidos nuevos y el estado de la cocina en tiempo real (SSE).
- Usar la tienda como PWA, incluso sin conexión.

## Capturas

Capturas reales de la web desplegada:

<img src="screenshots/home.png" width="49%" alt="Página principal en escritorio" />
<img src="screenshots/mobile-home.png" width="49%" alt="Página principal en móvil" />

<img src="screenshots/catalog.png" width="49%" alt="Catálogo de productos" />
<img src="screenshots/tracking.png" width="49%" alt="Seguimiento de un pedido" />

Las capturas se regeneran con `node scripts/capture-screenshots.mjs` (ver [screenshots/README.md](screenshots/README.md)).

## Tecnologías

- Frontend: React, TypeScript, Vite y Tailwind CSS.
- Backend: Node.js y Express (TypeScript).
- Base de datos: MySQL.
- Otros: Docker, GitHub Actions, PWA y SSE.

## Ejecutar el proyecto

La forma más rápida de levantar todo (cliente, API y MySQL) es con Docker:

```bash
git clone https://github.com/progamins/webhermanos.git
cd webhermanos
cp .env.example .env
docker compose up -d --build
```

Antes de arrancar revisa `.env.example`: la app exige las contraseñas iniciales de los roles y una ruta secreta para el panel admin. Sin esos valores no arranca.

Docker levanta tres cosas:

- `app` — el cliente ya construido junto a la API Express (puerto 3000)
- `db` — MySQL 8, con el esquema aplicado automáticamente la primera vez (puerto 3306)
- `adminer` — opcional, gestor visual de MySQL en :8080 (`docker compose --profile tools up adminer -d`)

Cuando esté listo:

- Tienda: http://localhost:3000
- Panel admin: http://localhost:3000/admin
- Health check: http://localhost:3000/api/health

Más detalles y solución de problemas en [docker/README.md](docker/README.md).

## Desarrollo

Para desarrollo local necesitas Node.js 20+ y MySQL 8 (o Docker solo para la base de datos).

```bash
npm install
cp .env.example .env   # en local: DB_HOST=localhost y tus credenciales
npm run db:migrate     # crea el esquema de la base de datos
npm run db:seed        # opcional: datos de ejemplo
npm run dev            # cliente en :5173 con proxy a la API en :3000
```

Si solo quieres la base de datos en Docker y la API en tu máquina, puedes levantar solo el servicio `db` (`docker compose up -d db`) y apuntar el `.env` a `localhost`.

Otros comandos que uso seguido:

- `npm run dev:server` — solo la API en modo watch
- `npm run build` — build de cliente y servidor
- `npm start` — sirve el cliente construido junto a la API
- `npm run lint` — typecheck de ambos workspaces

## Estructura

```text
client/      # Frontend React: tienda pública y panel admin
server/      # API Express, servicios, repositorios y migraciones SQL
api/         # Entry point serverless para Vercel
docker/      # Guía completa de Docker
scripts/     # Scripts auxiliares (seed, capturas, versionado)
screenshots/ # Capturas reales del proyecto
```

La estructura interna de `client/src` y `server/src` está explicada en [docs/architecture.md](docs/architecture.md).

## Documentación

- Arquitectura — [docs/architecture.md](docs/architecture.md)
- API — [docs/api.md](docs/api.md)
- Docker — [docker/README.md](docker/README.md)
- Despliegue en HostGator — [README_DEPLOY_HOSTGATOR.md](README_DEPLOY_HOSTGATOR.md)
- Variables de entorno — [.env.example](.env.example) y [.vercel.env.example](.vercel.env.example)
- Seguridad — [SECURITY.md](SECURITY.md)
- Contribuir — [CONTRIBUTING.md](CONTRIBUTING.md)
- Historial de cambios — [CHANGELOG.md](CHANGELOG.md)

## Estado actual

El proyecto está en desarrollo activo y algunas funcionalidades siguen cambiando. La validación se apoya en typecheck estricto, el build de producción y la CI de GitHub Actions en cada push; todavía no existe una suite completa de tests automatizados.

## Próximos pasos

- Añadir pruebas automatizadas (unitarias y de integración).
- Mejorar el proceso de pedidos y el panel administrativo.
- Agregar opciones de pago en línea.
- Seguir mejorando la documentación.

## Autor

Desarrollado por Progamins para Maison Rosas.