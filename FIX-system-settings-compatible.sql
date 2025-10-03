-- ===============================================
-- Fix system_settings - Compatible Version
-- ===============================================
-- This works with existing system_settings table

-- Step 1: Check existing structure
SELECT 
  '📊 Current system_settings structure' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'system_settings'
ORDER BY ordinal_position;

-- Step 2: Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add setting_type if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'system_settings' 
    AND column_name = 'setting_type'
  ) THEN
    ALTER TABLE public.system_settings 
    ADD COLUMN setting_type TEXT DEFAULT 'string';
    RAISE NOTICE '✅ Added setting_type column';
  ELSE
    RAISE NOTICE 'ℹ️  setting_type column already exists';
  END IF;

  -- Add is_public if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'system_settings' 
    AND column_name = 'is_public'
  ) THEN
    ALTER TABLE public.system_settings 
    ADD COLUMN is_public BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_public column';
  ELSE
    RAISE NOTICE 'ℹ️  is_public column already exists';
  END IF;

  -- Add description if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'system_settings' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE public.system_settings 
    ADD COLUMN description TEXT;
    RAISE NOTICE '✅ Added description column';
  ELSE
    RAISE NOTICE 'ℹ️  description column already exists';
  END IF;
END $$;

-- Step 3: Upsert areas and lines settings
-- Delete existing if any
DELETE FROM public.system_settings 
WHERE setting_key IN ('app_areas', 'app_lines');

-- Insert new values
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_public)
VALUES 
  ('app_areas', '["القاهرة", "الجيزة", "الاسكندرية"]'::jsonb, 'array', 'قائمة المناطق الجغرافية المتاحة في النظام', true),
  ('app_lines', '["الخط الأول", "الخط الثاني", "الخط الثالث"]'::jsonb, 'array', 'قائمة الخطوط التجارية المتاحة في النظام', true);

-- Step 4: Ensure RLS is enabled
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if any
DROP POLICY IF EXISTS "system_settings_select_public" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_select_admin" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_insert_admin" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_update_admin" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_delete_admin" ON public.system_settings;

-- Step 6: Create RLS policies
-- Everyone can read public settings
CREATE POLICY "system_settings_select_public"
ON public.system_settings
FOR SELECT
TO public
USING (is_public = true);

-- Only admins can read all settings
CREATE POLICY "system_settings_select_admin"
ON public.system_settings
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.is_active = true
  )
);

-- Only admins can insert settings
CREATE POLICY "system_settings_insert_admin"
ON public.system_settings
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.is_active = true
  )
);

-- Only admins can update settings
CREATE POLICY "system_settings_update_admin"
ON public.system_settings
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.is_active = true
  )
);

-- Only admins can delete settings
CREATE POLICY "system_settings_delete_admin"
ON public.system_settings
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

-- Step 7: Grant permissions
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

-- Step 8: Verify setup
SELECT 
  '✅ SETTINGS CONFIGURED' as info,
  'Areas and Lines are now in database' as status;

-- Show current settings
SELECT 
  'Current Settings' as category,
  setting_key,
  setting_value,
  is_public,
  description
FROM public.system_settings
WHERE setting_key IN ('app_areas', 'app_lines')
ORDER BY setting_key;

-- Summary
SELECT 
  '📊 SUMMARY' as info,
  (SELECT COUNT(*) FROM public.system_settings WHERE setting_key IN ('app_areas', 'app_lines')) as settings_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'system_settings') as rls_policies_count;

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '✅ SYSTEM SETTINGS CONFIGURED SUCCESSFULLY!';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 What was done:';
  RAISE NOTICE '  1. Added missing columns to system_settings';
  RAISE NOTICE '  2. Inserted areas: القاهرة, الجيزة, الاسكندرية';
  RAISE NOTICE '  3. Inserted lines: الخط الأول, الثاني, الثالث';
  RAISE NOTICE '  4. Created RLS policies';
  RAISE NOTICE '  5. Granted necessary permissions';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '  1. Restart your dev server (npm run dev)';
  RAISE NOTICE '  2. Clear browser cache';
  RAISE NOTICE '  3. Login and check Console for "Loaded from database"';
  RAISE NOTICE '  4. Admin should see ALL 7 clinics';
  RAISE NOTICE '';
END $$;
