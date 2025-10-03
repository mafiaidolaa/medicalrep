-- ================================================
-- اختبار الدوال المساعدة
-- TEST HELPER FUNCTIONS
-- ================================================

-- اختبار 1: البريد الإلكتروني الحالي
SELECT 
    '📧 اختبار البريد الإلكتروني' as test,
    get_user_email() as my_email,
    CASE 
        WHEN get_user_email() IS NOT NULL AND get_user_email() != '' 
        THEN '✅ يعمل'
        ELSE '❌ لا يعمل'
    END as status;

-- اختبار 2: الدور الحالي
SELECT 
    '👤 اختبار الدور' as test,
    get_user_role() as my_role,
    CASE 
        WHEN get_user_role() IS NOT NULL AND get_user_role() != '' 
        THEN '✅ يعمل'
        ELSE '❌ لا يعمل'
    END as status;

-- اختبار 3: المنطقة الحالية
SELECT 
    '🗺️ اختبار المنطقة' as test,
    get_user_area() as my_area,
    CASE 
        WHEN get_user_area() IS NOT NULL 
        THEN '✅ يعمل'
        ELSE '❌ لا يعمل'
    END as status;

-- اختبار 4: الخط الحالي
SELECT 
    '📍 اختبار الخط' as test,
    get_user_line() as my_line,
    CASE 
        WHEN get_user_line() IS NOT NULL 
        THEN '✅ يعمل'
        ELSE '❌ لا يعمل'
    END as status;

-- اختبار 5: ملخص كامل
SELECT 
    '📊 ملخص المستخدم الحالي' as title,
    get_user_email() as email,
    get_user_role() as role,
    get_user_area() as area,
    get_user_line() as line;

-- اختبار 6: السياسات المطبقة
SELECT 
    '🔒 السياسات المطبقة على جدول clinics' as title,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'clinics'
ORDER BY cmd, policyname;

-- اختبار 7: تفاصيل المستخدمين mo و ahmed
SELECT 
    '👥 تفاصيل mo و ahmed' as title,
    username,
    email,
    role,
    area,
    line,
    is_active
FROM users
WHERE username IN ('mo', 'ahmed')
ORDER BY username;

-- رسالة ختامية
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📝 ملاحظات:';
    RAISE NOTICE '   - إذا ظهرت القيم بشكل صحيح، فالدوال تعمل ✅';
    RAISE NOTICE '   - إذا ظهرت NULL أو فارغة، جرّب:';
    RAISE NOTICE '     1. تسجيل خروج وإعادة دخول';
    RAISE NOTICE '     2. تحديث الصفحة';
    RAISE NOTICE '     3. مسح cache المتصفح';
    RAISE NOTICE '';
END $$;
