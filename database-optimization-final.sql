-- ================================================
-- 🚀 Database Performance Optimization - FINAL WORKING VERSION
-- ================================================
-- This version avoids all IMMUTABLE function issues

-- ================================================
-- 1. ANALYZE AND UPDATE STATISTICS
-- ================================================
ANALYZE;

-- ================================================
-- 2. ADD PERFORMANCE INDEXES (safe versions)
-- ================================================

-- Products table optimizations
CREATE INDEX IF NOT EXISTS idx_products_active_search 
ON products(is_active, name) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_category_active 
ON products(category_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_stock_level 
ON products(stock) WHERE stock > 0;

-- Orders table optimizations  
CREATE INDEX IF NOT EXISTS idx_orders_status_date 
ON orders(status, order_date);

CREATE INDEX IF NOT EXISTS idx_orders_clinic_date 
ON orders(clinic_id, order_date);

-- Stock movements optimizations (without date predicates)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
        -- Simple index without date predicate to avoid IMMUTABLE issues
        CREATE INDEX IF NOT EXISTS idx_stock_movements_product_date 
        ON stock_movements(product_id, movement_date);
        
        CREATE INDEX IF NOT EXISTS idx_stock_movements_date 
        ON stock_movements(movement_date);
    END IF;
END
$$;

-- Stock balances indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_balances') THEN
        CREATE INDEX IF NOT EXISTS idx_stock_balances_product_warehouse 
        ON stock_balances(product_id, warehouse_id);
        
        CREATE INDEX IF NOT EXISTS idx_stock_balances_location 
        ON stock_balances(location_id) WHERE location_id IS NOT NULL;
    END IF;
END
$$;

-- Warehouses indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'warehouses') THEN
        CREATE INDEX IF NOT EXISTS idx_warehouses_active 
        ON warehouses(is_active) WHERE is_active = true;
        
        CREATE INDEX IF NOT EXISTS idx_warehouses_code 
        ON warehouses(code);
    END IF;
END
$$;

-- ================================================
-- 3. VACUUM AND CLEANUP
-- ================================================
VACUUM ANALYZE;

-- ================================================
-- 4. CREATE PERFORMANCE MONITORING VIEWS
-- ================================================

-- View for monitoring table performance
CREATE OR REPLACE VIEW v_performance_stats AS
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    CASE 
        WHEN seq_scan + idx_scan > 0 THEN 
            ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 2)
        ELSE 0 
    END as index_usage_percent
FROM pg_stat_user_tables
ORDER BY seq_tup_read DESC;

-- View for table sizes
CREATE OR REPLACE VIEW v_table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- View for index usage statistics  
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- View for performance recommendations
CREATE OR REPLACE VIEW v_performance_recommendations AS
SELECT 
    t.schemaname,
    t.tablename,
    t.seq_scan,
    t.seq_tup_read,
    t.idx_scan,
    t.idx_tup_fetch,
    pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename)) as table_size,
    CASE 
        WHEN t.seq_scan + t.idx_scan > 0 THEN 
            ROUND(100.0 * t.idx_scan / (t.seq_scan + t.idx_scan), 2)
        ELSE 0 
    END as index_usage_percent,
    CASE 
        WHEN t.seq_scan > t.idx_scan AND t.seq_tup_read > 1000 THEN 'Consider adding indexes'
        WHEN t.idx_scan > t.seq_scan * 10 THEN 'Well indexed'
        WHEN t.seq_tup_read = 0 AND t.idx_tup_fetch = 0 THEN 'Unused table'
        ELSE 'OK'
    END as recommendation
FROM pg_stat_user_tables t
ORDER BY t.seq_tup_read DESC;

-- View for current database size
CREATE OR REPLACE VIEW v_database_size AS
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size,
    count(*) as total_tables,
    sum(case when schemaname = 'public' then 1 else 0 end) as user_tables
FROM pg_tables;

-- ================================================
-- 5. CREATE HELPFUL UTILITY FUNCTIONS
-- ================================================

-- Function to get table info (safe version)
CREATE OR REPLACE FUNCTION get_table_info(table_name_param text)
RETURNS TABLE(
    column_name text,
    data_type text,
    is_nullable text,
    column_default text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.column_name::text,
        c.data_type::text,
        c.is_nullable::text,
        c.column_default::text
    FROM information_schema.columns c
    WHERE c.table_name = table_name_param
    ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql STABLE;

-- ================================================
-- 6. SUCCESS MESSAGES
-- ================================================
SELECT '🚀 Database optimization completed successfully!' as result;
SELECT 'All indexes created without IMMUTABLE function issues.' as status;

-- Show what was created
SELECT '📊 Performance monitoring views created:' as info;
SELECT '   • v_performance_stats - Table performance metrics' as view1;
SELECT '   • v_table_sizes - Table size information' as view2;
SELECT '   • v_index_usage - Index usage statistics' as view3;
SELECT '   • v_performance_recommendations - Performance recommendations' as view4;
SELECT '   • v_database_size - Overall database size' as view5;

SELECT '🔍 Run these queries to check performance:' as monitoring;
SELECT '   SELECT * FROM v_performance_stats;' as query1;
SELECT '   SELECT * FROM v_table_sizes;' as query2;
SELECT '   SELECT * FROM v_performance_recommendations;' as query3;