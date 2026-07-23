-- ════════════════════════════════════════════════════════════════
-- MAISON ROSAS — Migration v4: UNIQUE INDEX on content_hash
-- ════════════════════════════════════════════════════════════════
-- Agrega un índice ÚNICO sobre content_hash para que la BD
-- rechace cualquier intento de insertar un archivo duplicado.
--
-- Esto es una capa de seguridad adicional: el código de aplicación
-- (upload.routes.ts, StorageService) ya previene duplicados antes
-- de escribir, pero el UNIQUE INDEX garantiza que aunque haya un
-- bug o race condition, la BD no permitirá duplicados.
--
-- Nota: Usamos un nombre diferente (idx_uploads_content_hash_unique)
-- en lugar de dropear el índice regular existente, porque MySQL
-- no soporta 'DROP INDEX IF EXISTS' de forma nativa y el migration
-- runner solo captura errores 1061 (duplicate key), no 1091.

START TRANSACTION;

-- ── Paso 1: Limpiar duplicados existentes en content_hash ──
-- Conservamos el registro más antiguo de cada grupo duplicado
-- y eliminamos los más recientes.
DELETE t1 FROM uploads t1
INNER JOIN uploads t2
WHERE
  t1.id > t2.id
  AND t1.content_hash IS NOT NULL
  AND t1.content_hash = t2.content_hash;

-- ── Paso 2: Crear UNIQUE INDEX ──
-- MySQL 8.4 permite múltiples NULLs en un UNIQUE INDEX,
-- así que los registros pre-migración (content_hash IS NULL)
-- no se ven afectados.
-- Usamos nombre único para no entrar en conflicto con el índice
-- regular idx_uploads_content_hash creado en 002_optimize.sql.
CREATE UNIQUE INDEX idx_uploads_content_hash_unique ON uploads(content_hash);

COMMIT;
