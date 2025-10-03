-- ================================================
-- 🧹 Database Performance Optimization - PART 2 (Maintenance)
-- ================================================
-- Run this AFTER Part 1 - contains VACUUM and maintenance commands
-- ⚠️  Important: These commands MUST be run outside of a transaction block
-- ⚠️  Run each command separately or ensure autocommit is ON

-- ================================================
-- 1. ANALYZE ALL TABLES FOR UPDATED STATISTICS
-- ================================================
ANALYZE;

-- ================================================
-- 2. VACUUM ALL TABLES (MUST RUN OUTSIDE TRANSACTION)
-- ================================================
-- ⚠️  Make sure autocommit is ON before running these commands
-- ⚠️  Or run each VACUUM command separately

-- Vacuum main tables
VACUUM ANALYZE products;
VACUUM ANALYZE orders;
VACUUM ANALYZE order_items;
VACUUM ANALYZE clinics;
VACUUM ANALYZE categories;
VACUUM ANALYZE users;

-- Vacuum additional tables if they exist
-- Note: These will only run if tables exist
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Check and vacuum stock_movements if exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
        EXECUTE 'VACUUM ANALYZE stock_movements';
    END IF;
    
    -- Check and vacuum stock_balances if exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_balances') THEN
        EXECUTE 'VACUUM ANALYZE stock_balances';
    END IF;
    
    -- Check and vacuum warehouses if exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'warehouses') THEN
        EXECUTE 'VACUUM ANALYZE warehouses';
    END IF;
    
    -- Check and vacuum inventory_transactions if exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_transactions') THEN
        EXECUTE 'VACUUM ANALYZE inventory_transactions';
    END IF;
    
    -- Check and vacuum audit_log if exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_log') THEN
        EXECUTE 'VACUUM ANALYZE audit_log';
    END IF;
END $$;