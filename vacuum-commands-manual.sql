-- ================================================
-- 🧹 VACUUM Commands - Manual Execution Only
-- ================================================
-- ⚠️  IMPORTANT: Run each command INDIVIDUALLY in your SQL client
-- ⚠️  DO NOT run this file as a script - copy/paste each command separately
-- ⚠️  Make sure AUTOCOMMIT is ON in your SQL client

-- ================================================
-- COPY AND RUN EACH COMMAND INDIVIDUALLY:
-- ================================================

-- Step 1: Update statistics first
ANALYZE;

-- Step 2: Vacuum main tables (run each separately)
VACUUM ANALYZE products;

VACUUM ANALYZE orders;

VACUUM ANALYZE order_items;

VACUUM ANALYZE clinics;

VACUUM ANALYZE categories;

VACUUM ANALYZE users;

-- Step 3: Check if additional tables exist and vacuum them
-- Only run these if the tables exist in your database

-- For stock_movements (if exists):
-- VACUUM ANALYZE stock_movements;

-- For stock_balances (if exists):
-- VACUUM ANALYZE stock_balances;

-- For warehouses (if exists):
-- VACUUM ANALYZE warehouses;

-- For inventory_transactions (if exists):
-- VACUUM ANALYZE inventory_transactions;

-- For audit_log (if exists):
-- VACUUM ANALYZE audit_log;

-- ================================================
-- VERIFICATION QUERIES (safe to run together)
-- ================================================

-- Check what tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check performance after vacuum
SELECT * FROM v_performance_stats;

-- Check database size
SELECT * FROM v_database_size;