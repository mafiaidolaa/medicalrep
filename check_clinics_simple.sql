-- فحص جدول العيادات - نسخة محدثة
-- 1. فحص بنية الجدول
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'clinics' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- فاصل
SELECT '--- عدد العيادات ---' as separator;

-- 2. عدد العيادات الموجودة
SELECT COUNT(*) as total_clinics FROM clinics;

-- فاصل
SELECT '--- أول 5 عيادات ---' as separator;

-- 3. عرض أول 5 عيادات (بدون deleted_at)
SELECT id, name, phone, area, created_at
FROM clinics 
ORDER BY created_at DESC
LIMIT 5;