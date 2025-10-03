-- ================================================
-- 🚀 Database Performance Optimization - PART 1 (FIXED)
-- ================================================
-- PostgreSQL Compatible Version - Fixed column name issues

-- ================================================
-- 1. ANALYZE STATISTICS
-- ================================================
ANALYZE;

-- ================================================
-- 2. ADD PERFORMANCE INDEXES
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

-- Stock movements optimizations (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
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
-- 3. CREATE PERFORMANCE MONITORING VIEWS
-- ================================================

-- View for monitoring table performance
CREATE OR REPLACE VIEW v_performance_stats AS
SELECT 
    schemaname,
    relname as tablename,
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
    relname as tablename,
    indexrelname as indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelname::regclass)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- View for performance recommendations
CREATE OR REPLACE VIEW v_performance_recommendations AS
SELECT 
    t.schemaname,
    t.relname as tablename,
    t.seq_scan,
    t.seq_tup_read,
    t.idx_scan,
    t.idx_tup_fetch,
    pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.relname)) as table_size,
    CASE 
        WHEN t.seq_scan + t.idx_scan > 0 THEN 
            ROUND(100.0 * t.idx_scan / (seq_scan + idx_scan), 2)
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

-- Simple database size view (avoiding complex joins)
CREATE OR REPLACE VIEW v_database_size AS
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size,
    (SELECT count(*) FROM pg_tables WHERE schemaname = 'public') as user_tables,
    (SELECT count(*) FROM pg_tables) as total_tables;

-- ================================================
-- 4. CREATE UTILITY FUNCTION
-- ================================================

-- Function to get table info
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
-- 5. SUCCESS MESSAGES
-- ================================================
SELECT '🚀 Part 1 FIXED completed! Indexes and views created successfully!' as result;
SELECT '📊 Performance monitoring views available:' as info;
SELECT '   • v_performance_stats' as view1;
SELECT '   • v_table_sizes' as view2;
SELECT '   • v_index_usage' as view3;
SELECT '   • v_performance_recommendations' as view4;
SELECT '   • v_database_size' as view5;
SELECT '🔧 Next: Run database-optimization-part2.sql to complete optimization' as next_step;