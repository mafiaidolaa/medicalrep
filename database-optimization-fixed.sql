-- ================================================
-- 🚀 Database Performance Optimization for EP Group (FIXED)
-- ================================================
-- Run this after cleanup to optimize database performance

-- ================================================
-- 1. ANALYZE AND UPDATE STATISTICS
-- ================================================
ANALYZE;

-- ================================================
-- 2. ADD PERFORMANCE INDEXES (without CONCURRENTLY)
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
ON orders(status, order_date DESC);

CREATE INDEX IF NOT EXISTS idx_orders_clinic_date 
ON orders(clinic_id, order_date DESC);

-- Stock movements optimizations (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
        CREATE INDEX IF NOT EXISTS idx_stock_movements_product_recent 
        ON stock_movements(product_id, movement_date DESC) 
        WHERE movement_date >= CURRENT_DATE - INTERVAL '30 days';
    END IF;
END
$$;

-- ================================================
-- 3. VACUUM AND REINDEX (separate from transaction)
-- ================================================

-- Note: VACUUM and REINDEX will be run separately
-- Full vacuum to reclaim space and update statistics
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
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
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

-- View for slow queries identification
CREATE OR REPLACE VIEW v_table_stats_summary AS
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
        WHEN t.seq_scan > t.idx_scan THEN 'Needs Index'
        WHEN t.idx_scan > t.seq_scan * 10 THEN 'Well Indexed'
        ELSE 'OK'
    END as recommendation
FROM pg_stat_user_tables t
ORDER BY t.seq_tup_read DESC;

-- ================================================
-- 5. SUCCESS MESSAGE
-- ================================================
SELECT '🚀 Database optimization completed! Performance should be improved.' as result;

-- ================================================
-- 6. PERFORMANCE RECOMMENDATIONS
-- ================================================
SELECT '📊 Run these queries to monitor performance:' as info;
SELECT '   SELECT * FROM v_performance_stats;' as monitor_query;
SELECT '   SELECT * FROM v_table_sizes;' as size_query;
SELECT '   SELECT * FROM v_table_stats_summary;' as summary_query;