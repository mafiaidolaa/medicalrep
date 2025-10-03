-- ===============================================
-- Check Current Settings in Database
-- ===============================================

-- 1. Check what's currently in system_settings table
SELECT 
  '📊 Current system_settings' as info,
  setting_key,
  setting_value,
  is_public,
  created_at,
  updated_at
FROM public.system_settings
ORDER BY setting_key;

-- 2. Check what areas/lines are actually used in users table
SELECT 
  '👥 Areas/Lines used by USERS' as info,
  DISTINCT area,
  line,
  COUNT(*) as user_count
FROM public.users
WHERE area IS NOT NULL AND line IS NOT NULL
GROUP BY area, line
ORDER BY area, line;

-- 3. Check what areas/lines are actually used in clinics table
SELECT 
  '🏥 Areas/Lines used by CLINICS' as info,
  DISTINCT area,
  line,
  COUNT(*) as clinic_count
FROM public.clinics
WHERE area IS NOT NULL AND line IS NOT NULL
GROUP BY area, line
ORDER BY area, line;

-- 4. Find all unique areas
SELECT 
  '📍 All Unique Areas' as info,
  jsonb_agg(DISTINCT area ORDER BY area) as all_areas
FROM (
  SELECT area FROM public.users WHERE area IS NOT NULL
  UNION
  SELECT area FROM public.clinics WHERE area IS NOT NULL
) t;

-- 5. Find all unique lines
SELECT 
  '📈 All Unique Lines' as info,
  jsonb_agg(DISTINCT line ORDER BY line) as all_lines
FROM (
  SELECT line FROM public.users WHERE line IS NOT NULL
  UNION
  SELECT line FROM public.clinics WHERE line IS NOT NULL
) t;
