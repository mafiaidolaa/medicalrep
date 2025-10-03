-- ===============================================
-- Sync system_settings from ACTUAL data
-- ===============================================
-- This ensures settings reflect what's actually used in the system

-- Step 1: Extract actual areas and lines from users and clinics
WITH actual_areas AS (
  SELECT DISTINCT area
  FROM (
    SELECT area FROM public.users WHERE area IS NOT NULL AND area != ''
    UNION
    SELECT area FROM public.clinics WHERE area IS NOT NULL AND area != ''
  ) t
  ORDER BY area
),
actual_lines AS (
  SELECT DISTINCT line
  FROM (
    SELECT line FROM public.users WHERE line IS NOT NULL AND line != ''
    UNION
    SELECT line FROM public.clinics WHERE line IS NOT NULL AND line != ''
  ) t
  ORDER BY line
)
SELECT 
  '📊 Actual Data in System' as info,
  (SELECT jsonb_agg(area ORDER BY area) FROM actual_areas) as actual_areas,
  (SELECT jsonb_agg(line ORDER BY line) FROM actual_lines) as actual_lines;

-- Step 2: Update system_settings with ACTUAL data
DO $$ 
DECLARE
  actual_areas_json JSONB;
  actual_lines_json JSONB;
BEGIN
  -- Get actual areas
  SELECT jsonb_agg(DISTINCT area ORDER BY area)
  INTO actual_areas_json
  FROM (
    SELECT area FROM public.users WHERE area IS NOT NULL AND area != ''
    UNION
    SELECT area FROM public.clinics WHERE area IS NOT NULL AND area != ''
  ) t;
  
  -- Get actual lines
  SELECT jsonb_agg(DISTINCT line ORDER BY line)
  INTO actual_lines_json
  FROM (
    SELECT line FROM public.users WHERE line IS NOT NULL AND line != ''
    UNION
    SELECT line FROM public.clinics WHERE line IS NOT NULL AND line != ''
  ) t;
  
  -- Update or insert app_areas
  IF EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = 'app_areas') THEN
    UPDATE public.system_settings
    SET 
      setting_value = actual_areas_json,
      updated_at = NOW()
    WHERE setting_key = 'app_areas';
    
    RAISE NOTICE '✅ Updated app_areas with actual data: %', actual_areas_json;
  ELSE
    INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_public)
    VALUES ('app_areas', actual_areas_json, 'array', 'قائمة المناطق الجغرافية المتاحة في النظام', true);
    
    RAISE NOTICE '✅ Inserted app_areas: %', actual_areas_json;
  END IF;
  
  -- Update or insert app_lines
  IF EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = 'app_lines') THEN
    UPDATE public.system_settings
    SET 
      setting_value = actual_lines_json,
      updated_at = NOW()
    WHERE setting_key = 'app_lines';
    
    RAISE NOTICE '✅ Updated app_lines with actual data: %', actual_lines_json;
  ELSE
    INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_public)
    VALUES ('app_lines', actual_lines_json, 'array', 'قائمة الخطوط التجارية المتاحة في النظام', true);
    
    RAISE NOTICE '✅ Inserted app_lines: %', actual_lines_json;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '✅ SETTINGS SYNCED FROM ACTUAL DATA!';
  RAISE NOTICE '═══════════════════════════════════════════════';
END $$;

-- Step 3: Show updated settings
SELECT 
  '✅ Updated Settings' as info,
  setting_key,
  setting_value,
  updated_at
FROM public.system_settings
WHERE setting_key IN ('app_areas', 'app_lines')
ORDER BY setting_key;

-- Step 4: Verify consistency
SELECT 
  '🔍 Consistency Check' as info,
  'Users' as source,
  area,
  line,
  CASE 
    WHEN area = ANY(ARRAY(SELECT jsonb_array_elements_text((SELECT setting_value FROM system_settings WHERE setting_key = 'app_areas')))) 
    THEN '✅ Area in settings'
    ELSE '❌ Area NOT in settings'
  END as area_status,
  CASE 
    WHEN line = ANY(ARRAY(SELECT jsonb_array_elements_text((SELECT setting_value FROM system_settings WHERE setting_key = 'app_lines')))) 
    THEN '✅ Line in settings'
    ELSE '❌ Line NOT in settings'
  END as line_status
FROM public.users
WHERE area IS NOT NULL AND line IS NOT NULL
UNION ALL
SELECT 
  '🔍 Consistency Check' as info,
  'Clinics' as source,
  area,
  line,
  CASE 
    WHEN area = ANY(ARRAY(SELECT jsonb_array_elements_text((SELECT setting_value FROM system_settings WHERE setting_key = 'app_areas')))) 
    THEN '✅ Area in settings'
    ELSE '❌ Area NOT in settings'
  END as area_status,
  CASE 
    WHEN line = ANY(ARRAY(SELECT jsonb_array_elements_text((SELECT setting_value FROM system_settings WHERE setting_key = 'app_lines')))) 
    THEN '✅ Line in settings'
    ELSE '❌ Line NOT in settings'
  END as line_status
FROM public.clinics
WHERE area IS NOT NULL AND line IS NOT NULL
ORDER BY source, area, line;
