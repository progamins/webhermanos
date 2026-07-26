-- ════════════════════════════════════════════════════════════════
-- MAISON ROSAS — Kitchen v1.0
-- Columnas para el panel de cocina y temporizadores
-- ════════════════════════════════════════════════════════════════

ALTER TABLE orders
  ADD COLUMN status_entered_at TIMESTAMP NULL DEFAULT NULL AFTER assigned_stock_id,
  ADD COLUMN kitchen_notes TEXT DEFAULT NULL AFTER status_entered_at;
