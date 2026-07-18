-- ════════════════════════════════════════════════════════════════
-- MAISON ROSAS — MySQL Schema v1.0
-- Pastelería de Autor & Repostería Fina
-- ════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ───────────────────────────────────────────────────────────────
-- 1. PRODUCTS — Catálogo de pasteles
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  category VARCHAR(100) NOT NULL DEFAULT 'Especiales',
  preparation_time VARCHAR(50) DEFAULT '48 horas',
  active TINYINT(1) NOT NULL DEFAULT 1,
  stock TINYINT(1) NOT NULL DEFAULT 1,
  images JSON DEFAULT '[]',
  flavors JSON DEFAULT '[]',
  decorations JSON DEFAULT '[]',
  tags JSON DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────
-- 2. REVIEWS — Reseñas de clientes
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(36) PRIMARY KEY,
  author VARCHAR(150) NOT NULL,
  role VARCHAR(100) DEFAULT NULL,
  rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  cake_model VARCHAR(200) DEFAULT NULL,
  date DATE NOT NULL,
  approved TINYINT(1) NOT NULL DEFAULT 0,
  response TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────
-- 3. GALLERY — Galería de imágenes
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery (
  id VARCHAR(36) PRIMARY KEY,
  image_url VARCHAR(500) NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(100) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  date DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────
-- 4. CONFIG — Configuración de la aplicación (clave-valor)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config (
  config_key VARCHAR(100) PRIMARY KEY,
  config_value JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────
-- 5. ORDERS — Pedidos de clientes
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY,
  tracking_code VARCHAR(10) NOT NULL UNIQUE,
  customer_name VARCHAR(200) NOT NULL,
  customer_email VARCHAR(200) NOT NULL,
  customer_phone VARCHAR(20) DEFAULT NULL,
  customer_age VARCHAR(10) DEFAULT NULL,
  product_name VARCHAR(200) NOT NULL,
  product_id VARCHAR(36) DEFAULT NULL,
  size VARCHAR(100) NOT NULL,
  flavor VARCHAR(200) NOT NULL,
  selected_decoration VARCHAR(200) DEFAULT NULL,
  custom_color VARCHAR(50) DEFAULT NULL,
  theme VARCHAR(200) DEFAULT NULL,
  message TEXT DEFAULT NULL,
  celebrated_name VARCHAR(200) DEFAULT NULL,
  special_notes TEXT DEFAULT NULL,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('Pendiente','Confirmado','Preparando','Decoración','Listo','En camino','Entregado','Cancelado') NOT NULL DEFAULT 'Pendiente',
  cancel_reason TEXT DEFAULT NULL,
  delivery_type ENUM('recojo','domicilio') NOT NULL DEFAULT 'recojo',
  delivery_date DATE DEFAULT NULL,
  delivery_time VARCHAR(20) DEFAULT NULL,
  delivery_address TEXT DEFAULT NULL,
  whatsapp_message TEXT DEFAULT NULL,
  payment_status ENUM('pendiente','confirmado','rechazado','parcial') DEFAULT 'pendiente',
  payment_method ENUM('Yape','Plin','Transferencia','Efectivo','Ninguno') DEFAULT 'Ninguno',
  monto_pagado DECIMAL(10,2) DEFAULT 0,
  fecha_pago DATE DEFAULT NULL,
  confirmed_by_admin VARCHAR(100) DEFAULT NULL,
  voucher_url VARCHAR(500) DEFAULT NULL,
  voucher_name VARCHAR(200) DEFAULT NULL,
  voucher_uploaded_at TIMESTAMP NULL DEFAULT NULL,
  fulfilled_from_stock TINYINT(1) DEFAULT 0,
  assigned_stock_id VARCHAR(36) DEFAULT NULL,
  progress_photos JSON DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────
-- 6. ORDER_TIMELINE — Historial de cambios de estado
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_timeline (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  previous_status VARCHAR(50) DEFAULT NULL,
  new_status VARCHAR(50) NOT NULL,
  changed_by VARCHAR(100) DEFAULT 'system',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────
-- 7. CAKE_STOCK — Inventario de pasteles físicos
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cake_stock (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  product_id VARCHAR(36) DEFAULT NULL,
  flavor VARCHAR(200) NOT NULL,
  size VARCHAR(100) NOT NULL,
  decoration VARCHAR(200) DEFAULT NULL,
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT DEFAULT NULL,
  image_url VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────
-- 8. ADMIN_SESSIONS — Sesiones de administradores
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_sessions (
  token VARCHAR(36) PRIMARY KEY,
  role ENUM('admin','analyst','stock_manager') NOT NULL DEFAULT 'admin',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────
-- 9. ADMIN_AUTH — Credenciales de roles admin
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_auth (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  active_session_token VARCHAR(36) DEFAULT NULL,
  credentials_emailed TINYINT(1) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────
-- 10. ACTIVITY_LOGS — Registro de actividades admin
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(36) PRIMARY KEY,
  action VARCHAR(200) NOT NULL,
  details TEXT DEFAULT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────
-- 11. OTP_CODES — Códigos de verificación para tracking
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(200) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_email (email),
  INDEX idx_otp_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────
-- 12. CONTACT_MESSAGES — Mensajes del formulario de contacto
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) DEFAULT NULL,
  message TEXT NOT NULL,
  `read` TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────────────────────────────────────────
-- 13. UPLOADS — Registro de archivos subidos
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS uploads (
  id VARCHAR(36) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) DEFAULT NULL,
  size_bytes BIGINT DEFAULT 0,
  url VARCHAR(500) NOT NULL,
  uploaded_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
