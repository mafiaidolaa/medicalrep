-- ================================================
-- تشخيص سريع للوضع الحالي
-- QUICK DIAGNOSIS
-- ================================================

-- 1. عدد العيادات الإجمالي
SELECT '📊 إجمالي العيادات:' as info, COUNT(*) as count FROM clinics;

-- 2. العيادات التجريبية
SELECT '🧪 العيادات التجريبية:' as info, COUNT(*) as count 
FROM clinics 
WHERE name IN (
    'metro general hospital',
    'Dental Excellence center',
    'city heart clinc',
    'neighborhood family practice',
    'quickcare urgent center',
    'wellness pediatric clinic'
);

-- 3. عيادة EPEG
SELECT '✅ عيادة EPEG:' as info, COUNT(*) as count FROM clinics WHERE name = 'EPEG';

-- 4. عيادة motest
SELECT '🔍 عيادة motest:' as info, COUNT(*) as count FROM clinics WHERE name = 'motest';

-- 5. mo و ahmed - المنطقة والخط
SELECT '👥 mo و ahmed:' as info;
SELECT username, area, line FROM users WHERE username IN ('mo', 'ahmed');

-- 6. عدد السياسات الحالية
SELECT '🔒 عدد سياسات RLS:' as info, COUNT(*) as count 
FROM pg_policies 
WHERE tablename = 'clinics';

-- 7. أسماء السياسات
SELECT '📋 أسماء السياسات:' as info;
SELECT policyname FROM pg_policies WHERE tablename = 'clinics' ORDER BY policyname;

-- 8. آخر 5 عيادات مسجلة
SELECT '🕐 آخر 5 عيادات مسجلة:' as info;
SELECT name, area, line, TO_CHAR(registered_at, 'YYYY-MM-DD HH24:MI') as registered
FROM clinics
ORDER BY registered_at DESC
LIMIT 5;

-- 9. هل get_user_role موجودة؟
SELECT '🔧 الدوال Helper:' as info;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_role') 
        THEN '✅ get_user_role موجودة'
        ELSE '❌ get_user_role غير موجودة'
    END as result;

-- 10. اختبار الدوال (إذا كنت مسجل دخول)
SELECT '🧪 اختبار الدوال:' as info;
SELECT 
    auth.email() as my_email,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_role') 
        THEN (SELECT get_user_role())
        ELSE 'الدالة غير موجودة'
    END as my_role;
