-- التحقق من إنشاء جداول نظام النفقات بنجاح

-- 1. التحقق من وجود الجداول
SELECT 'جداول النظام:' as info;
SELECT table_name, 
       CASE 
         WHEN table_name IN ('expense_categories', 'expense_requests', 'expense_approvals', 'expense_system_settings')
         THEN '✅ موجود'
         ELSE '❌ غير موجود'
       END as status
FROM information_schema.tables 
WHERE table_name IN ('expense_categories', 'expense_requests', 'expense_approvals', 'expense_system_settings')
ORDER BY table_name;

-- 2. التحقق من أعمدة expense_categories
SELECT 'أعمدة جدول expense_categories:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'expense_categories'
ORDER BY ordinal_position;

-- 3. التحقق من فئات النفقات المدرجة
SELECT 'فئات النفقات المتاحة:' as info;
SELECT name_ar as "الاسم بالعربية", 
       name_en as "الاسم بالإنجليزية", 
       icon as "الأيقونة", 
       color as "اللون",
       is_active as "نشط"
FROM expense_categories 
ORDER BY name_ar;

-- 4. التحقق من الإعدادات
SELECT 'إعدادات النظام:' as info;
SELECT setting_key as "المفتاح", 
       setting_value as "القيمة", 
       description as "الوصف"
FROM expense_system_settings
ORDER BY setting_key;

-- 5. عدد السجلات في كل جدول
SELECT 'إحصائيات الجداول:' as info;
SELECT 
    'expense_categories' as table_name,
    COUNT(*) as record_count
FROM expense_categories
UNION ALL
SELECT 
    'expense_requests' as table_name,
    COUNT(*) as record_count
FROM expense_requests
UNION ALL
SELECT 
    'expense_approvals' as table_name,
    COUNT(*) as record_count
FROM expense_approvals
UNION ALL
SELECT 
    'expense_system_settings' as table_name,
    COUNT(*) as record_count
FROM expense_system_settings;

-- 6. التحقق من الفهارس
SELECT 'الفهارس المنشأة:' as info;
SELECT indexname as "اسم الفهرس", tablename as "الجدول"
FROM pg_indexes 
WHERE tablename LIKE 'expense_%'
ORDER BY tablename, indexname;