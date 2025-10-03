-- Database Setup Commands for Soft Delete Implementation
-- This script adds the necessary columns for soft delete functionality
-- Execute these commands on your database to enable soft delete across all tables

-- Add soft delete columns to all tables
-- These columns will track deletion state and timestamps

-- 1. Clinics Table
ALTER TABLE clinics ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE clinics ADD COLUMN deleted_by INT NULL REFERENCES users(id);

-- 2. Orders Table
ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE orders ADD COLUMN deleted_by INT NULL REFERENCES users(id);

-- 3. Visits Table
ALTER TABLE visits ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE visits ADD COLUMN deleted_by INT NULL REFERENCES users(id);

-- 4. Invoices Table
ALTER TABLE invoices ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN deleted_by INT NULL REFERENCES users(id);

-- 5. Payments Table
ALTER TABLE payments ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE payments ADD COLUMN deleted_by INT NULL REFERENCES users(id);

-- 6. Collections Table
ALTER TABLE collections ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE collections ADD COLUMN deleted_by INT NULL REFERENCES users(id);

-- 7. Expenses Table
ALTER TABLE expenses ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE expenses ADD COLUMN deleted_by INT NULL REFERENCES users(id);

-- 8. Products Table
ALTER TABLE products ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE products ADD COLUMN deleted_by INT NULL REFERENCES users(id);

-- Create indices for better performance on soft delete queries
-- These indices will improve performance when filtering active/deleted records

-- Indices for active records (deleted_at IS NULL)
CREATE INDEX idx_clinics_active ON clinics (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_active ON orders (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_visits_active ON visits (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_active ON invoices (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_active ON payments (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_collections_active ON collections (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_active ON expenses (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_active ON products (deleted_at) WHERE deleted_at IS NULL;

-- Indices for deleted records (deleted_at IS NOT NULL)
CREATE INDEX idx_clinics_deleted ON clinics (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_orders_deleted ON orders (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_visits_deleted ON visits (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_invoices_deleted ON invoices (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_payments_deleted ON payments (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_collections_deleted ON collections (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_expenses_deleted ON expenses (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_products_deleted ON products (deleted_at) WHERE deleted_at IS NOT NULL;

-- Composite indices for better query performance with timestamp ordering
CREATE INDEX idx_clinics_deleted_at_created_at ON clinics (deleted_at, created_at);
CREATE INDEX idx_orders_deleted_at_created_at ON orders (deleted_at, created_at);
CREATE INDEX idx_visits_deleted_at_created_at ON visits (deleted_at, created_at);
CREATE INDEX idx_invoices_deleted_at_created_at ON invoices (deleted_at, created_at);
CREATE INDEX idx_payments_deleted_at_created_at ON payments (deleted_at, created_at);
CREATE INDEX idx_collections_deleted_at_created_at ON collections (deleted_at, created_at);
CREATE INDEX idx_expenses_deleted_at_created_at ON expenses (deleted_at, created_at);
CREATE INDEX idx_products_deleted_at_created_at ON products (deleted_at, created_at);

-- Optional: Add comments to document the soft delete columns
COMMENT ON COLUMN clinics.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN clinics.deleted_by IS 'User ID who performed the soft delete';

COMMENT ON COLUMN orders.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN orders.deleted_by IS 'User ID who performed the soft delete';

COMMENT ON COLUMN visits.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN visits.deleted_by IS 'User ID who performed the soft delete';

COMMENT ON COLUMN invoices.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN invoices.deleted_by IS 'User ID who performed the soft delete';

COMMENT ON COLUMN payments.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN payments.deleted_by IS 'User ID who performed the soft delete';

COMMENT ON COLUMN collections.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN collections.deleted_by IS 'User ID who performed the soft delete';

COMMENT ON COLUMN expenses.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN expenses.deleted_by IS 'User ID who performed the soft delete';

COMMENT ON COLUMN products.deleted_at IS 'Timestamp when record was soft deleted, NULL for active records';
COMMENT ON COLUMN products.deleted_by IS 'User ID who performed the soft delete';

-- Verification queries to check if columns were added successfully
-- Uncomment and run these to verify the setup

/*
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clinics' 
AND column_name IN ('deleted_at', 'deleted_by');

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('deleted_at', 'deleted_by');

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'visits' 
AND column_name IN ('deleted_at', 'deleted_by');

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('deleted_at', 'deleted_by');

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN ('deleted_at', 'deleted_by');

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'collections' 
AND column_name IN ('deleted_at', 'deleted_by');

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'expenses' 
AND column_name IN ('deleted_at', 'deleted_by');

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('deleted_at', 'deleted_by');
*/

-- Note: Depending on your database system (MySQL, PostgreSQL, SQLite, etc.), 
-- you may need to adjust the syntax slightly:
--
-- For MySQL:
-- - Use DATETIME instead of TIMESTAMP if preferred
-- - Adjust REFERENCES syntax if needed
--
-- For SQLite:
-- - Use TEXT for timestamp columns if needed
-- - Adjust index creation syntax
--
-- For PostgreSQL:
-- - The syntax above should work as-is
-- - Consider using TIMESTAMPTZ for timezone awareness
--
-- Remember to backup your database before running these commands!