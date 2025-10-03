-- ================================================
-- Stock Management System - Verification Script
-- ================================================
-- Use this to verify that all tables were created successfully

-- Check all stock management tables exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN (
    'product_stock_config',
    'warehouses',
    'warehouse_zones', 
    'warehouse_locations',
    'stock_balances',
    'stock_movements',
    'stock_transactions',
    'stock_batches',
    'stock_serials',
    'stock_adjustments',
    'stock_reorder_recommendations',
    'stock_alerts',
    'stock_transfer_orders',
    'stock_allocation_rules',
    'stock_audit_logs'
)
ORDER BY tablename;

-- Check indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename LIKE '%stock%' OR tablename LIKE '%warehouse%'
ORDER BY tablename, indexname;

-- Check triggers
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_table LIKE '%stock%' OR event_object_table LIKE '%warehouse%'
ORDER BY event_object_table, trigger_name;

-- Check functions related to stock
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name LIKE '%stock%' OR routine_name LIKE '%warehouse%'
ORDER BY routine_name;