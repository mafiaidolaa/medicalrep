-- ================================================
-- Verification Script for Migration Success
-- Run this in Supabase SQL Editor
-- ================================================

-- Test 1: Check if is_public column exists
SELECT 
    'Test 1: is_public column' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'system_settings' 
              AND column_name = 'is_public'
              AND data_type = 'boolean'
        ) THEN '✅ PASSED'
        ELSE '❌ FAILED'
    END as result;

-- Test 2: Check if areas and lines exist and are public
SELECT 
    'Test 2: Areas & Lines data' as test_name,
    CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM system_settings 
            WHERE setting_key IN ('app_areas', 'app_lines') 
              AND is_public = true
              AND is_enabled = true
        ) = 2 THEN '✅ PASSED'
        ELSE '❌ FAILED'
    END as result;

-- Test 3: Check RLS policy for public settings
SELECT 
    'Test 3: RLS Public Policy' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_policies 
            WHERE tablename = 'system_settings' 
              AND policyname = 'Public can read public settings'
        ) THEN '✅ PASSED'
        ELSE '❌ FAILED'
    END as result;

-- Test 4: Check if get_public_settings function exists
SELECT 
    'Test 4: get_public_settings()' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
              AND p.proname = 'get_public_settings'
        ) THEN '✅ PASSED'
        ELSE '❌ FAILED'
    END as result;

-- Test 5: Check index on is_public
SELECT 
    'Test 5: Index on is_public' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'system_settings' 
              AND indexname = 'idx_system_settings_is_public'
        ) THEN '✅ PASSED'
        ELSE '❌ FAILED'
    END as result;

-- Show actual areas and lines data
SELECT 
    '=== AREAS & LINES DATA ===' as info;

SELECT 
    setting_key,
    setting_value,
    is_public,
    is_enabled,
    category
FROM system_settings
WHERE setting_key IN ('app_areas', 'app_lines')
ORDER BY setting_key;

-- Test the get_public_settings function
SELECT 
    '=== TEST get_public_settings() ===' as info;

SELECT * FROM get_public_settings();

-- Show all RLS policies on system_settings
SELECT 
    '=== ALL RLS POLICIES ===' as info;

SELECT 
    policyname,
    cmd as operation,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Read'
        WHEN cmd = 'INSERT' THEN 'Create'
        WHEN cmd = 'UPDATE' THEN 'Update'
        WHEN cmd = 'DELETE' THEN 'Delete'
    END as description
FROM pg_policies 
WHERE tablename = 'system_settings'
ORDER BY cmd, policyname;
