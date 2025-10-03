-- ================================================
-- CRITICAL: Run these queries to diagnose the issue
-- ================================================
-- Copy each query one by one into Supabase SQL Editor

-- ================================================
-- Query 1: Check ALL clinics (bypasses RLS)
-- ================================================
SELECT 
  '🏥 ALL CLINICS IN DATABASE' as info,
  id,
  name,
  area,
  line,
  registered_by,
  created_at
FROM public.clinics
ORDER BY name;

-- Expected: Should show EPEG, mooo, and any other clinics
-- If this shows nothing, the clinics were deleted!

-- ================================================
-- Query 2: Check ALL users
-- ================================================
SELECT 
  '👥 ALL USERS' as info,
  id,
  username,
  role,
  area,
  line,
  is_active
FROM public.users
WHERE username IN ('ahmed', 'mo') OR role = 'admin'
ORDER BY username;

-- Expected: Should show admin, ahmed, and mo
-- Check that area and line are filled correctly

-- ================================================
-- Query 3: Check area/line matching
-- ================================================
SELECT 
  '🔗 AREA/LINE MATCHING' as info,
  u.username as user_name,
  u.area as user_area,
  u.line as user_line,
  c.name as clinic_name,
  c.area as clinic_area,
  c.line as clinic_line,
  CASE 
    WHEN u.area = c.area AND u.line = c.line THEN '✅ MATCH'
    ELSE '❌ NO MATCH'
  END as status
FROM public.users u
CROSS JOIN public.clinics c
WHERE u.username IN ('ahmed', 'mo')
ORDER BY u.username, c.name;

-- Expected: ahmed's area/line should match EPEG
--          mo's area/line should match mooo

-- ================================================
-- Query 4: Check RLS policies
-- ================================================
SELECT 
  '📋 RLS POLICIES' as info,
  policyname,
  cmd as command_type,
  CASE 
    WHEN policyname LIKE '%admin%' THEN '👨‍💼 Admin Policy'
    WHEN policyname LIKE '%user%' THEN '👤 User Policy'
    ELSE '❓ Unknown'
  END as policy_type
FROM pg_policies 
WHERE tablename = 'clinics' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Expected: Should show 7 policies:
--   2 SELECT policies (admin + user)
--   2 INSERT policies (admin + user)
--   2 UPDATE policies (admin + user)
--   1 DELETE policy (admin only)

-- ================================================
-- Query 5: Test if problem is with area/line format
-- ================================================
SELECT 
  '🔍 AREA/LINE FORMAT CHECK' as info,
  username,
  area,
  length(area) as area_length,
  line,
  length(line) as line_length,
  CASE 
    WHEN area ~ '^\s+|\s+$' THEN '⚠️ Has leading/trailing spaces'
    WHEN line ~ '^\s+|\s+$' THEN '⚠️ Has leading/trailing spaces'
    ELSE '✅ Clean'
  END as format_status
FROM public.users
WHERE username IN ('ahmed', 'mo')
UNION ALL
SELECT 
  '🔍 CLINIC FORMAT CHECK' as info,
  name as username,
  area,
  length(area) as area_length,
  line,
  length(line) as line_length,
  CASE 
    WHEN area ~ '^\s+|\s+$' THEN '⚠️ Has leading/trailing spaces'
    WHEN line ~ '^\s+|\s+$' THEN '⚠️ Has leading/trailing spaces'
    ELSE '✅ Clean'
  END as format_status
FROM public.clinics;

-- This checks for whitespace issues that might prevent matching

-- ================================================
-- SUMMARY QUERY - Run this last
-- ================================================
SELECT 
  '📊 SUMMARY' as info,
  (SELECT COUNT(*) FROM public.clinics) as total_clinics,
  (SELECT COUNT(*) FROM public.users WHERE role = 'admin' AND is_active = true) as active_admins,
  (SELECT COUNT(*) FROM public.users WHERE username IN ('ahmed', 'mo') AND is_active = true) as active_test_users,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'clinics') as rls_policies;

-- Expected:
--   total_clinics: at least 2 (EPEG + mooo)
--   active_admins: at least 1
--   active_test_users: 2 (ahmed + mo)
--   rls_policies: 7
