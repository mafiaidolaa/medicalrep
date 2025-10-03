-- ================================================
-- Migration: Add is_public field to system_settings
-- Purpose: Allow non-admin users to read public settings (like areas/lines)
-- Created: 2025-01-01
-- ================================================

-- Step 1: Add is_public column if it doesn't exist
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Step 2: Update existing areas/lines to be public
UPDATE public.system_settings
SET is_public = true
WHERE setting_key IN ('app_areas', 'app_lines');

-- Step 3: Create RLS policy for public read access
DROP POLICY IF EXISTS "Public can read public settings" ON public.system_settings;

CREATE POLICY "Public can read public settings" 
ON public.system_settings
FOR SELECT
TO public
USING (is_public = true);

-- Step 4: Seed default areas and lines if they don't exist
INSERT INTO public.system_settings (category, setting_key, setting_value, description, is_public, is_enabled)
VALUES 
  (
    'general', 
    'app_areas', 
    '["القاهرة", "الجيزة", "الاسكندرية", "الدقهلية", "الشرقية", "المنوفية"]'::jsonb,
    'المناطق المتاحة في النظام',
    true,
    true
  ),
  (
    'general', 
    'app_lines', 
    '["الخط الأول", "الخط الثاني", "الخط الثالث", "الخط الرابع"]'::jsonb,
    'الخطوط المتاحة في النظام',
    true,
    true
  )
ON CONFLICT (category, setting_key) 
DO UPDATE SET 
  is_public = EXCLUDED.is_public,
  is_enabled = EXCLUDED.is_enabled,
  description = EXCLUDED.description;

-- Step 5: Create index for better performance on public settings
CREATE INDEX IF NOT EXISTS idx_system_settings_is_public 
ON public.system_settings(is_public) 
WHERE is_public = true;

-- Step 6: Create helper function to get public settings
CREATE OR REPLACE FUNCTION get_public_settings()
RETURNS TABLE (
  setting_key TEXT,
  setting_value JSONB,
  category TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    setting_key,
    setting_value,
    category
  FROM public.system_settings
  WHERE is_public = true 
    AND is_enabled = true
  ORDER BY category, setting_key;
$$;

-- Step 7: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_public_settings() TO authenticated;

-- Step 8: Add comments for documentation
COMMENT ON COLUMN public.system_settings.is_public IS 'إذا كان true، يمكن لجميع المستخدمين قراءة هذا الإعداد';
COMMENT ON FUNCTION get_public_settings IS 'دالة للحصول على جميع الإعدادات العامة المتاحة لجميع المستخدمين';

-- Step 9: Verify the migration
DO $$ 
DECLARE
  public_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO public_count
  FROM public.system_settings
  WHERE is_public = true;
  
  RAISE NOTICE '✅ Migration completed successfully';
  RAISE NOTICE '📊 Number of public settings: %', public_count;
  
  -- Check if areas and lines are public
  IF EXISTS (
    SELECT 1 FROM public.system_settings
    WHERE setting_key IN ('app_areas', 'app_lines')
      AND is_public = true
  ) THEN
    RAISE NOTICE '✅ Areas and Lines are now public';
  ELSE
    RAISE WARNING '⚠️  Areas and Lines are NOT public yet';
  END IF;
END $$;
