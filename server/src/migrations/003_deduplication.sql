-- ════════════════════════════════════════════════════════════════
-- MAISON ROSAS — Migration v3: Deduplication & Content Hashing
-- ════════════════════════════════════════════════════════════════
-- Añade columna content_hash (SHA256) para identificar
-- archivos duplicados por contenido, no solo por nombre.
--
-- SHA256 produce strings de 64 caracteres hex.
-- El índice único evita inserts duplicados a nivel BD.

ALTER TABLE uploads
  ADD COLUMN content_hash VARCHAR(64) DEFAULT NULL
  AFTER url;

CREATE INDEX idx_uploads_content_hash ON uploads(content_hash);
