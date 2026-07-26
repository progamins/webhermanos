-- ════════════════════════════════════════════════════════════════
-- MAISON ROSAS — File data storage v1.0
-- Columna MEDIUMBLOB para almacenar datos de archivos en BD
-- (solución para Vercel sin Blob, donde /tmp es efímero)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE uploads
  ADD COLUMN file_data MEDIUMBLOB DEFAULT NULL AFTER content_hash;
