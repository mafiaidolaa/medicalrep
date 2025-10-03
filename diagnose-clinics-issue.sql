-- ======================================
-- Diagnostic Queries for Clinics Issue
-- ======================================

-- 1. Check current user and their role
SELECT 
  'Current User Info' as query_name,
  auth.uid() as current_user_id,
  u.username,
  u.role,
  u.area,
  u.line,
  u.is_active
FROM public.users u
WHERE u.id = auth.uid();

-- 2. Check ALL clinics (using service role bypass)
-- Run this in SQL Editor with service role
SELECT 
  'All Clinics (Service Role)' as query_name,
  id,
  name,
  area,
  line,
  registered_by,
  registered_at
FROM public.clinics
ORDER BY name;

-- 3. Check users data
SELECT 
  'All Users' as query_name,
  id,
  username,
  role,
  area,
  line,
  is_active
FROM public.users
WHERE username IN ('ahmed', 'mo') OR role = 'admin'
ORDER BY username;

-- 4. Check current RLS policies
SELECT 
  'Current RLS Policies' as query_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  substring(qual::text, 1, 100) as qual_preview,
  substring(with_check::text, 1, 100) as with_check_preview
FROM pg_policies 
WHERE tablename = 'clinics'
ORDER BY policyname;

-- 5. Test visibility for specific users
-- Check if admin can see clinics
SELECT 
  'Admin Visibility Test' as query_name,
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  ) as is_admin,
  COUNT(*) as clinics_visible
FROM public.clinics;

-- 6. Check area/line matching
SELECT 
  'Area/Line Matching' as query_name,
  u.username,
  u.area as user_area,
  u.line as user_line,
  c.name as clinic_name,
  c.area as clinic_area,
  c.line as clinic_line,
  (u.area = c.area AND u.line = c.line) as area_line_match
FROM public.users u
CROSS JOIN public.clinics c
WHERE u.username IN ('ahmed', 'mo')
ORDER BY u.username, c.name;

-- 7. Check registered_by relationships
SELECT 
  'Registered By Relationships' as query_name,
  c.name as clinic_name,
  c.registered_by,
  u.username as registered_by_username,
  u.role as registered_by_role
FROM public.clinics c
LEFT JOIN public.users u ON c.registered_by = u.id
ORDER BY c.name;
