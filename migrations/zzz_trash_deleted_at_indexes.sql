-- Create indexes on deleted_at to speed up trash queries and counts
-- Run this once on your database (Supabase SQL editor or migration runner)

CREATE INDEX IF NOT EXISTS idx_clinics_deleted_at ON clinics (deleted_at);
CREATE INDEX IF NOT EXISTS idx_clinics_is_active ON clinics (is_active);

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);

CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders (deleted_at);
CREATE INDEX IF NOT EXISTS idx_visits_deleted_at ON visits (deleted_at);
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices (deleted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses (deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products (deleted_at);
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments (deleted_at);
CREATE INDEX IF NOT EXISTS idx_collections_deleted_at ON collections (deleted_at);
