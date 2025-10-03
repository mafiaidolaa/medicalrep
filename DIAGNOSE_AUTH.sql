-- ================================================
-- تشخيص كامل لمعرفة كيف نحصل على معلومات المستخدم
-- COMPLETE AUTH DIAGNOSIS
-- ================================================

-- اختبار 1: auth.uid()
SELECT 
    '🔑 اختبار auth.uid()' as test,
    auth.uid() as user_id,
    CASE 
        WHEN auth.uid() IS NOT NULL 
        THEN '✅ يعمل'
        ELSE '❌ لا يعمل'
    END as status;

-- اختبار 2: auth.jwt()
SELECT 
    '🎫 اختبار auth.jwt()' as test,
    auth.jwt() as jwt_full,
    auth.jwt() ->> 'email' as email_from_jwt,
    auth.jwt() ->> 'sub' as sub_from_jwt;

-- اختبار 3: current_setting
SELECT 
    '⚙️ اختبار current_setting' as test,
    current_setting('request.jwt.claims', true) as jwt_claims,
    current_setting('request.jwt.claims', true)::json ->> 'email' as email_from_setting;

-- اختبار 4: البحث في جدول users باستخدام auth.uid()
SELECT 
    '👤 البحث في users باستخدام auth.uid()' as test,
    u.username,
    u.email,
    u.role,
    u.area,
    u.line
FROM users u
WHERE u.id = auth.uid();

-- اختبار 5: عرض جميع المستخدمين
SELECT 
    '📋 جميع المستخدمين' as info,
    id,
    username,
    email,
    role,
    area,
    line
FROM users
ORDER BY username;

-- اختبار 6: عرض جميع العيادات (بدون RLS)
SET session_replication_role = replica;

SELECT 
    '🏥 جميع العيادات (RAW)' as info,
    id,
    name,
    area,
    line,
    registered_at
FROM clinics
ORDER BY registered_at DESC
LIMIT 10;

SET session_replication_role = DEFAULT;

-- رسالة ختامية
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📝 من فضلك شارك نتائج هذه الاستعلامات';
    RAISE NOTICE '    خصوصاً نتيجة اختبار 1 و 2';
    RAISE NOTICE '';
END $$;
