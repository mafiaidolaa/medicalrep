-- فحص جدول activity_log
-- 1. فحص بنية الجدول
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'activity_log' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- فاصل
SELECT '--- عدد السجلات ---' as separator;

-- 2. عدد السجلات في activity_log
SELECT COUNT(*) as total_logs FROM activity_log;

-- فاصل
SELECT '--- آخر 3 سجلات ---' as separator;

-- 3. عرض آخر 3 سجلات
SELECT *
FROM activity_log 
ORDER BY created_at DESC
LIMIT 3;