-- فحص جدول العيادات والبيانات الموجودة
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
SELECT '--- العيادات المحذوفة ---' as separator;

-- 3. فحص العيادات المحذوفة (إذا كان هناك حقل deleted_at)
SELECT COUNT(*) as deleted_clinics 
FROM clinics 
WHERE deleted_at IS NOT NULL;

-- فاصل
SELECT '--- أول 5 عيادات ---' as separator;

-- 4. عرض أول 5 عيادات
SELECT id, name, phone, area, created_at, deleted_at
FROM clinics 
ORDER BY created_at DESC
LIMIT 5;