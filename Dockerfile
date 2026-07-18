# syntax=docker/dockerfile:1.7
# ═══════════════════════════════════════════════════════════════════════
# Maison Rosas — Dockerfile multi-stage (monorepo npm workspaces)
#
# El proyecto es un monorepo con workspaces (client + server) y un ÚNICO
# package-lock.json en la raíz. Por eso instalamos desde la raíz con
# `npm ci --workspaces` y luego construimos cada paquete.
#
# Resultado final: imagen pequeña con el cliente ya construido y el
# servidor listo para arrancar con `node dist/index.js`.
# ═══════════════════════════════════════════════════════════════════════

# ───────────────────────────────────────────────────────────────────────
# Etapa 1: Instalar dependencias de TODO el monorepo (caché optimizada)
# ───────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copiamos SOLO manifiestos para aprovechar la caché de Docker.
COPY package.json package-lock.json tsconfig.base.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Instala el árbol completo de workspaces (client + server).
RUN npm ci --workspaces --include-workspace-root

# ───────────────────────────────────────────────────────────────────────
# Etapa 2: Construir cliente + servidor
# ───────────────────────────────────────────────────────────────────────
FROM deps AS build

# Código fuente del monorepo.
COPY client/ ./client/
COPY server/ ./server/

# Variables de build para el cliente (se pueden sobrescribir con --build-arg).
ARG GOOGLE_MAPS_PLATFORM_KEY=""
ENV GOOGLE_MAPS_PLATFORM_KEY=$GOOGLE_MAPS_PLATFORM_KEY
ENV VITE_GA_MEASUREMENT_ID=""

# Construimos cliente y servidor (scripts del package.json raíz).
RUN npm run build --workspace=client && \
    npm run build --workspace=server

# Dependencias de PRODUCCIÓN del servidor (sin devDependencies).
RUN npm prune --omit=dev --workspace=server

# ───────────────────────────────────────────────────────────────────────
# Etapa 3: Imagen final de runtime (mínima)
# ───────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# tini maneña señales correctamente (Ctrl+C / reinicios limpios).
RUN apk add --no-cache tini

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

WORKDIR /app/server

# package.json del server + node_modules de producción (resuelto a raíz).
COPY --from=build /app/package.json /app/package-lock.json ../
COPY --from=build /app/server/package.json ./package.json
COPY --from=build /app/node_modules ../node_modules
COPY --from=build /app/server/node_modules ./node_modules

# Artefacto de build del servidor (bundle ESM).
COPY --from=build /app/server/dist ./dist

# El cliente debe existir en <root>/client/dist porque app.ts lo resuelve
# como path.resolve(__dirname, '../../client/dist') desde server/dist/index.js.
COPY --from=build /app/client/dist ../client/dist

# Migraciones por si se quieren aplicar/inspeccionar dentro del contenedor.
COPY server/src/migrations ./src/migrations

# Carpeta de uploads escribible (bind mount en compose).
RUN mkdir -p /app/server/uploads && chown -R node:node /app

USER node

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
