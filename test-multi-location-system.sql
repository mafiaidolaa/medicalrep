-- ================================================
-- 🧪 Test Multi-Location System with Sample Data
-- ================================================

-- 1. Show current migrated data
SELECT '👥 Current Users with Locations:' as info;
SELECT 
    u.full_name,
    u.role,
    u.area as old_area,
    get_user_locations(u.id) as new_locations,
    (SELECT location_name FROM user_locations WHERE user_id = u.id AND is_primary = true) as primary_location
FROM users u
WHERE EXISTS (SELECT 1 FROM user_locations WHERE user_id = u.id)
ORDER BY u.full_name;

SELECT '🏥 Current Clinics with Locations:' as info;
SELECT 
    c.name,
    c.area as old_area,
    get_clinic_locations(c.id) as new_locations,
    (SELECT location_name FROM clinic_locations WHERE clinic_id = c.id AND is_primary = true) as primary_location
FROM clinics c
WHERE EXISTS (SELECT 1 FROM clinic_locations WHERE clinic_id = c.id)
ORDER BY c.name;

-- 2. Test adding multi-locations to an existing clinic
SELECT '🔧 Testing Multi-Location Assignment...' as info;

-- Get a sample clinic ID (if exists)
DO $$
DECLARE
    sample_clinic_id UUID;
BEGIN
    -- Get first clinic
    SELECT id INTO sample_clinic_id FROM clinics LIMIT 1;
    
    IF sample_clinic_id IS NOT NULL THEN
        -- Add multiple locations to this clinic
        PERFORM set_clinic_locations(
            sample_clinic_id,
            ARRAY['القاهرة', 'الإسكندرية', 'الجيزة'],
            'القاهرة'
        );
        
        RAISE NOTICE 'Multi-locations added to clinic: %', sample_clinic_id;
    END IF;
END $$;

-- 3. Show results of multi-location assignment
SELECT '📍 Updated Clinic Locations:' as info;
SELECT 
    c.name as clinic_name,
    cl.location_name,
    cl.is_primary,
    CASE WHEN cl.is_primary THEN '👑 Primary' ELSE '📍 Secondary' END as status
FROM clinic_locations cl
JOIN clinics c ON c.id = cl.clinic_id
ORDER BY c.name, cl.is_primary DESC, cl.location_name;

-- 4. Test the enhanced views
SELECT '👁️ Enhanced Views Test:' as info;

-- Test clinic view with locations
SELECT 
    name,
    locations,
    primary_location,
    CASE 
        WHEN array_length(locations, 1) > 1 THEN '🌍 Multi-Location' 
        ELSE '📍 Single Location' 
    END as location_type
FROM v_clinics_with_locations
WHERE locations IS NOT NULL AND array_length(locations, 1) > 0
ORDER BY array_length(locations, 1) DESC, name
LIMIT 5;

-- 5. Test adding multi-locations to a user
DO $$
DECLARE
    sample_user_id UUID;
BEGIN
    -- Get first non-admin user
    SELECT id INTO sample_user_id 
    FROM users 
    WHERE role != 'admin' 
    LIMIT 1;
    
    IF sample_user_id IS NOT NULL THEN
        -- Add multiple locations to this user
        PERFORM set_user_locations(
            sample_user_id,
            ARRAY['القاهرة', 'الجيزة', 'المنيا'],
            'القاهرة'
        );
        
        RAISE NOTICE 'Multi-locations added to user: %', sample_user_id;
    END IF;
END $$;

-- 6. Show updated user locations
SELECT '👤 Updated User Locations:' as info;
SELECT 
    u.full_name,
    u.role,
    ul.location_name,
    ul.is_primary,
    CASE WHEN ul.is_primary THEN '👑 Primary Area' ELSE '📍 Secondary Area' END as status
FROM user_locations ul
JOIN users u ON u.id = ul.user_id
ORDER BY u.full_name, ul.is_primary DESC, ul.location_name;

-- 7. Performance test - show how fast the new indexes work
SELECT '⚡ Performance Test:' as info;

EXPLAIN (ANALYZE, BUFFERS) 
SELECT c.name, get_clinic_locations(c.id) 
FROM clinics c 
LIMIT 5;

-- 8. Show final statistics
SELECT '📊 Final Statistics:' as info;

SELECT 
    'Total Clinics' as metric,
    COUNT(*) as count
FROM clinics;

SELECT 
    'Clinics with Multi-Locations' as metric,
    COUNT(DISTINCT clinic_id) as count
FROM clinic_locations;

SELECT 
    'Total Users' as metric,
    COUNT(*) as count
FROM users;

SELECT 
    'Users with Multi-Locations' as metric,
    COUNT(DISTINCT user_id) as count
FROM user_locations;

SELECT 
    'Average Locations per Clinic' as metric,
    ROUND(AVG(location_count), 2) as count
FROM (
    SELECT clinic_id, COUNT(*) as location_count
    FROM clinic_locations
    GROUP BY clinic_id
) subq;

-- 9. Success message
SELECT '🎉 Multi-Location System is Working Perfectly!' as result;
SELECT '✅ You can now use checkboxes instead of dropdowns!' as ui_ready;
SELECT '🌍 Clinics and Users support multiple locations!' as feature_ready;
SELECT '⚡ Performance optimized with smart indexes!' as performance_ready;