-- ════════════════════════════════════════════════════════════════
-- MAISON ROSAS — Migration v2: Optimization & Indexing
-- ════════════════════════════════════════════════════════════════
-- MySQL 8.4 does not support CREATE INDEX IF NOT EXISTS.
-- Each migration runs only once, so plain CREATE INDEX is safe.

-- 1. PRODUCTS: Index for category filtering + active status + date sorting
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_created ON products(created_at DESC);

-- 2. ORDERS: Index for common queries
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);

-- 3. REVIEWS: Index for filtering + sorting
CREATE INDEX idx_reviews_approved ON reviews(approved);
CREATE INDEX idx_reviews_date ON reviews(date DESC);
CREATE INDEX idx_reviews_cake_model ON reviews(cake_model);

-- 4. GALLERY: Index for category + date
CREATE INDEX idx_gallery_category ON gallery(category);
CREATE INDEX idx_gallery_date ON gallery(date DESC);

-- 5. UPLOADS: Index for filename lookups + uploaded_by
CREATE INDEX idx_uploads_filename ON uploads(filename);
CREATE INDEX idx_uploads_uploaded_by ON uploads(uploaded_by);
CREATE INDEX idx_uploads_created ON uploads(created_at DESC);

-- 6. ADMIN SESSIONS: Index for cleanup
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX idx_admin_sessions_role ON admin_sessions(role);

-- 7. CONTACT MESSAGES: Index for read/unread filtering
CREATE INDEX idx_contact_read ON contact_messages(`read`);
CREATE INDEX idx_contact_created ON contact_messages(created_at DESC);

-- 8. CAKE STOCK: Index for date ordering
CREATE INDEX idx_cake_stock_created ON cake_stock(created_at DESC);

-- 9. ORDER TIMELINE: Index for date ordering
CREATE INDEX idx_timeline_created ON order_timeline(created_at DESC);

-- 10. ACTIVITY LOGS: Additional index for action + role filtering
CREATE INDEX idx_activity_action ON activity_logs(action);
CREATE INDEX idx_activity_role ON activity_logs(role);

-- 11. OTP CODES: Index for expiration cleanup + used status
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);
CREATE INDEX idx_otp_used ON otp_codes(used);
