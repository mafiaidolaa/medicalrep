-- ======================================
-- Verification Script
-- ======================================
-- Run this to verify everything is set up correctly

-- 1. Check RLS Policies for clinics
SELECT 
    '🔒 RLS Policies for Clinics' as check_type,
    policyname as policy_name,
    cmd as command_type
FROM pg_policies 
WHERE tablename = 'clinics' AND schemaname = 'public'
ORDER BY policyname;

-- 2. Check if manager_id column exists in users table
SELECT 
    '👥 Users Table Columns' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name IN ('manager_id', 'is_active')
ORDER BY column_name;

-- 3. Check if user_hierarchy view exists
SELECT 
    '👁️ Views' as check_type,
    table_name as view_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name = 'user_hierarchy';

-- 4. Check indexes
SELECT 
    '📊 Indexes' as check_type,
    indexname as index_name,
    tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'users'
AND indexname = 'idx_users_manager_id';

-- Expected Results:
-- ✅ Should see 7 policies for clinics
-- ✅ Should see manager_id and is_active columns
-- ✅ Should see user_hierarchy view
-- ✅ Should see idx_users_manager_id index