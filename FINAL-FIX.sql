-- ===============================================
-- FINAL COMPREHENSIVE FIX
-- ===============================================
-- This fixes ALL issues with clinics visibility

-- Step 1: Show current state
SELECT 
  '📊 CURRENT STATE' as info,
  'Before normalization' as status;

SELECT 
  'Users State' as category,
  username,
  role,
  area,
  line
FROM public.users
WHERE username IN ('ahmed', 'mo') OR role = 'admin';

SELECT 
  'Clinics State' as category,
  name,
  area,
  line
FROM public.clinics;

-- Step 2: Normalize ALL data to use consistent values
-- This ensures everything matches perfectly

-- First, let's standardize to Arabic names that match the code defaults
UPDATE public.clinics
SET 
  area = CASE 
    WHEN area ILIKE '%north%' OR area ILIKE '%شمال%' THEN 'القاهرة'
    WHEN area ILIKE '%south%' OR area ILIKE '%جنوب%' THEN 'الجيزة'
    WHEN area ILIKE '%اسكندر%' OR area ILIKE '%alex%' THEN 'الاسكندرية'
    ELSE area
  END,
  line = CASE 
    WHEN line ILIKE '%pharma%' OR line ILIKE '%صيدل%' OR line ILIKE '%أول%' OR line ILIKE '%1%' THEN 'الخط الأول'
    WHEN line ILIKE '%medical%' OR line ILIKE '%طب%' OR line ILIKE '%ثان%' OR line ILIKE '%2%' THEN 'الخط الثاني'
    WHEN line ILIKE '%ثالث%' OR line ILIKE '%3%' THEN 'الخط الثالث'
    ELSE line
  END;

-- Update users to match the same standard
UPDATE public.users
SET 
  area = CASE 
    WHEN area ILIKE '%اسكندر%' OR area ILIKE '%alex%' THEN 'الاسكندرية'
    WHEN area ILIKE '%قاهر%' OR area ILIKE '%cairo%' OR area ILIKE '%north%' THEN 'القاهرة'
    WHEN area ILIKE '%جيز%' OR area ILIKE '%giza%' OR area ILIKE '%south%' THEN 'الجيزة'
    ELSE area
  END,
  line = CASE 
    WHEN line ILIKE '%أول%' OR line ILIKE '%1%' OR line ILIKE '%line%1%' THEN 'الخط الأول'
    WHEN line ILIKE '%ثان%' OR line ILIKE '%2%' OR line ILIKE '%line%2%' THEN 'الخط الثاني'
    WHEN line ILIKE '%ثالث%' OR line ILIKE '%3%' OR line ILIKE '%line%3%' THEN 'الخط الثالث'
    ELSE line
  END
WHERE username IN ('ahmed', 'mo');

-- Step 3: Drop and recreate RLS policies with FIXED logic
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'clinics' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clinics', pol.policyname);
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Use PERMISSIVE policies with OR conditions
-- This allows EITHER admin OR matching area/line

-- SELECT Policy - Admins see ALL, users see their area/line
CREATE POLICY "clinics_select_all"
ON public.clinics
FOR SELECT
TO public
USING (
  -- Admin sees everything
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.is_active = true
  )
  OR
  -- Users see their area/line matches
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.is_active = true
    AND users.area = clinics.area
    AND users.line = clinics.line
  )
);

-- INSERT Policy - Same logic
CREATE POLICY "clinics_insert_all"
ON public.clinics
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.is_active = true
    AND users.area = clinics.area
    AND users.line = clinics.line
  )
);

-- UPDATE Policy - Same logic
CREATE POLICY "clinics_update_all"
ON public.clinics
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.is_active = true
    AND users.area = clinics.area
    AND users.line = clinics.line
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.is_active = true
    AND users.area = clinics.area
    AND users.line = clinics.line
  )
);

-- DELETE Policy - Admin only
CREATE POLICY "clinics_delete_admin_only"
ON public.clinics
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.is_active = true
  )
);

-- Step 4: Verify the fix
SELECT 
  '✅ AFTER NORMALIZATION' as info,
  'Data should now match' as status;

-- Show normalized users
SELECT 
  'Normalized Users' as category,
  username,
  role,
  area,
  line,
  is_active
FROM public.users
WHERE username IN ('ahmed', 'mo') OR role = 'admin'
ORDER BY role DESC, username;

-- Show normalized clinics
SELECT 
  'Normalized Clinics' as category,
  name,
  area,
  line,
  registered_by
FROM public.clinics
ORDER BY area, line, name;

-- Show matching
SELECT 
  'Matching Check' as category,
  u.username as user_name,
  u.area as user_area,
  u.line as user_line,
  c.name as clinic_name,
  c.area as clinic_area,
  c.line as clinic_line,
  CASE 
    WHEN u.area = c.area AND u.line = c.line THEN '✅ MATCH'
    ELSE '❌ NO MATCH'
  END as match_status
FROM public.users u
CROSS JOIN public.clinics c
WHERE u.username IN ('ahmed', 'mo')
ORDER BY u.username, c.name;

-- Show RLS policies count
SELECT 
  'RLS Policies' as category,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ Correct (4 policies)'
    ELSE '❌ Wrong count'
  END as status
FROM pg_policies 
WHERE tablename = 'clinics';

-- Final summary
SELECT 
  '📊 SUMMARY' as info,
  (SELECT COUNT(*) FROM public.clinics) as total_clinics,
  (SELECT COUNT(*) FROM public.users WHERE role = 'admin' AND is_active = true) as active_admins,
  (SELECT COUNT(*) FROM public.users WHERE username IN ('ahmed', 'mo') AND is_active = true) as test_users,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'clinics') as rls_policies;

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════';
  RAISE NOTICE '✅ FIX APPLIED SUCCESSFULLY!';
  RAISE NOTICE '═══════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 What was fixed:';
  RAISE NOTICE '  1. Normalized ALL area/line names';
  RAISE NOTICE '  2. Fixed RLS policies with OR logic';
  RAISE NOTICE '  3. Ensured data consistency';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '  1. Clear browser cache (Ctrl+Shift+Delete)';
  RAISE NOTICE '  2. Logout and login again';
  RAISE NOTICE '  3. Test with admin - should see ALL clinics';
  RAISE NOTICE '  4. Test with ahmed - should see matched clinics';
  RAISE NOTICE '  5. Test with mo - should see matched clinics';
  RAISE NOTICE '';
END $$;
