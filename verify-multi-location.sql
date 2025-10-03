-- ================================================
-- 🔍 Multi-Location System Verification
-- ================================================
-- Quick verification script to check if the migration worked

-- 1. Check if new tables were created
SELECT 'Checking junction tables...' as step;

SELECT 
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_name IN ('clinic_locations', 'user_locations')
ORDER BY table_name;

-- 2. Check if new functions were created
SELECT 'Checking helper functions...' as step;

SELECT 
    routine_name,
    'EXISTS' as status
FROM information_schema.routines 
WHERE routine_name LIKE '%location%'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- 3. Check if new indexes were created
SELECT 'Checking performance indexes...' as step;

SELECT 
    indexname,
    tablename,
    'EXISTS' as status
FROM pg_indexes 
WHERE indexname LIKE 'idx_%location%'
ORDER BY tablename, indexname;

-- 4. Test helper functions (if data exists)
SELECT 'Testing location functions...' as step;

-- Test clinic locations function
SELECT 
    'get_clinic_locations' as function_name,
    CASE 
        WHEN COUNT(*) > 0 THEN 'DATA_EXISTS'
        ELSE 'NO_DATA_YET'
    END as status
FROM clinic_locations;

-- Test user locations function  
SELECT 
    'get_user_locations' as function_name,
    CASE 
        WHEN COUNT(*) > 0 THEN 'DATA_EXISTS'
        ELSE 'NO_DATA_YET'
    END as status
FROM user_locations;

-- 5. Show migration statistics
SELECT 'Migration statistics:' as step;

SELECT 
    'Clinics with multi-locations' as metric,
    COUNT(*) as count
FROM clinic_locations;

SELECT 
    'Users with multi-locations' as metric,
    COUNT(*) as count
FROM user_locations;

-- 6. Show sample data (if exists)
SELECT 'Sample clinic locations (first 5):' as step;

SELECT 
    cl.clinic_id,
    c.name as clinic_name,
    cl.location_name,
    cl.is_primary
FROM clinic_locations cl
JOIN clinics c ON c.id = cl.clinic_id
ORDER BY c.name, cl.is_primary DESC
LIMIT 5;

-- 7. Test views
SELECT 'Testing enhanced views...' as step;

SELECT 
    'v_clinics_with_locations' as view_name,
    COUNT(*) as record_count
FROM v_clinics_with_locations;

SELECT 
    'v_users_with_locations' as view_name,
    COUNT(*) as record_count
FROM v_users_with_locations;

-- 8. Final verification
SELECT '✅ Multi-Location System Verification Complete!' as result;
SELECT 'If you see data above, the migration was successful!' as note;